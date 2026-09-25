import { connection } from "next/server";
import { resolvePlaceStatus } from "../corpus/queries";
import { formatZoneLabel } from "../corpus/status-presentation";
import { StatusBlock, StatusPill } from "./StatusBlock";
import { CardStatusPill } from "./PlaceCard";

type PillVariant = "header" | "bare" | "card";

export async function LiveStatusPill({
  placeId,
  variant = "header",
}: {
  placeId: string;
  variant?: PillVariant;
}) {
  await connection();
  const status = await resolvePlaceStatus(placeId);

  if (variant === "bare") return <StatusPill status={status} bare />;
  if (variant === "card") return <CardStatusPill status={status} />;

  return (
    <>
      <StatusPill status={status} />
      {status && (
        <span className="flex items-center gap-3">
          <span aria-hidden>·</span>
          {`Zone feu ${formatZoneLabel(status.zoneLabel)}`}
        </span>
      )}
    </>
  );
}

export async function LiveStatusBlock({
  placeId,
  officialInfoUrl,
}: {
  placeId: string;
  officialInfoUrl: string | null;
}) {
  await connection();
  const status = await resolvePlaceStatus(placeId);
  return <StatusBlock status={status} officialInfoUrl={officialInfoUrl} />;
}

export function StatusPillFallback({ variant = "header" }: { variant?: PillVariant }) {
  if (variant === "bare") {
    return (
      <span className="font-mono text-[0.6875rem] tracking-wide text-encre/45 uppercase">
        Statut du jour…
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-dashed border-sable/70 px-2.5 py-1 font-mono text-[0.7rem] tracking-wide text-encre/45 uppercase ${
        variant === "card" ? "bg-calcaire/85 backdrop-blur-sm" : ""
      }`}
    >
      Statut du jour…
    </span>
  );
}

export function StatusBlockFallback() {
  return (
    <section aria-label="Statut du jour" className="flex flex-col gap-1.5">
      <p className="font-mono text-[0.6875rem] tracking-widest text-encre/65 uppercase">Statut du jour</p>
      <p className="font-display text-[1.75rem] leading-tight font-semibold text-encre/25">…</p>
      <p className="text-sm text-encre/55">Relevé en cours de chargement…</p>
    </section>
  );
}
