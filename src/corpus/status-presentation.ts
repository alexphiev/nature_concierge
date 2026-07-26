import type { ResolvedStatus } from "./queries";

export type StatusPresentation = {
  colorTone: "vert" | "orange" | "rouge";
  verdict: string;
};

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
