import OpenAI from "openai";
import { fold } from "../normalize";
import { aiOutputSchema, type AiOutput, type Status } from "../schema";

export type AiRequest = { model: string; system: string; user: string; jsonFormat: boolean };
export type AiResponse = { content: string; inputTokens: number; outputTokens: number };

export interface AiClient {
  complete(request: AiRequest): Promise<AiResponse>;
}

export type AiDecision = {
  status: Status;
  confidence: number | null;
  evidence: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  output: AiOutput | null;
  error: string | null;
};

export type AiInput = {
  text: string;
  placeName: string;
  url: string;
  hint?: string;
  model: string;
  minConfidence: number;
  now: Date;
};

// Neon AI Gateway when its env is injected, else any OpenAI-compatible API.
export function createAiClient(): AiClient | null {
  const gatewayToken = process.env.NEON_AI_GATEWAY_TOKEN;
  const apiKey = gatewayToken || process.env.AI_API_KEY;
  const baseURL = gatewayToken ? `${process.env.NEON_AI_GATEWAY_BASE_URL}/v1` : process.env.AI_BASE_URL;
  if (!apiKey || !baseURL) return null;

  const openai = new OpenAI({ apiKey, baseURL });
  return {
    async complete({ model, system, user, jsonFormat }) {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 200,
        temperature: 0,
        ...(jsonFormat ? { response_format: { type: "json_object" as const } } : {}),
      });
      return {
        content: completion.choices[0]?.message.content ?? "",
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      };
    },
  };
}

const parisDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Paris",
  dateStyle: "short",
  timeStyle: "short",
});
const parisWeekday = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "long" });

function systemPrompt(input: AiInput): string {
  return `You decide whether a natural place is open to visitors right now.
Now: ${parisDateTime.format(input.now).replace(" ", "T")} (Europe/Paris), ${parisWeekday.format(input.now)}.
Place: ${input.placeName}. Source: ${input.url}.
Place-specific hint: ${input.hint ?? "none"}.
Rules:
- Answer only from the page text. Do not use outside knowledge.
- Temporary notices (closure, works, fire risk, weather, access ban) override regular opening hours.
- If opening hours are given, compare them with the current date and time.
- If the page does not let you decide, answer "unknown".
Return JSON only: {"status":"open"|"closed"|"unknown","confidence":0..1,"evidence":"<= 200 chars quoted from the page","reopens_at":"ISO date or null"}`;
}

function parseOutput(content: string): AiOutput | string {
  const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
  try {
    const parsed = aiOutputSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : `invalid ai output: ${parsed.error.issues[0].message}`;
  } catch {
    return "invalid ai output: not JSON";
  }
}

// `takeCall` is the spend guard: it is asked before every request after the
// first (the caller takes the first one) and returns false once the budget is spent.
export async function decideWithAi(input: AiInput, client: AiClient, takeCall: () => boolean): Promise<AiDecision> {
  const request = { model: input.model, system: systemPrompt(input), user: input.text };
  const decision: AiDecision = {
    status: "unknown",
    confidence: null,
    evidence: null,
    model: input.model,
    inputTokens: 0,
    outputTokens: 0,
    output: null,
    error: null,
  };
  let jsonFormat = true;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0 && !takeCall()) break;
    let response: AiResponse;
    try {
      response = await client.complete({ ...request, jsonFormat });
    } catch (err) {
      const rejectedFormat = jsonFormat && (err as { status?: number }).status === 400;
      if (!rejectedFormat || !takeCall()) throw err;
      jsonFormat = false;
      response = await client.complete({ ...request, jsonFormat });
    }
    decision.inputTokens += response.inputTokens;
    decision.outputTokens += response.outputTokens;

    const output = parseOutput(response.content);
    if (typeof output === "string") {
      decision.error = output;
      continue;
    }

    const evidence = output.evidence.trim().replace(/^["'«»“”\s]+|["'«»“”\s]+$/g, "");
    decision.output = output;
    decision.error = null;
    decision.confidence = output.confidence;
    decision.evidence = evidence.slice(0, 200) || null;
    if (output.status === "unknown" || output.confidence < input.minConfidence) return decision;
    if (!evidence || !fold(input.text).includes(fold(evidence))) {
      decision.error = "ai evidence not found in page";
      return decision;
    }
    decision.status = output.status;
    return decision;
  }
  return decision;
}
