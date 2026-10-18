import Link from "next/link";
import { SubmitButton } from "@/src/components/SubmitButton";
import { CONTRIBUTION_TYPE_LABELS, NOTE_MAX_LENGTH } from "@/src/contributions/schema";
import type { Contribution, Place, User } from "../../../prisma/generated/client";
import { rejectContribution } from "./actions";

export const inputClass = "w-full min-w-0 rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";
export const cardClass = "flex flex-col gap-4 rounded-[10px] border border-sable/40 p-4";
export const primaryButtonClass =
  "self-start rounded-full bg-mediterranee px-4 py-2 text-sm text-calcaire";
export const secondaryButtonClass =
  "self-start rounded-full border border-sable/45 px-4 py-2 text-sm text-encre/70";

export type ReviewContribution = Contribution & { user: User | null; place: Place | null };

export function ReviewHeader({ c, error }: { c: ReviewContribution; error?: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      {error && (
        <p role="alert" className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3">
          {error}
        </p>
      )}
      <p className="font-mono text-xs tracking-wide text-encre/60 uppercase">
        {CONTRIBUTION_TYPE_LABELS[c.type]} · {c.createdAt.toLocaleDateString("fr-FR")}
      </p>
      {c.place && (
        <p>
          <Link
            href={`/lieux/${c.place.slug}`}
            className="font-medium underline decoration-dotted underline-offset-2"
          >
            {c.place.name}
          </Link>
        </p>
      )}
      {c.user && (
        <p className="text-encre/70">
          {c.user.name}
          {c.user.commune ? ` (${c.user.commune})` : ""} · {c.user.email}
        </p>
      )}
    </div>
  );
}

export function NoteField({
  placeholder = "Commentaire pour l’auteur (optionnel)",
  label = "Commentaire de publication",
}) {
  return (
    <textarea
      name="note"
      rows={2}
      placeholder={placeholder}
      aria-label={label}
      maxLength={NOTE_MAX_LENGTH}
      className={inputClass}
    />
  );
}

export function RejectForm({ id }: { id: string }) {
  return (
    <form
      action={rejectContribution.bind(null, id)}
      className="flex flex-col gap-3 border-t border-sable/40 pt-4"
    >
      <NoteField placeholder="Motif du refus (optionnel)" label="Motif du refus" />
      <SubmitButton className={secondaryButtonClass}>Refuser</SubmitButton>
    </form>
  );
}
