"use client";

import { useActionState } from "react";
import { FOCUS_RING } from "@/src/components/landing/shared";
import { SubmitButton } from "@/app/admin/SubmitButton";
import { resendContributionLink, type ResendState } from "./actions";

export function ResendForm() {
  const [state, action] = useActionState<ResendState>(resendContributionLink, {});

  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <SubmitButton
        className={`rounded-full bg-[#0E4B5A] px-6 py-3 text-base font-semibold text-white ${FOCUS_RING}`}
      >
        Renvoyer le lien
      </SubmitButton>
      <p role="status" className="text-base">
        {state.sent && "Nouveau lien envoyé."}
        {state.error}
      </p>
    </form>
  );
}
