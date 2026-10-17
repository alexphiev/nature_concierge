"use client";

import { useActionState, useState } from "react";
import type { SessionUser } from "@/src/auth/session";
import { FOCUS_RING } from "@/src/components/landing/shared";
import { SubmitButton } from "@/src/components/SubmitButton";
import type { FormState } from "@/src/contributions/submit";
import { submitPlaceProposal } from "@/app/(public)/contribuer/nouveau-lieu/actions";
import { IdentityFields } from "./IdentityFields";

const MAX_LENGTH = 1000;
const INPUT = `mt-1 block w-full rounded-lg border border-encre/30 bg-white px-3 py-2 text-base ${FOCUS_RING}`;

export function PlaceProposalForm({ user }: { user: SessionUser | null }) {
  const [state, action] = useActionState<FormState, FormData>(submitPlaceProposal, {});

  return (
    <form action={action} className="space-y-6">
      <PlaceProposalFields key={JSON.stringify(state.values ?? {})} state={state} user={user} />
      {state.error && (
        <p role="alert" className="text-base text-pin">
          {state.error}
        </p>
      )}
      <SubmitButton
        className={`rounded-full bg-mediterranee px-6 py-3 text-base font-semibold text-white ${FOCUS_RING}`}
      >
        Envoyer pour relecture
      </SubmitButton>
    </form>
  );
}

function PlaceProposalFields({ state, user }: { state: FormState; user: SessionUser | null }) {
  const values = state.values;
  const errors = state.fieldErrors;
  const [length, setLength] = useState(values?.text.length ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="place-name" className="font-semibold">
          Nom du lieu
        </label>
        <input
          id="place-name"
          name="placeName"
          type="text"
          required
          minLength={2}
          maxLength={120}
          defaultValue={values?.placeName}
          aria-describedby={errors?.placeName ? "place-name-error" : undefined}
          aria-invalid={Boolean(errors?.placeName)}
          className={INPUT}
        />
        {errors?.placeName && (
          <p id="place-name-error" role="alert" className="mt-1 text-sm text-pin">
            {errors.placeName}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="place-commune" className="font-semibold">
          Commune
        </label>
        <input
          id="place-commune"
          name="placeCommune"
          type="text"
          required
          minLength={2}
          maxLength={80}
          defaultValue={values?.placeCommune}
          aria-describedby={errors?.placeCommune ? "place-commune-error" : undefined}
          aria-invalid={Boolean(errors?.placeCommune)}
          className={INPUT}
        />
        {errors?.placeCommune && (
          <p id="place-commune-error" role="alert" className="mt-1 text-sm text-pin">
            {errors.placeCommune}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="place-hint" className="font-semibold">
          Comment le trouver ?
        </label>
        <p id="place-hint-hint" className="text-sm text-encre/65">
          Un repère, un chemin, ou un lien Google Maps
        </p>
        <textarea
          id="place-hint"
          name="locationHint"
          maxLength={500}
          rows={3}
          defaultValue={values?.locationHint}
          aria-describedby={
            errors?.locationHint ? "place-hint-hint place-hint-error" : "place-hint-hint"
          }
          aria-invalid={Boolean(errors?.locationHint)}
          className={INPUT}
        />
        {errors?.locationHint && (
          <p id="place-hint-error" role="alert" className="mt-1 text-sm text-pin">
            {errors.locationHint}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="place-text" className="font-semibold">
          Pourquoi il mérite sa place dans le guide ?
        </label>
        <textarea
          id="place-text"
          name="text"
          required
          minLength={10}
          maxLength={MAX_LENGTH}
          rows={5}
          defaultValue={values?.text}
          onChange={(e) => setLength(e.target.value.length)}
          aria-describedby={errors?.text ? "place-text-error" : undefined}
          aria-invalid={Boolean(errors?.text)}
          className={INPUT}
        />
        <div className="mt-1 flex justify-between gap-4">
          {errors?.text ? (
            <p id="place-text-error" role="alert" className="text-sm text-pin">
              {errors.text}
            </p>
          ) : (
            <span />
          )}
          <p className="font-mono text-xs text-encre/65" aria-live="off">
            {length} / {MAX_LENGTH}
          </p>
        </div>
      </div>

      <IdentityFields user={user} fieldErrors={errors} values={values} />
    </div>
  );
}
