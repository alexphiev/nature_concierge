import { SubmitButton } from "@/src/components/SubmitButton";
import { TIP_THEMES } from "@/src/contributions/schema";
import { publishTip } from "./actions";
import {
  NoteField,
  RejectForm,
  ReviewHeader,
  cardClass,
  inputClass,
  primaryButtonClass,
  type ReviewContribution,
} from "./ReviewParts";

export function TipReview({ c }: { c: ReviewContribution }) {
  return (
    <li id={`c-${c.id}`} className={cardClass}>
      <ReviewHeader c={c} />
      <form action={publishTip.bind(null, c.id)} className="flex flex-col gap-3">
        <textarea
          name="text"
          defaultValue={c.text ?? ""}
          required
          minLength={10}
          maxLength={500}
          rows={4}
          aria-label="Texte du conseil"
          className={inputClass}
        />
        <select
          name="claimType"
          defaultValue={c.claimType ?? "TIP"}
          aria-label="Thème"
          className={inputClass}
        >
          {TIP_THEMES.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>
        <NoteField />
        <SubmitButton className={primaryButtonClass}>Publier</SubmitButton>
      </form>
      <RejectForm id={c.id} />
    </li>
  );
}
