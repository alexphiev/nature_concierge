"use server";

import {
  MAGIC_LINK_THROTTLE_MESSAGE,
  MagicLinkThrottledError,
  sendContributionMagicLink,
} from "@/src/contributions/submit";
import { findLatestUnconfirmed } from "@/src/contributions/service";
import {
  clearPendingCookie,
  readPendingCookie,
  writePendingCookie,
} from "@/src/contributions/pending-cookie";

export type ResendState = { error?: string; sent?: boolean };

const RESEND_DELAY_MS = 60_000;

export async function resendContributionLink(): Promise<ResendState> {
  const cookie = await readPendingCookie();
  const expired = { error: "Session expirée, recommencez depuis le formulaire." };
  if (!cookie) return expired;
  const latest = await findLatestUnconfirmed(cookie.email);
  if (!latest) {
    await clearPendingCookie();
    return expired;
  }
  if (Date.now() - cookie.sentAt < RESEND_DELAY_MS) {
    return { error: MAGIC_LINK_THROTTLE_MESSAGE };
  }
  try {
    await sendContributionMagicLink({
      email: cookie.email,
      name: latest.pendingName ?? "",
      next: cookie.next,
    });
  } catch (error) {
    if (error instanceof MagicLinkThrottledError) return { error: MAGIC_LINK_THROTTLE_MESSAGE };
    console.error("[contributions] magic link resend failed", error);
    return { error: "L'email n'a pas pu partir. Votre contribution est bien gardée : réessayez." };
  }
  await writePendingCookie({ ...cookie, sentAt: Date.now() });
  return { sent: true };
}
