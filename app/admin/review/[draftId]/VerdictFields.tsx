"use client";

import { useState } from "react";

export function VerdictFields({
  prefix,
  defaultVerdict,
  verdictOptions,
  inputClass,
}: {
  prefix: string;
  defaultVerdict: string;
  verdictOptions: readonly string[];
  inputClass: string;
}) {
  const [verdict, setVerdict] = useState(defaultVerdict);
  const isAlternative = verdict === "ALTERNATIVE";

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-encre/70">Verdict</span>
        <select
          name={`${prefix}-verdict`}
          value={verdict}
          onChange={(e) => setVerdict(e.target.value)}
          className={inputClass}
        >
          {verdictOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={`text-xs ${isAlternative ? "font-medium text-amber-700" : "text-encre/70"}`}>
          Lieu alternatif (slug){isAlternative ? " — requis pour le verdict ALTERNATIVE" : ""}
        </span>
        <input
          type="text"
          name={`${prefix}-alternativePlaceSlug`}
          required={isAlternative}
          className={`${inputClass} ${isAlternative ? "border-amber-500" : ""}`}
        />
      </label>
    </>
  );
}
