import { Dateline } from "./Dateline";
import type { ResolvedStatus } from "../corpus/queries";

const ACTIVE_FIRE_CAVEAT =
  "En cas de fumée ou de consignes des secours sur place, suivez-les même si la carte indique autre chose.";

export function StatusBlock({
  status,
  officialInfoUrl,
}: {
  status: ResolvedStatus;
  officialInfoUrl: string | null;
}) {
  if (!status) {
    return (
      <section
        aria-label="Statut du jour"
        className="rounded-[10px] border border-dashed border-statut-inconnu bg-calcaire-deep p-4"
      >
        <p className="font-mono text-statut-inconnu">
          Données non vérifiées aujourd&apos;hui — consultez la carte
          officielle{" "}
          {officialInfoUrl && (
            <a href={officialInfoUrl} className="underline">
              ↗
            </a>
          )}
        </p>
      </section>
    );
  }

  const colorClass = !status.isOpen
    ? "border-statut-rouge text-statut-rouge"
    : status.restricted || status.displayValue === "orange" || status.displayValue === "jaune"
      ? "border-statut-orange text-statut-orange"
      : "border-statut-vert text-statut-vert";

  const showCaveat = ["orange", "rouge", "extreme"].includes(status.displayValue);

  return (
    <section
      aria-label="Statut du jour"
      className={`rounded-[10px] border-l-2 bg-calcaire-deep p-4 ${colorClass}`}
    >
      <p className="font-mono uppercase">
        <span aria-hidden>●</span> {status.displayValue}{" "}
        {status.detail ? `— ${status.detail}` : ""}
      </p>
      {showCaveat && (
        <p className="mt-2 text-sm">{ACTIVE_FIRE_CAVEAT}</p>
      )}
      <hr className="my-3 border-sable/40" />
      <p className="font-mono text-[0.875rem] text-encre/70">
        <Dateline checkedAt={status.confirmedAt} /> · Source officielle :{" "}
        {status.provider}
        {officialInfoUrl && (
          <>
            {" "}
            <a href={officialInfoUrl} className="underline">
              ↗
            </a>
          </>
        )}
      </p>
    </section>
  );
}
