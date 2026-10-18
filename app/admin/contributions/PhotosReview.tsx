import { SubmitButton } from "@/src/components/SubmitButton";
import { placePhotoUrl } from "@/src/storage/place-photos";
import type { ContributionPhoto } from "../../../prisma/generated/client";
import { publishPhotos } from "./actions";
import {
  NoteField,
  RejectForm,
  ReviewHeader,
  cardClass,
  primaryButtonClass,
  type ReviewContribution,
} from "./ReviewParts";

export function PhotosReview({
  c,
  error,
}: {
  c: ReviewContribution & { photos: ContributionPhoto[] };
  error?: string;
}) {
  return (
    <li id={`c-${c.id}`} className={cardClass}>
      <ReviewHeader c={c} error={error} />
      {c.text && <p className="text-sm whitespace-pre-wrap">{c.text}</p>}
      <form action={publishPhotos.bind(null, c.id)} className="flex flex-col gap-3">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {c.photos.map((p, i) => (
            <li key={p.id}>
              <label className="flex flex-col gap-2 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={placePhotoUrl(p.key)}
                  alt={`Photo ${i + 1}`}
                  width={320}
                  height={240}
                  loading="lazy"
                  className="aspect-4/3 w-full rounded-[10px] object-cover"
                />
                <span className="flex items-center gap-2">
                  <input type="checkbox" name="keep" value={p.id} defaultChecked />
                  Garder
                </span>
              </label>
            </li>
          ))}
        </ul>
        <NoteField />
        <SubmitButton className={primaryButtonClass}>Publier la sélection</SubmitButton>
      </form>
      <RejectForm id={c.id} />
    </li>
  );
}
