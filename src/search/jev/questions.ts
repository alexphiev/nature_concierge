import { noul } from "@typesafe-ai/sdk";

// Every Jev instruction and criterion lives here so they can be reviewed and
// tuned (TypeSafe Playground) in one place. English on purpose: Jev is most
// accurate in English; the place data itself stays French.

export const REGION = "Coastal nature spots around La Ciotat, Provence, France";

export const PLACE_FITS = noul(
  "The place in `place` is a good match for the nature outing described in `request`.",
  {
    true: "The place's description or tips show it meets the needs, audience or activity in the request.",
    false: "Nothing in the place's data supports the request, or the data contradicts it.",
  },
);

export function tipIsUseful(index: number) {
  return noul(
    `\`place.tips[${index}]\` is useful to someone planning the outing described in \`request\`.`,
    {
      true: "The tip helps plan or enjoy this specific outing.",
      false: "The tip is unrelated to the request.",
    },
  );
}

export function ideaIsTimely(key: string) {
  return noul(
    `\`ideas.${key}\` is a timely outing idea to suggest for the moment in \`moment\`.`,
    {
      true: "The idea suits this day, time of day and season.",
      false: "The idea is out of place at this moment (e.g. swimming in winter, sunset in the morning).",
    },
  );
}
