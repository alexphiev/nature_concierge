"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ClaimKind, ClaimType } from "../../../prisma/generated/client";
import type { SessionUser } from "@/src/auth/session";
import { FOCUS_RING } from "@/src/components/landing/shared";
import { SubmitButton } from "@/src/components/SubmitButton";
import {
  SOURCE_HINT_MAX_LENGTH,
  TIP_KIND_COPY,
  TIP_THEMES,
} from "@/src/contributions/schema";
import type { FormState } from "@/src/contributions/submit";
import { NEED_QUESTIONS } from "@/src/corpus/place-needs";
import { submitTip } from "@/app/(public)/lieux/[slug]/astuce/actions";
import { IdentityFields } from "./IdentityFields";

const MAX_LENGTH = 500;
const INPUT = `mt-1 block w-full rounded-lg border border-encre/30 bg-white px-3 py-2 text-base ${FOCUS_RING}`;

export function TipForm({
  slug,
  kind,
  user,
}: {
  slug: string;
  kind: ClaimKind;
  user: SessionUser | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    submitTip.bind(null, slug, kind),
    {},
  );

  return (
    <form action={action} className="space-y-6">
      <TipFields key={JSON.stringify(state.values ?? {})} state={state} kind={kind} user={user} />
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

function TipFields({
  state,
  kind,
  user,
}: {
  state: FormState;
  kind: ClaimKind;
  user: SessionUser | null;
}) {
  const copy = TIP_KIND_COPY[kind];
  const themes = TIP_THEMES.filter((theme) => copy.themes.includes(theme.value));
  const searchParams = useSearchParams();
  const requestedTheme = searchParams.get("theme") as ClaimType | null;
  const question = requestedTheme ? NEED_QUESTIONS[kind][requestedTheme] : undefined;

  const values = state.values;
  const [length, setLength] = useState(values?.text.length ?? 0);
  const selectedTheme =
    values?.claimType ||
    (requestedTheme && copy.themes.includes(requestedTheme) ? requestedTheme : copy.defaultTheme);

  return (
    <div className="space-y-6">
      {question && (
        <p className="rounded-xl border-l-4 border-mediterranee bg-mediterranee/5 px-4 py-3 text-base leading-relaxed">
          <span className="font-semibold">La question du moment :</span> {question}
        </p>
      )}

      <fieldset>
        <legend className="font-semibold">Thème</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {themes.map((theme) => (
            <label key={theme.value} className="cursor-pointer">
              <input
                type="radio"
                name="claimType"
                value={theme.value}
                defaultChecked={theme.value === selectedTheme}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-encre/30 bg-white px-4 py-2 text-base peer-checked:border-mediterranee peer-checked:bg-mediterranee peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mediterranee">
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
          {copy.textLabel}
        </label>
        <p id="tip-text-hint" className="text-sm text-encre/65">
          {copy.textHint}
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
          className={INPUT}
        />
        <div className="mt-1 flex justify-between gap-4">
          {state.fieldErrors?.text ? (
            <p id="tip-text-error" role="alert" className="text-sm text-pin">
              {state.fieldErrors.text}
            </p>
          ) : (
            <span />
          )}
          <p className="text-xs text-encre/65 tabular-nums" aria-live="off">
            {length} / {MAX_LENGTH}
          </p>
        </div>
      </div>

      {kind === "PRACTICAL_INFO" && (
        <div>
          <label htmlFor="tip-source" className="font-semibold">
            D&apos;où vient l&apos;info ? <span className="font-normal text-encre/65">(facultatif)</span>
          </label>
          <p id="tip-source-hint" className="text-sm text-encre/65">
            Un panneau sur place, un site officiel, un lien. Ça aide à la vérifier.
          </p>
          <input
            id="tip-source"
            name="sourceHint"
            type="text"
            maxLength={SOURCE_HINT_MAX_LENGTH}
            defaultValue={values?.sourceHint}
            aria-describedby="tip-source-hint"
            aria-invalid={Boolean(state.fieldErrors?.sourceHint)}
            className={INPUT}
          />
          {state.fieldErrors?.sourceHint && (
            <p role="alert" className="mt-1 text-sm text-pin">
              {state.fieldErrors.sourceHint}
            </p>
          )}
        </div>
      )}

      <IdentityFields user={user} fieldErrors={state.fieldErrors} values={values} />
    </div>
  );
}
