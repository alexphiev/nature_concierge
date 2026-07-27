import type { TodayStatusCounts } from "@/src/corpus/queries";

function formatHeure(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function LiveProofLine({ counts }: { counts: TodayStatusCounts }) {
  if (!counts) return null;

  return (
    <p className="mt-6 font-mono text-[0.8rem] text-sable">
      Aujourd&apos;hui : {counts.closed} massif
      {counts.closed > 1 ? "s" : ""} fermé{counts.closed > 1 ? "s" : ""} sur
      les {counts.total} qu&apos;on suit · vérifié à{" "}
      {formatHeure(counts.latestConfirmedAt)}
    </p>
  );
}
