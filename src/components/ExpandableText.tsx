"use client";

import { useState } from "react";

// Roughly four lines at the page's measure; shorter text is shown in full with no toggle.
const COLLAPSE_THRESHOLD = 320;

export function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > COLLAPSE_THRESHOLD;

  return (
    <>
      <p
        className={`leading-relaxed whitespace-pre-line text-encre/85 ${isLong && !expanded ? "line-clamp-4" : ""}`}
      >
        {text}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="self-start font-semibold text-mediterranee underline underline-offset-4 hover:text-mediterranee-deep"
        >
          {expanded ? "Réduire" : "Lire la suite"}
        </button>
      )}
    </>
  );
}
