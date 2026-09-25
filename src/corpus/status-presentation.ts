import type { ResolvedStatus } from "./queries";

export type StatusPresentation = {
  colorTone: "vert" | "orange" | "rouge";
  verdict: string;
};

// Signal zones are stored upper-case ("CAP CANAILLE"); display them in title case.
export function formatZoneLabel(label: string): string {
  return label.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
}

export function presentStatus(
  status: NonNullable<ResolvedStatus>,
): StatusPresentation {
  if (!status.isOpen) {
    return { colorTone: "rouge", verdict: "Fermé" };
  }
  if (status.restricted) {
    return { colorTone: "orange", verdict: "Ouvert — accès restreint" };
  }
  if (status.displayValue === "orange" || status.displayValue === "jaune") {
    return { colorTone: "orange", verdict: "Ouvert" };
  }
  return { colorTone: "vert", verdict: "Ouvert" };
}
