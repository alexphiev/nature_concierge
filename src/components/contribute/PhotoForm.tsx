"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import type { SessionUser } from "@/src/auth/session";
import { FOCUS_RING } from "@/src/components/landing/shared";
import type { FormState } from "@/src/contributions/submit";
import { HEIC_INPUT_TYPES, compressPhoto } from "@/src/storage/compress-photo";
import {
  CONTRIBUTION_PHOTO_MAX_BYTES,
  CONTRIBUTION_PHOTOS_MAX,
  CONTRIBUTION_PHOTOS_TOTAL_MAX_BYTES,
  PLACE_PHOTO_TYPES,
} from "@/src/storage/photo-types";
import { submitPhotos } from "@/app/(public)/lieux/[slug]/photos/actions";
import { IdentityFields } from "./IdentityFields";

type Selected = { id: string; file: File; src: string };

export function PhotoForm({ slug, user }: { slug: string; user: SessionUser | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitPhotos.bind(null, slug),
    {},
  );
  const [selected, setSelected] = useState<Selected[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [compressErrors, setCompressErrors] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Set<string>());

  const [selectionChangedFor, setSelectionChangedFor] = useState<FormState | null>(null);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const hasServerError = Boolean(state.error || state.fieldErrors);
  const busy = preparing || pending;

  function addFiles(files: FileList) {
    const room = CONTRIBUTION_PHOTOS_MAX - selected.length;
    const picked = Array.from(files);
    const added = picked.slice(0, room).map((file) => {
      const src = URL.createObjectURL(file);
      objectUrls.current.add(src);
      return { id: crypto.randomUUID(), file, src };
    });
    setSelectionError(picked.length > room ? "6 photos maximum." : null);
    setSelectionChangedFor(state);
    setCompressErrors([]);
    setSelected([...selected, ...added]);
    if (fileInput.current) fileInput.current.value = "";
  }

  function remove(id: string) {
    const item = selected.find((s) => s.id === id);
    if (item) {
      URL.revokeObjectURL(item.src);
      objectUrls.current.delete(item.src);
    }
    setSelectionError(null);
    setSelectionChangedFor(state);
    setCompressErrors([]);
    setSelected(selected.filter((s) => s.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.length === 0) {
      setSelectionError("Ajoutez entre 1 et 6 photos.");
      return;
    }
    setSelectionError(null);
    const formData = new FormData(event.currentTarget);
    setPreparing(true);
    const failures: string[] = [];
    let total = 0;
    // One at a time: decoding several large photos at once can exhaust a phone's memory.
    for (const { file } of selected) {
      try {
        const compressed = await compressPhoto(file, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1600,
          maxBytes: CONTRIBUTION_PHOTO_MAX_BYTES,
        });
        formData.append("photos", compressed, compressed.name);
        total += compressed.size;
      } catch (e) {
        failures.push(`${file.name} : ${e instanceof Error ? e.message : "image illisible"}`);
      }
    }
    setPreparing(false);
    setCompressErrors(failures);
    if (failures.length > 0) return;
    // Over the server limit the request could also exceed the host's body size limit and fail outright.
    if (total > CONTRIBUTION_PHOTOS_TOTAL_MAX_BYTES) {
      setSelectionError("Photos trop lourdes, réessayez avec moins de photos.");
      return;
    }
    startTransition(() => action(formData));
  }

  const photosError =
    selectionError ?? (selectionChangedFor === state ? undefined : state.fieldErrors?.photos);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset aria-describedby={photosError ? "photos-error" : undefined} className="space-y-3">
        <legend className="font-semibold">Vos photos (6 maximum)</legend>
        {selected.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {selected.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.file.name}
                  className="aspect-[4/3] w-full rounded-lg bg-calcaire-deep object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={busy}
                  className={`self-start text-sm text-mediterranee underline disabled:opacity-40 ${FOCUS_RING}`}
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected.length < CONTRIBUTION_PHOTOS_MAX && (
          <label className="inline-block cursor-pointer rounded-full border border-mediterranee px-5 py-2 text-base text-mediterranee has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-mediterranee">
            {selected.length > 0 ? "Ajouter d'autres photos" : "Choisir des photos"}
            <input
              ref={fileInput}
              type="file"
              accept={`${PLACE_PHOTO_TYPES.join(",")},${HEIC_INPUT_TYPES}`}
              multiple
              disabled={busy}
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              className="sr-only"
            />
          </label>
        )}
        {photosError && (
          <p id="photos-error" role="alert" className="text-sm text-pin">
            {photosError}
          </p>
        )}
        {compressErrors.map((error) => (
          <p key={error} role="alert" className="text-sm text-pin">
            {error}
          </p>
        ))}
      </fieldset>

      <div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="photosConsent"
            required
            aria-describedby={state.fieldErrors?.photosConsent ? "photos-consent-error" : undefined}
            aria-invalid={Boolean(state.fieldErrors?.photosConsent)}
            className="mt-1 size-5 shrink-0"
          />
          <span>
            J&apos;ai pris ces photos et j&apos;accepte qu&apos;elles soient publiées sur le guide
            avec mon nom.
          </span>
        </label>
        {state.fieldErrors?.photosConsent && (
          <p id="photos-consent-error" role="alert" className="mt-1 text-sm text-pin">
            {state.fieldErrors.photosConsent}
          </p>
        )}
      </div>

      <IdentityFields user={user} fieldErrors={state.fieldErrors} values={state.values} />

      {state.error && (
        <p role="alert" className="text-base text-pin">
          {state.error}
        </p>
      )}
      {hasServerError && selected.length === 0 && (
        <p role="alert" className="text-base text-pin">
          Sélectionnez à nouveau vos photos.
        </p>
      )}

      {preparing && (
        <p role="status" className="text-base text-encre/75">
          Préparation des photos…
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-mediterranee px-6 py-3 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${FOCUS_RING}`}
      >
        {busy && (
          <span
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        Envoyer pour relecture
      </button>
    </form>
  );
}
