import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/src/auth/session";
import { attachUnconfirmedContributions } from "@/src/contributions/service";
import { clearPendingCookie } from "@/src/contributions/pending-cookie";
import { safeNextPath, withSentFlag } from "@/src/contributions/paths";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/connexion/verifier?erreur=lien", request.url));
  }
  await attachUnconfirmedContributions(user);
  await clearPendingCookie();
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(withSentFlag(next), request.url));
}
