import * as cheerio from "cheerio";
import { collapse, fold } from "../normalize";
import type { Match, Rule, Status } from "../schema";

export type RuleOutcome = { status: Status; evidence: string | null };

// A keyword is a case- and accent-insensitive substring, or a "/regex/flags" string.
function matches(folded: string, keyword: string): boolean {
  const regex = /^\/(.+)\/([a-z]*)$/.exec(keyword);
  if (regex) return new RegExp(regex[1], regex[2].includes("i") ? regex[2] : `${regex[2]}i`).test(folded);
  return folded.includes(fold(keyword));
}

export function matchKeywords(text: string, match: Match): Status {
  const folded = fold(text);
  if (match.closed.some((keyword) => matches(folded, keyword))) return "closed";
  if (match.open.some((keyword) => matches(folded, keyword))) return "open";
  return "unknown";
}

export function runSelector(rule: Extract<Rule, { type: "selector" }>, html: string): RuleOutcome {
  const element = cheerio.load(html)(rule.selector).first();
  if (element.length === 0) {
    if (rule.required) throw new Error(`selector not found: ${rule.selector}`);
    return { status: "unknown", evidence: null };
  }
  const text = collapse(rule.attribute ? (element.attr(rule.attribute) ?? "") : element.text());
  return { status: matchKeywords(text, rule.match), evidence: text.slice(0, 200) };
}
