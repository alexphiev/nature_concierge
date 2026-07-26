import { Dateline } from "./Dateline";
import type { ResolvedStatus } from "../corpus/queries";

const ACTIVE_FIRE_CAVEAT =
  "En cas de fumée ou de consignes des secours sur place, suivez-les même si la carte indique autre chose.";

export function StatusBlock({
  status,
  officialInfoUrl,
  googleMapsUri,
}: {
  status: ResolvedStatus;
  officialInfoUrl: string | null;
  googleMapsUri?: string | null;
}) {
  if (!status) {
    return (
      <section
        aria-label="Statut du jour"
        className="rounded-xl border border-dashed border-statut-inconnu bg-calcaire-deep p-5"
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
    ? "text-statut-rouge border-l-statut-rouge"
    : status.restricted || status.displayValue === "orange" || status.displayValue === "jaune"
      ? "text-statut-orange border-l-statut-orange"
      : "text-statut-vert border-l-statut-vert";

  const showCaveat = ["orange", "rouge", "extreme"].includes(status.displayValue);

  const verdict = !status.isOpen
    ? "Fermé"
    : status.restricted
      ? "Ouvert — accès restreint"
      : "Ouvert";

  return (
    <section
      aria-label="Statut du jour"
      className={`grid grid-cols-1 items-center gap-5 rounded-xl border border-sable/45 border-l-[3px] bg-calcaire-deep p-5 sm:grid-cols-[auto_1fr_auto] sm:gap-6 ${colorClass}`}
    >
      <div className="border-b border-sable/30 pb-3 text-center font-mono sm:border-r sm:border-b-0 sm:pr-6 sm:pb-0">
        <span className="block text-[0.7rem] font-semibold tracking-wide uppercase">
          {verdict}
        </span>
        <span className="mt-0.5 block text-2xl font-semibold uppercase">
          {status.displayValue}
        </span>
      </div>

      <div>
        {status.detail && <p className="text-[0.95rem] text-encre">{status.detail}</p>}
        {showCaveat && (
          <p className="mt-2 text-sm text-encre/70 italic">{ACTIVE_FIRE_CAVEAT}</p>
        )}
      </div>

      <div className="font-mono text-xs whitespace-nowrap text-encre/60">
        <Dateline checkedAt={status.confirmedAt} />
        <br />
        Source officielle : {status.provider}
        {officialInfoUrl && (
          <>
            {" "}
            <a href={officialInfoUrl} className="text-mediterranee underline">
              ↗
            </a>
          </>
        )}
        {googleMapsUri && (
          <>
            <br />
            <a href={googleMapsUri} className="text-mediterranee underline">
              Voir sur Google Maps ↗
            </a>
          </>
        )}
      </div>
    </section>
  );
}
