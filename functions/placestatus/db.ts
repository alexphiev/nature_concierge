import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { CheckResult } from "./executor";
import type { Status } from "./schema";

export type SourceRow = {
  id: string;
  url: string;
  config: unknown;
  place_name: string;
  last_status: Status;
  last_confidence: number | null;
  last_evidence: string | null;
  last_content_hash: string | null;
  last_etag: string | null;
  last_modified: string | null;
  // Last real LLM answer for the current content hash; drives the unchanged skip.
  last_ai_at: Date | null;
};

let client: NeonQueryFunction<false, false> | undefined;

// Created on first use so that importing the app never needs DATABASE_URL.
function sql() {
  return (client ??= neon(process.env.DATABASE_URL!));
}

export async function claimDueSources(limit: number): Promise<SourceRow[]> {
  const rows = await sql()`
    UPDATE place_status_source s
    SET lease_until = now() + interval '10 minutes'
    FROM "Place" p
    WHERE s.place_id = p.id
      AND s.id IN (
        SELECT id FROM place_status_source
        WHERE enabled
          AND next_check_at <= now()
          AND (lease_until IS NULL OR lease_until < now())
        ORDER BY next_check_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
    RETURNING s.*, p.name AS place_name, (
      SELECT max(c.checked_at) FROM place_status_check c
      WHERE c.source_id = s.id AND c.method = 'ai' AND c.content_hash = s.last_content_hash
    ) AS last_ai_at`;
  return rows as SourceRow[];
}

export async function getSource(id: string): Promise<SourceRow | null> {
  const rows = await sql()`
    SELECT s.*, p.name AS place_name, (
      SELECT max(c.checked_at) FROM place_status_check c
      WHERE c.source_id = s.id AND c.method = 'ai' AND c.content_hash = s.last_content_hash
    ) AS last_ai_at
    FROM place_status_source s
    JOIN "Place" p ON p.id = s.place_id
    WHERE s.id = ${id}`;
  return (rows[0] as SourceRow | undefined) ?? null;
}

export async function countAiCallsToday(): Promise<number> {
  const rows = await sql()`
    SELECT count(*)::int AS count FROM place_status_check
    WHERE method = 'ai' AND checked_at >= date_trunc('day', now())`;
  return rows[0].count;
}

export async function deleteOldChecks(): Promise<void> {
  await sql()`DELETE FROM place_status_check WHERE checked_at < now() - interval '90 days'`;
}

export async function writeResult(sourceId: string, invocationId: string, r: CheckResult): Promise<void> {
  const db = sql();
  const insert = db`
    INSERT INTO place_status_check (
      source_id, invocation_id, status, method, rule_index, confidence, evidence, http_status,
      content_hash, duration_ms, ai_model, ai_input_tokens, ai_output_tokens, error
    ) VALUES (
      ${sourceId}, ${invocationId}, ${r.status}, ${r.method}, ${r.ruleIndex}, ${r.confidence}, ${r.evidence},
      ${r.httpStatus}, ${r.contentHash}, ${r.durationMs}, ${r.ai?.model ?? null}, ${r.ai?.inputTokens ?? null},
      ${r.ai?.outputTokens ?? null}, ${r.error}
    )
    ON CONFLICT (source_id, invocation_id) DO NOTHING`;

  // On failure last_checked_at is left alone, so it stays the time of the last
  // successful check: that is what the 48 h stale rule compares against.
  const update = r.failed
    ? db`
      UPDATE place_status_source SET
        last_changed_at = CASE
          WHEN last_checked_at > now() - interval '48 hours' OR last_status = 'unknown' THEN last_changed_at
          ELSE now() END,
        last_status = CASE WHEN last_checked_at > now() - interval '48 hours' THEN last_status ELSE 'unknown' END,
        last_error = ${r.error},
        consecutive_failures = consecutive_failures + 1,
        next_check_at = now() + least(
          check_interval_minutes * power(2, least(consecutive_failures + 1, 10)) * interval '1 minute',
          interval '24 hours'
        ),
        lease_until = NULL,
        updated_at = now()
      WHERE id = ${sourceId}`
    : db`
      UPDATE place_status_source SET
        last_changed_at = CASE WHEN last_status IS DISTINCT FROM ${r.status} THEN now() ELSE last_changed_at END,
        last_status = ${r.status},
        last_method = ${r.method},
        last_confidence = ${r.confidence},
        last_evidence = ${r.evidence},
        last_checked_at = now(),
        last_content_hash = ${r.contentHash},
        last_etag = ${r.etag},
        last_modified = ${r.lastModified},
        last_error = ${r.error},
        consecutive_failures = 0,
        next_check_at = CASE
          WHEN ${r.retryNextRun}::boolean THEN next_check_at
          ELSE now() + check_interval_minutes * interval '1 minute' END,
        lease_until = NULL,
        updated_at = now()
      WHERE id = ${sourceId}`;

  await db.transaction([insert, update]);
}
