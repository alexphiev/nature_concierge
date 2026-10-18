"use client";

import { useActionState, useState } from "react";
import type { SessionUser } from "@/src/auth/session";
import { FOCUS_RING } from "@/src/components/landing/shared";
import { SubmitButton } from "@/src/components/SubmitButton";
import { TIP_THEMES } from "@/src/contributions/schema";
import type { FormState } from "@/src/contributions/submit";
import { submitTip } from "@/app/(public)/lieux/[slug]/astuce/actions";
import { IdentityFields } from "./IdentityFields";

const MAX_LENGTH = 500;

export function TipForm({ slug, user }: { slug: string; user: SessionUser | null }) {
  const [state, action] = useActionState<FormState, FormData>(submitTip.bind(null, slug), {});

  return (
    <form action={action} className="space-y-6">
      <TipFields key={JSON.stringify(state.values ?? {})} state={state} user={user} />
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

function TipFields({ state, user }: { state: FormState; user: SessionUser | null }) {
  const values = state.values;
  const [length, setLength] = useState(values?.text.length ?? 0);
  const selectedTheme = values?.claimType || "TIP";

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="font-semibold">Thème</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIP_THEMES.map((theme) => (
            <label key={theme.value} className="cursor-pointer">
              <input
                type="radio"
                name="claimType"
                value={theme.value}
                defaultChecked={theme.value === selectedTheme}
                className="peer sr-only"
              />
              <span
                className={`inline-block rounded-full border border-encre/30 bg-white px-4 py-2 text-base peer-checked:border-mediterranee peer-checked:bg-mediterranee peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mediterranee`}
              >
                {theme.label}
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.claimType && (
          <p role="alert" className="mt-2 text-sm text-pin">
            {state.fieldErrors.claimType}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="tip-text" className="font-semibold">
          Votre astuce
        </label>
        <p id="tip-text-hint" className="text-sm text-encre/65">
          Une info concrète : l&apos;heure à viser, où se garer, ce qu&apos;on aurait aimé savoir.
        </p>
        <textarea
          id="tip-text"
          name="text"
          required
          minLength={10}
          maxLength={MAX_LENGTH}
          rows={5}
          defaultValue={values?.text}
          onChange={(e) => setLength(e.target.value.length)}
          aria-describedby={state.fieldErrors?.text ? "tip-text-hint tip-text-error" : "tip-text-hint"}
          aria-invalid={Boolean(state.fieldErrors?.text)}
          className={`mt-1 block w-full rounded-lg border border-encre/30 bg-white px-3 py-2 text-base ${FOCUS_RING}`}
        />
        <div className="mt-1 flex justify-between gap-4">
          {state.fieldErrors?.text ? (
            <p id="tip-text-error" role="alert" className="text-sm text-pin">
              {state.fieldErrors.text}
            </p>
          ) : (
            <span />
          )}
          <p className="font-mono text-xs text-encre/65" aria-live="off">
            {length} / {MAX_LENGTH}
          </p>
        </div>
      </div>

      <IdentityFields user={user} fieldErrors={state.fieldErrors} values={values} />
    </div>
  );
}
