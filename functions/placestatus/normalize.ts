import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

export const AI_TEXT_LIMIT = 6_000;

export function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Lowercased and accent-folded, so "fermé" matches "FERME".
export function fold(text: string): string {
  return collapse(
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  );
}

// Visible text of `scope` (default: body without page chrome). Elements are
// padded with spaces first because cheerio's .text() glues adjacent blocks together.
export function visibleText(html: string, scope?: string): string {
  const $ = cheerio.load(html);
  $(scope ? "script, style, noscript" : "script, style, noscript, nav, footer, header").remove();
  const root = $(scope ?? "body");
  root.find("*").before(" ").after(" ");
  return collapse(root.text());
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
