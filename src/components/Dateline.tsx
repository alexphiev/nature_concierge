function formatDateline(date: Date): string {
  const datePart = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `Vérifié le ${datePart} à ${timePart}`;
}

export function Dateline({ checkedAt }: { checkedAt: Date }) {
  return (
    <span className="font-mono text-[0.875rem] text-encre/70">
      {formatDateline(checkedAt)}
    </span>
  );
}
