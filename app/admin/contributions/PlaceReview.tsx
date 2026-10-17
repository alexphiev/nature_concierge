import { SubmitButton } from "@/src/components/SubmitButton";
import { createPlaceDraft } from "./actions";
import {
  NoteField,
  RejectForm,
  ReviewHeader,
  cardClass,
  primaryButtonClass,
  type ReviewContribution,
} from "./ReviewParts";

export function PlaceReview({ c }: { c: ReviewContribution }) {
  return (
    <li className={cardClass}>
      <ReviewHeader c={c} />
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-medium">
          {c.placeName} · {c.placeCommune}
        </p>
        {c.locationHint && <p className="text-encre/70">Comment le trouver : {c.locationHint}</p>}
        <p className="whitespace-pre-wrap">{c.text}</p>
      </div>
      <form action={createPlaceDraft.bind(null, c.id)} className="flex flex-col gap-3">
        <NoteField />
        <SubmitButton className={primaryButtonClass}>Créer le brouillon</SubmitButton>
      </form>
      <RejectForm id={c.id} />
    </li>
  );
}
