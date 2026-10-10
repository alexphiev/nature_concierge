import type { Rule } from "../schema";
import type { RuleOutcome } from "./selector";

// `path` is a dot path such as "data.status" or "items.0.open".
export function runJson(rule: Extract<Rule, { type: "json" }>, body: string): RuleOutcome {
  let value: unknown = JSON.parse(body);
  for (const key of rule.path.split(".")) {
    if (value === null || typeof value !== "object") return { status: "unknown", evidence: null };
    value = (value as Record<string, unknown>)[key];
  }
  if (value === undefined) return { status: "unknown", evidence: null };
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return {
    status: Object.hasOwn(rule.map, text) ? rule.map[text] : "unknown",
    evidence: `${rule.path} = ${text}`.slice(0, 200),
  };
}
