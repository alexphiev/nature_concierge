import Link from "next/link";
import { SubmitButton } from "@/src/components/SubmitButton";
import { CORRECTION_KINDS } from "@/src/contributions/schema";
import type { Claim } from "../../../prisma/generated/client";
import { acknowledgeCorrection, applyCorrection, retireCorrectedClaim } from "./actions";
import {
  NoteField,
  RejectForm,
  ReviewHeader,
  cardClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  type ReviewContribution,
} from "./ReviewParts";

export function CorrectionReview({ c }: { c: ReviewContribution & { claim: Claim | null } }) {
  const kind = CORRECTION_KINDS.find((k) => k.value === c.correctionKind)?.label;
  return (
    <li className={cardClass}>
      <ReviewHeader c={c} />
      {kind && <p className="text-sm font-medium">{kind}</p>}
      <p className="text-sm whitespace-pre-wrap">{c.text}</p>

      {c.claim ? (
        <>
          <blockquote className="border-l-2 border-sable/60 pl-3 text-sm text-encre/70">
            {c.claim.claimText}
          </blockquote>
          <form action={applyCorrection.bind(null, c.id)} className="flex flex-col gap-3">
            <textarea
              name="text"
              defaultValue={c.claim.claimText}
              required
              minLength={10}
              maxLength={500}
              rows={4}
              aria-label="Nouveau texte du conseil"
              className={inputClass}
            />
            <NoteField />
            <SubmitButton className={primaryButtonClass}>Modifier le conseil</SubmitButton>
          </form>
          <form action={retireCorrectedClaim.bind(null, c.id)} className="flex flex-col gap-3">
            <NoteField />
            <SubmitButton className={secondaryButtonClass}>Retirer le conseil</SubmitButton>
          </form>
          <form action={acknowledgeCorrection.bind(null, c.id)} className="flex flex-col gap-3">
            <NoteField />
            <SubmitButton className={secondaryButtonClass}>Noter sans changement</SubmitButton>
          </form>
        </>
      ) : (
        <form action={acknowledgeCorrection.bind(null, c.id)} className="flex flex-col gap-3">
          {c.place && (
            <p className="text-sm text-encre/70">
              <Link
                href={`/admin/places/${c.place.id}`}
                className="underline decoration-dotted underline-offset-2"
              >
                À appliquer dans la fiche du lieu
              </Link>
            </p>
          )}
          <NoteField />
          <SubmitButton className={primaryButtonClass}>Noter</SubmitButton>
        </form>
      )}
      <RejectForm id={c.id} />
    </li>
  );
}
