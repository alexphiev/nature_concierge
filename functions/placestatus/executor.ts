import pLimit from "p-limit";
import { claimDueSources, countAiCallsToday, deleteOldChecks, writeResult, type SourceRow } from "./db";
import { createFetcher, HttpError, RobotsDisallowError, type Fetcher, type Page } from "./fetchPage";
import { AI_TEXT_LIMIT, sha256, visibleText } from "./normalize";
import { sourceConfigSchema, type AiOutput, type Rule, type SourceConfig, type Status } from "./schema";
import { createAiClient, decideWithAi, type AiClient } from "./strategies/ai";
import { runJson } from "./strategies/json";
import { runRegex } from "./strategies/regex";
import { runSelector, type RuleOutcome } from "./strategies/selector";

const DAY_MS = 24 * 60 * 60 * 1000;

export type Method = Rule["type"] | "ai" | "unchanged" | "none";

export type RuleTrace = { index: number; type: Rule["type"]; status: Status; evidence: string | null; error: string | null };

export type CheckResult = {
  status: Status;
  method: Method;
  ruleIndex: number | null;
  confidence: number | null;
  evidence: string | null;
  httpStatus: number | null;
  contentHash: string | null;
  etag: string | null;
  lastModified: string | null;
  durationMs: number;
  ai: { model: string; inputTokens: number; outputTokens: number; output: AiOutput | null } | null;
  error: string | null;
  // Fetch, rule or LLM error with no decision: keeps the previous status and backs off.
  failed: boolean;
  // Stopped by the AI budget: the source stays due for the next run.
  retryNextRun: boolean;
  rules: RuleTrace[];
  textExcerpt: string | null;
};

export type CheckDeps = {
  fetch: Fetcher;
  ai: AiClient | null;
  takeAiCall: () => boolean;
  now: Date;
};

export type RunSummary = {
  invocationId: string;
  claimed: number;
  open: number;
  closed: number;
  unknown: number;
  aiCalls: number;
  errors: number;
  durationMs: number;
};

function message(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 500);
}

function intEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function runRule(rule: Rule, source: SourceRow, config: SourceConfig, page: Page, deps: CheckDeps): Promise<RuleOutcome> {
  if (rule.type === "selector") return runSelector(rule, page.body);
  if (rule.type === "regex") return runRegex(rule, visibleText(page.body, rule.scope ?? config.scope));
  const body = rule.url && rule.url !== source.url ? (await deps.fetch(rule.url, config.fetch)).body : page.body;
  return runJson(rule, body);
}

// Decides the status of one source. Reads the network and the LLM through
// `deps`, never the database: the caller writes the returned result.
export async function checkSource(source: SourceRow, deps: CheckDeps): Promise<CheckResult> {
  const started = Date.now();
  const result: CheckResult = {
    status: "unknown",
    method: "none",
    ruleIndex: null,
    confidence: null,
    evidence: null,
    httpStatus: null,
    contentHash: null,
    etag: null,
    lastModified: null,
    durationMs: 0,
    ai: null,
    error: null,
    failed: false,
    retryNextRun: false,
    rules: [],
    textExcerpt: null,
  };
  const done = (patch: Partial<CheckResult>): CheckResult => ({ ...result, ...patch, durationMs: Date.now() - started });
  const unchanged = (): CheckResult =>
    done({
      status: source.last_status,
      method: "unchanged",
      confidence: source.last_confidence,
      evidence: source.last_evidence,
    });

  const parsed = sourceConfigSchema.safeParse(source.config);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ");
    return done({ error: `invalid config: ${issues}`.slice(0, 500) });
  }
  const config = parsed.data;
  const rules = config.ai.mode === "always" ? [] : config.rules;
  const aiFresh =
    source.last_content_hash !== null &&
    source.last_ai_at !== null &&
    deps.now.getTime() - new Date(source.last_ai_at).getTime() < DAY_MS;

  // A 304 gives no body, so ask for one only when the LLM answer would be reused anyway.
  const conditional = rules.length === 0 && config.ai.mode !== "never" && aiFresh;
  let page: Page;
  try {
    page = await deps.fetch(source.url, {
      ...config.fetch,
      etag: conditional ? source.last_etag : null,
      lastModified: conditional ? source.last_modified : null,
    });
  } catch (err) {
    if (err instanceof RobotsDisallowError) return done({ error: err.message });
    return done({ failed: true, httpStatus: err instanceof HttpError ? err.status : null, error: message(err) });
  }
  result.httpStatus = page.status;
  if (page.notModified) {
    result.contentHash = source.last_content_hash;
    result.etag = source.last_etag;
    result.lastModified = source.last_modified;
    return unchanged();
  }

  const text = visibleText(page.body, config.scope).slice(0, AI_TEXT_LIMIT);
  result.contentHash = sha256(text);
  result.etag = page.etag;
  result.lastModified = page.lastModified;
  result.textExcerpt = text.slice(0, 500);

  for (const [index, rule] of rules.entries()) {
    try {
      const outcome = await runRule(rule, source, config, page, deps);
      result.rules.push({ index, type: rule.type, ...outcome, error: null });
      if (outcome.status !== "unknown") {
        return done({ ...outcome, method: rule.type, ruleIndex: index, confidence: 1 });
      }
    } catch (err) {
      const error = message(err);
      result.rules.push({ index, type: rule.type, status: "unknown", evidence: null, error });
      result.error ??= `rule ${index} (${rule.type}): ${error}`;
    }
  }

  if (config.ai.mode === "never") return done({ failed: result.error !== null });
  if (aiFresh && result.contentHash === source.last_content_hash) return unchanged();
  if (!deps.ai) return done({ contentHash: null, error: result.error ?? "ai not configured" });
  if (!deps.takeAiCall()) return done({ contentHash: null, error: "ai budget", retryNextRun: true });

  const model = config.ai.model ?? process.env.AI_MODEL ?? "";
  try {
    const decision = await decideWithAi(
      {
        text,
        placeName: source.place_name,
        url: source.url,
        hint: config.ai.hint,
        model,
        minConfidence: config.ai.minConfidence,
        now: deps.now,
      },
      deps.ai,
      deps.takeAiCall,
    );
    return done({
      status: decision.status,
      method: "ai",
      confidence: decision.confidence,
      evidence: decision.evidence,
      ai: decision,
      // No usable answer: drop the hash so the next check asks again.
      contentHash: decision.output ? result.contentHash : null,
      error: result.error ?? decision.error,
    });
  } catch (err) {
    return done({
      method: "ai",
      ai: { model, inputTokens: 0, outputTokens: 0, output: null },
      contentHash: null,
      failed: true,
      error: `ai: ${message(err)}`,
    });
  }
}

export async function runDue(invocationId: string): Promise<RunSummary> {
  const started = Date.now();
  const sources = await claimDueSources(intEnv("MAX_SOURCES_PER_RUN", 50));
  const summary: RunSummary = {
    invocationId,
    claimed: sources.length,
    open: 0,
    closed: 0,
    unknown: 0,
    aiCalls: 0,
    errors: 0,
    durationMs: 0,
  };

  if (sources.length > 0) {
    let aiLeft = Math.min(
      intEnv("AI_MAX_CALLS_PER_RUN", 20),
      intEnv("AI_MAX_CALLS_PER_DAY", 100) - (await countAiCallsToday()),
    );
    const deps: CheckDeps = {
      fetch: createFetcher(),
      ai: createAiClient(),
      takeAiCall: () => {
        if (aiLeft <= 0) return false;
        aiLeft--;
        summary.aiCalls++;
        return true;
      },
      now: new Date(),
    };
    const limit = pLimit(intEnv("CONCURRENCY", 4));

    await Promise.all(
      sources.map((source) =>
        limit(async () => {
          try {
            const result = await checkSource(source, deps);
            // Written as soon as the source finishes, so an evicted run loses nothing already done.
            await writeResult(source.id, invocationId, result);
            summary[result.status]++;
            if (result.error) summary.errors++;
            logSource(invocationId, source, result);
          } catch (err) {
            summary.errors++;
            console.error(`src ${source.id} ${source.place_name} invocation=${invocationId} write failed: ${message(err)}`);
          }
        }),
      ),
    );
  }

  await deleteOldChecks();
  summary.durationMs = Date.now() - started;
  return summary;
}

export function logSource(invocationId: string, source: SourceRow, result: CheckResult): void {
  console.log(
    `src ${source.id} ${source.place_name} invocation=${invocationId} status=${result.status} method=${result.method} ` +
      `rule=${result.ruleIndex ?? "-"} ai=${result.ai?.model ?? "-"} ms=${result.durationMs} err=${result.error ?? "-"}`,
  );
}
