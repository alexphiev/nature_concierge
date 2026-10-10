import { Dateline } from "./Dateline";
import type { ResolvedStatus } from "../corpus/queries";
import { presentStatus, sourceName } from "../corpus/status-presentation";

const TONE_TEXT = {
  vert: "text-statut-vert",
  rouge: "text-statut-rouge",
} as const;

const TONE_PILL = {
  vert: "bg-statut-vert/12 text-statut-vert",
  rouge: "bg-statut-rouge/12 text-statut-rouge",
} as const;

export function StatusPill({ status, bare = false }: { status: ResolvedStatus; bare?: boolean }) {
  const { colorTone: tone, verdict: label } = presentStatus(status);

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
          Statut inconnu
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

  return (
    <section aria-label="Statut du jour" className="flex flex-col gap-1.5">
      {heading}
      <p
        className={`flex items-center gap-2.5 font-display text-[1.75rem] leading-tight font-semibold ${colorTone ? TONE_TEXT[colorTone] : "text-statut-inconnu"}`}
      >
        <span aria-hidden className="size-2.5 rounded-full bg-current" />
        {verdict}
      </p>
      {status.cause && <p className="text-sm text-encre">{status.cause}</p>}
      <p className="mt-1 font-mono text-[0.6875rem] leading-relaxed text-encre/60">
        {status.checkedAt && (
          <>
            <Dateline checkedAt={status.checkedAt} /> ·{" "}
          </>
        )}
        <a href={status.sourceUrl} className="underline underline-offset-2">
          {sourceName(status)} ↗
        </a>
      </p>
    </section>
  );
}
