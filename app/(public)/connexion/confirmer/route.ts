import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/src/auth/session";
import {
  attachUnconfirmedContributions,
  hasRecentPendingContribution,
} from "@/src/contributions/service";
import { clearPendingCookie } from "@/src/contributions/pending-cookie";
import { safeNextPath, withSentFlag } from "@/src/contributions/paths";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/connexion/verifier?erreur=lien", request.url));
  }
  // The sign-in hook usually attached already; this call only catches a hook failure.
  const attached = await attachUnconfirmedContributions(user);
  const sent = attached > 0 || (await hasRecentPendingContribution(user.id));
  await clearPendingCookie();
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(sent ? withSentFlag(next) : next, request.url));
}
