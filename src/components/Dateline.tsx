function formatDateline(date: Date): string {
  const datePart = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `Vérifié le ${datePart} à ${timePart}`;
}

export function Dateline({ checkedAt }: { checkedAt: Date }) {
  return <span>{formatDateline(checkedAt)}</span>;
}
