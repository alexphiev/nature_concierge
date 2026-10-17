"use server";

import { sendContributionMagicLink } from "@/src/contributions/submit";
import { readPendingCookie, writePendingCookie } from "@/src/contributions/pending-cookie";

export type ResendState = { error?: string; sent?: boolean };

const RESEND_DELAY_MS = 60_000;

export async function resendContributionLink(): Promise<ResendState> {
  const cookie = await readPendingCookie();
  if (!cookie) return { error: "Session expirée, recommencez depuis le formulaire." };
  if (Date.now() - cookie.sentAt < RESEND_DELAY_MS) {
    return { error: "Patientez une minute avant de redemander un lien." };
  }
  try {
    await sendContributionMagicLink({ email: cookie.email, name: "", next: cookie.next });
  } catch (error) {
    console.error("[contributions] magic link resend failed", error);
    return { error: "L'email n'a pas pu partir. Votre contribution est bien gardée : réessayez." };
  }
  await writePendingCookie({ ...cookie, sentAt: Date.now() });
  return { sent: true };
}
