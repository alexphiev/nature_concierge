"use client";

import { useActionState, useState } from "react";
import type { SessionUser } from "@/src/auth/session";
import { FOCUS_RING } from "@/src/components/landing/shared";
import { SubmitButton } from "@/src/components/SubmitButton";
import { CORRECTION_KINDS } from "@/src/contributions/schema";
import type { FormState } from "@/src/contributions/submit";
import { submitCorrection } from "@/app/(public)/lieux/[slug]/corriger/actions";
import { IdentityFields } from "./IdentityFields";

const MAX_LENGTH = 1000;

export function CorrectionForm({
  slug,
  claimId,
  claimText,
  user,
}: {
  slug: string;
  claimId: string | null;
  claimText?: string;
  user: SessionUser | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    submitCorrection.bind(null, slug, claimId),
    {},
  );

  return (
    <form action={action} className="space-y-6">
      {claimText && (
        <div>
          <p className="font-semibold">Le conseil actuel</p>
          <blockquote className="mt-1 border-l-4 border-sable pl-4 text-encre/80">
            {claimText}
          </blockquote>
        </div>
      )}
      <CorrectionFields key={JSON.stringify(state.values ?? {})} state={state} user={user} />
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

function CorrectionFields({ state, user }: { state: FormState; user: SessionUser | null }) {
  const values = state.values;
  const [length, setLength] = useState(values?.text.length ?? 0);

  return (
    <div className="space-y-6">
      <fieldset aria-describedby={state.fieldErrors?.correctionKind ? "correction-kind-error" : undefined}>
        <legend className="font-semibold">Qu&apos;est-ce qui ne va pas ?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CORRECTION_KINDS.map((kind) => (
            <label key={kind.value} className="cursor-pointer">
              <input
                type="radio"
                name="correctionKind"
                value={kind.value}
                required
                defaultChecked={kind.value === values?.correctionKind}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-encre/30 bg-white px-4 py-2 text-base peer-checked:border-mediterranee peer-checked:bg-mediterranee peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mediterranee">
                {kind.label}
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.correctionKind && (
          <p id="correction-kind-error" role="alert" className="mt-1 text-sm text-pin">
            {state.fieldErrors.correctionKind}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="correction-text" className="font-semibold">
          Qu&apos;est-ce qui a changé ?
        </label>
        <textarea
          id="correction-text"
          name="text"
          required
          minLength={10}
          maxLength={MAX_LENGTH}
          rows={6}
          defaultValue={values?.text}
          onChange={(e) => setLength(e.target.value.length)}
          aria-describedby={state.fieldErrors?.text ? "correction-text-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.text)}
          className={`mt-1 block w-full rounded-lg border border-encre/30 bg-white px-3 py-2 text-base ${FOCUS_RING}`}
        />
        <div className="mt-1 flex justify-between gap-4">
          {state.fieldErrors?.text ? (
            <p id="correction-text-error" role="alert" className="text-sm text-pin">
              {state.fieldErrors.text}
            </p>
          ) : (
            <span />
          )}
          <p className="font-medium tabular-nums text-xs text-encre/65" aria-live="off">
            {length} / {MAX_LENGTH}
          </p>
        </div>
      </div>

      <IdentityFields user={user} fieldErrors={state.fieldErrors} values={values} />
    </div>
  );
}
