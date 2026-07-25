type StatusValue = "vert" | "jaune" | "orange" | "rouge" | "extreme" | null;

const STATUS_META: Record<
  NonNullable<StatusValue>,
  { label: string; colorClass: string }
> = {
  vert: { label: "Accès autorisé", colorClass: "text-statut-vert" },
  jaune: { label: "Restrictions légères", colorClass: "text-statut-orange" },
  orange: { label: "Restrictions", colorClass: "text-statut-orange" },
  rouge: { label: "Accès restreint", colorClass: "text-statut-rouge" },
  extreme: { label: "Accès interdit", colorClass: "text-statut-rouge" },
};

export function StatusChip({ value }: { value: StatusValue }) {
  if (!value) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-statut-inconnu">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full border border-dashed border-statut-inconnu" />
        Non vérifié
      </span>
    );
  }

  const meta = STATUS_META[value];

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${meta.colorClass}`}>
      <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
