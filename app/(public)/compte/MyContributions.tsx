import Link from "next/link";
import { FOCUS_RING } from "@/src/components/landing/shared";
import {
  CONTRIBUTION_TYPE_LABELS,
  CORRECTION_KINDS,
} from "@/src/contributions/schema";
import type { getUserContributions } from "@/src/contributions/service";
import { placePhotoUrl } from "@/src/storage/place-photos";

type Item = Awaited<ReturnType<typeof getUserContributions>>[number];

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

const EXCERPT_LENGTH = 140;
const MAX_THUMBS = 6;

function excerpt(text: string | null): string {
  const plain = (text ?? "").trim().replace(/\s+/g, " ");
  return plain.length > EXCERPT_LENGTH
    ? `${plain.slice(0, EXCERPT_LENGTH).trimEnd()}…`
    : plain;
}

function statusOf(item: Item): {
  label: string;
  icon: string;
  className: string;
} {
  if (item.status === "PENDING") {
    return {
      label: "En relecture",
      icon: "◔",
      className: "bg-calcaire-deep text-encre",
    };
  }
  if (item.status === "REJECTED") {
    return {
      label: "Non retenue",
      icon: "✕",
      className: "bg-encre/10 text-encre",
    };
  }
  const label =
    item.type === "PLACE"
      ? "Retenue"
      : item.type === "CORRECTION"
        ? "Prise en compte"
        : "Publiée";
  return { label, icon: "✓", className: "bg-mediterranee text-white" };
}

function ContributionItem({ item }: { item: Item }) {
  const status = statusOf(item);
  const placeName = item.place?.name ?? item.placeName;
  const kind = CORRECTION_KINDS.find(
    (k) => k.value === item.correctionKind,
  )?.label;
  const text = excerpt(item.text);
  const body =
    item.type === "CORRECTION" && kind
      ? `${kind}${text ? ` : ${text}` : ""}`
      : text;

  return (
    <li className="space-y-2 rounded-xl border border-sable/50 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {CONTRIBUTION_TYPE_LABELS[item.type]}
          {placeName && (
            <>
              {" · "}
              {item.place?.status === "ACTIVE" ? (
                <Link
                  href={`/lieux/${item.place.slug}`}
                  className={`underline underline-offset-2 ${FOCUS_RING}`}
                >
                  {placeName}
                </Link>
              ) : (
                placeName
              )}
            </>
          )}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}
        >
          <span aria-hidden="true">{status.icon}</span>
          {status.label}
        </span>
      </div>
      {body && <p>{body}</p>}
      {item.photoKeys.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {item.photoKeys.slice(0, MAX_THUMBS).map((key) => (
            <li key={key}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={placePhotoUrl(key)}
                alt="Photo envoyée"
                width={64}
                height={64}
                loading="lazy"
                className="size-16 rounded-md object-cover"
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-encre/70">
        Envoyée le {DATE_FORMAT.format(item.createdAt)}
      </p>
      {item.status === "REJECTED" && item.reviewNote && (
        <p className="text-sm">Message d’Alexandre : {item.reviewNote}</p>
      )}
    </li>
  );
}

export function MyContributions({ items }: { items: Item[] }) {
  return (
    <section aria-labelledby="contributions-title" className="space-y-4">
      <h2
        id="contributions-title"
        className="font-display text-2xl font-semibold"
      >
        {items.length > 0
          ? `Mes contributions (${items.length})`
          : "Mes contributions"}
      </h2>
      <p>
        Tout est relu avant publication ; vous recevez un email à chaque
        décision.
      </p>
      {items.length === 0 ? (
        <>
          <p>
            Vous n’avez pas encore contribué. Une astuce, une photo, un lieu à
            proposer ?
          </p>
          <Link
            href="/contribuer"
            className={`inline-block rounded-full bg-[#0E4B5A] px-6 py-3 text-base font-semibold text-white ${FOCUS_RING}`}
          >
            Contribuer
          </Link>
        </>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <ContributionItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
