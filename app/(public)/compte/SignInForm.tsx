"use client";

import { useState } from "react";
import { authClient } from "@/src/auth/auth-client";
import { FOCUS_RING } from "@/src/components/landing/shared";

type Status = "idle" | "sending" | "sent" | "error";

export function SignInForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setStatus("sending");
    try {
      const { error } = await authClient.signIn.magicLink({
        email,
        callbackURL: "/compte",
        errorCallbackURL: "/compte?erreur=lien",
      });
      setStatus(error ? "error" : "sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="signin-email" className="font-semibold">
          Votre email
        </label>
        <input
          id="signin-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={`mt-1 block w-full rounded-lg border border-encre/30 bg-white px-3 py-2 text-base ${FOCUS_RING}`}
        />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        aria-busy={status === "sending"}
        className={`rounded-full bg-[#0E4B5A] px-6 py-3 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${FOCUS_RING}`}
      >
        Recevoir le lien
      </button>
      <p role="status" className={status === "error" ? "text-pin" : undefined}>
        {status === "sent" && "Lien envoyé, vérifiez votre boîte mail."}
        {status === "error" && "Le lien n'a pas pu être envoyé. Réessayez dans un instant."}
      </p>
    </form>
  );
}
