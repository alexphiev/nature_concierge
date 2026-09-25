import { Dateline } from "./Dateline";
import type { ResolvedStatus } from "../corpus/queries";
import { formatZoneLabel, presentStatus } from "../corpus/status-presentation";

const ACTIVE_FIRE_CAVEAT =
  "En cas de fumée ou de consignes des secours sur place, suivez-les même si la carte indique autre chose.";

const TONE_TEXT = {
  vert: "text-statut-vert",
  orange: "text-statut-orange",
  rouge: "text-statut-rouge",
} as const;

const TONE_PILL = {
  vert: "bg-statut-vert/12 text-statut-vert",
  orange: "bg-statut-orange/12 text-statut-orange",
  rouge: "bg-statut-rouge/12 text-statut-rouge",
} as const;

export function StatusPill({ status, bare = false }: { status: ResolvedStatus; bare?: boolean }) {
  const label = status ? presentStatus(status).verdict : "Non vérifié";
  const tone = status ? presentStatus(status).colorTone : null;

  if (bare) {
    return (
      <span
        className={`font-mono text-[0.6875rem] tracking-wide uppercase ${tone ? TONE_TEXT[tone] : "text-statut-inconnu"}`}
      >
        ● {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.7rem] tracking-wide uppercase ${
        tone ? TONE_PILL[tone] : "border border-dashed border-statut-inconnu/60 text-statut-inconnu"
      }`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function StatusBlock({
  status,
  officialInfoUrl,
}: {
  status: ResolvedStatus;
  officialInfoUrl: string | null;
}) {
  const heading = (
    <p className="font-mono text-[0.6875rem] tracking-widest text-encre/65 uppercase">Statut du jour</p>
  );

  if (!status) {
    return (
      <section aria-label="Statut du jour" className="flex flex-col gap-1.5">
        {heading}
        <p className="font-display text-[1.75rem] leading-tight font-semibold text-statut-inconnu">
          Non vérifié
        </p>
        <p className="text-sm leading-relaxed text-encre/75">
          Pas de relevé officiel aujourd&apos;hui
          {officialInfoUrl ? (
            <>
              {" "}
              — consultez la{" "}
              <a href={officialInfoUrl} className="text-mediterranee underline underline-offset-2">
                carte officielle ↗
              </a>
            </>
          ) : (
            "."
          )}
        </p>
      </section>
    );
  }

  const { colorTone, verdict } = presentStatus(status);
  const showCaveat = ["orange", "rouge", "extreme"].includes(status.displayValue);

  return (
    <section aria-label="Statut du jour" className="flex flex-col gap-1.5">
      {heading}
      <p
        className={`flex items-center gap-2.5 font-display text-[1.75rem] leading-tight font-semibold ${TONE_TEXT[colorTone]}`}
      >
        <span aria-hidden className="size-2.5 rounded-full bg-current" />
        {verdict}
      </p>
      <p className="text-sm text-encre/80">
        Massif {formatZoneLabel(status.zoneLabel)} · niveau {status.displayValue}
      </p>
      {status.detail && <p className="text-sm text-encre">{status.detail}</p>}
      {showCaveat && <p className="text-sm text-encre/70 italic">{ACTIVE_FIRE_CAVEAT}</p>}
      <p className="mt-1 font-mono text-[0.6875rem] leading-relaxed text-encre/60">
        <Dateline checkedAt={status.confirmedAt} /> · {status.provider}
      </p>
    </section>
  );
}
