import type { ResolvedStatus } from "./queries";

export type StatusPresentation = {
  colorTone: "vert" | "rouge" | null;
  verdict: string;
};

export function presentStatus(status: ResolvedStatus): StatusPresentation {
  if (status?.status === "closed") {
    return { colorTone: "rouge", verdict: "Fermé" };
  }
  if (status?.status === "open") {
    return { colorTone: "vert", verdict: "Ouvert" };
  }
  return { colorTone: null, verdict: "Statut inconnu" };
}

export function sourceName(status: NonNullable<ResolvedStatus>): string {
  return status.sourceLabel ?? new URL(status.sourceUrl).hostname.replace(/^www\./, "");
}
