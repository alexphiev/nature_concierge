"use client";

import { useActionState } from "react";
import type { SessionUser } from "@/src/auth/session";
import { FOCUS_RING } from "@/src/components/landing/shared";
import { SubmitButton } from "@/src/components/SubmitButton";
import type { FormState } from "@/src/contributions/submit";
import { deleteAccount, signOutAction, updateAccount } from "./actions";

const INPUT = `mt-1 block w-full rounded-lg border border-encre/30 bg-white px-3 py-2 text-base ${FOCUS_RING}`;
const PRIMARY = `rounded-full bg-[#0E4B5A] px-6 py-3 text-base font-semibold text-white ${FOCUS_RING}`;

export function ProfileForm({ user }: { user: SessionUser }) {
  const [state, action] = useActionState<FormState, FormData>(updateAccount, {});
  const errors = state.fieldErrors;

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="account-name" className="font-semibold">
          Nom affiché
        </label>
        <input
          id="account-name"
          name="name"
          required
          minLength={2}
          maxLength={40}
          autoComplete="given-name"
          defaultValue={state.values?.name ?? user.name}
          aria-invalid={Boolean(errors?.name)}
          aria-describedby={errors?.name ? "account-name-error" : undefined}
          className={INPUT}
        />
        {errors?.name && (
          <p id="account-name-error" role="alert" className="mt-1 text-sm text-pin">
            {errors.name}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="account-commune" className="font-semibold">
          Commune (facultatif)
        </label>
        <input
          id="account-commune"
          name="commune"
          maxLength={80}
          autoComplete="address-level2"
          defaultValue={state.values?.commune ?? user.commune ?? ""}
          aria-invalid={Boolean(errors?.commune)}
          aria-describedby={errors?.commune ? "account-commune-error" : undefined}
          className={INPUT}
        />
        {errors?.commune && (
          <p id="account-commune-error" role="alert" className="mt-1 text-sm text-pin">
            {errors.commune}
          </p>
        )}
      </div>
      <SubmitButton className={PRIMARY}>Enregistrer</SubmitButton>
      <p role="status">{state.values?.saved && "Modifications enregistrées."}</p>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton
        className={`rounded-full border border-[#0E4B5A] px-6 py-3 text-base font-semibold text-[#0E4B5A] ${FOCUS_RING}`}
      >
        Se déconnecter
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<FormState, FormData>(deleteAccount, {});
  const error = state.fieldErrors?.confirm;

  return (
    <form action={action} className="space-y-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="confirm"
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "account-confirm-error" : undefined}
          className="mt-1 size-5 shrink-0"
        />
        <span>Je confirme la suppression</span>
      </label>
      {error && (
        <p id="account-confirm-error" role="alert" className="text-sm text-pin">
          {error}
        </p>
      )}
      <SubmitButton
        className={`rounded-full bg-pin px-6 py-3 text-base font-semibold text-white ${FOCUS_RING}`}
      >
        Supprimer définitivement
      </SubmitButton>
    </form>
  );
}
