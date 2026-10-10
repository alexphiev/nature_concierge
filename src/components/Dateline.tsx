const UNITS = [
  { unit: "day", ms: 86_400_000 },
  { unit: "hour", ms: 3_600_000 },
  { unit: "minute", ms: 60_000 },
] as const;

function formatDateline(date: Date): string {
  const elapsed = Date.now() - date.getTime();
  const match = UNITS.find(({ ms }) => elapsed >= ms);
  if (!match) return "Vérifié à l'instant";

  const ago = new Intl.RelativeTimeFormat("fr").format(-Math.floor(elapsed / match.ms), match.unit);
  return `Vérifié ${ago}`;
}

export function Dateline({ checkedAt }: { checkedAt: Date }) {
  return <span>{formatDateline(checkedAt)}</span>;
}
