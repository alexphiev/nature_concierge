import { Dateline } from "./Dateline";
import type { StatusLog } from "../../prisma/generated/client";

export function StatusBlock({
  statusLog,
  officialInfoUrl,
}: {
  statusLog: (StatusLog & { signalSource: { provider: string } }) | null;
  officialInfoUrl: string | null;
}) {
  if (!statusLog) {
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

  const isRed = statusLog.value === "rouge" || statusLog.value === "rouge-extreme";
  const isOrange = statusLog.value === "orange" || statusLog.value === "jaune";
  const colorClass = isRed
    ? "border-statut-rouge text-statut-rouge"
    : isOrange
      ? "border-statut-orange text-statut-orange"
      : "border-statut-vert text-statut-vert";

  return (
    <section
      aria-label="Statut du jour"
      className={`rounded-[10px] border-l-2 bg-calcaire-deep p-4 ${colorClass}`}
    >
      <p className="font-mono uppercase">
        <span aria-hidden>●</span> {statusLog.value}{" "}
        {statusLog.detail ? `— ${statusLog.detail}` : ""}
      </p>
      <hr className="my-3 border-sable/40" />
      <p className="font-mono text-[0.875rem] text-encre/70">
        <Dateline checkedAt={statusLog.checkedAt} /> · Source officielle :{" "}
        {statusLog.signalSource.provider}
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
