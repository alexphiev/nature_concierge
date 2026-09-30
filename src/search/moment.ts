const parisFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  weekday: "long",
  month: "numeric",
  hour: "numeric",
  hourCycle: "h23",
});

const WEEKDAYS_FR: Record<string, string> = {
  Monday: "lundi",
  Tuesday: "mardi",
  Wednesday: "mercredi",
  Thursday: "jeudi",
  Friday: "vendredi",
  Saturday: "samedi",
  Sunday: "dimanche",
};

type Label = { fr: string; en: string };

function slotFor(hour: number): Label {
  if (hour >= 5 && hour < 11) return { fr: "matin", en: "morning" };
  if (hour >= 11 && hour < 14) return { fr: "midi", en: "midday" };
  if (hour >= 14 && hour < 18) return { fr: "après-midi", en: "afternoon" };
  return { fr: "soir", en: "evening" };
}

function seasonFor(month: number): string {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export type Moment = { label: string; description: string };

// `description` is also the cache key for shortcut suggestions (7 × 4 × 4 buckets).
export function getMoment(now: Date): Moment {
  const parts = Object.fromEntries(parisFormatter.formatToParts(now).map((p) => [p.type, p.value]));
  const weekday = parts.weekday;
  const slot = slotFor(Number(parts.hour));
  return {
    label: `Idées pour ce ${WEEKDAYS_FR[weekday]} ${slot.fr}`,
    description: `${weekday} ${slot.en}, ${seasonFor(Number(parts.month))}`,
  };
}
