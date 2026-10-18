"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export function ContributionBanner() {
  const sent = useSearchParams().get("contribution") === "envoyee";
  const [dismissed, setDismissed] = useState(false);

  if (!sent || dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-4 mt-6 rounded-[14px] border border-mediterranee/40 bg-mediterranee/10 p-4"
    >
      <p>Merci ! Votre contribution est en relecture. Vous recevrez un email dès qu&apos;elle est en ligne.</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Fermer"
        className="shrink-0 text-lg leading-none text-encre/70 hover:text-encre"
      >
        ×
      </button>
    </div>
  );
}
