import type { Rule } from "../schema";
import type { RuleOutcome } from "./selector";

const CONTEXT = 60;

export function runRegex(rule: Extract<Rule, { type: "regex" }>, text: string): RuleOutcome {
  const found = new RegExp(rule.pattern, rule.flags.replace(/[gy]/g, "")).exec(text);
  if (!found) return { status: "unknown", evidence: null };
  const start = Math.max(0, found.index - CONTEXT);
  return { status: rule.status, evidence: text.slice(start, start + 200) };
}
