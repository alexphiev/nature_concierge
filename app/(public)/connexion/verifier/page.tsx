import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNextPath } from "@/src/contributions/paths";
import { getSessionUser } from "@/src/auth/session";
import { findLatestUnconfirmed, hasRecentPendingContribution } from "@/src/contributions/service";
import { readPendingCookie } from "@/src/contributions/pending-cookie";
import { CONTAINER, FOCUS_RING } from "@/src/components/landing/shared";
import { ResendForm } from "./ResendForm";

export const metadata: Metadata = {
  title: "Vérifiez votre boîte mail",
  robots: { index: false, follow: false },
};

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.charAt(0)}•••@${domain}`;
}

async function VerifyContent({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const [{ erreur }, cookie, user] = await Promise.all([
    searchParams,
    readPendingCookie(),
    getSessionUser(),
  ]);
  const alreadyInReview =
    erreur !== "envoi" &&
    (cookie
      ? !(await findLatestUnconfirmed(cookie.email))
      : Boolean(user) && (await hasRecentPendingContribution(user!.id)));

  if (alreadyInReview) {
    return (
      <>
        <p className="mt-4 text-lg">
          Votre contribution est déjà en relecture. Vous recevrez un email dès qu’elle est en ligne.
        </p>
        <div className="mt-8">
          <Link href="/lieux" className={`font-semibold underline ${FOCUS_RING}`}>
            Retour au guide
          </Link>
        </div>
      </>
    );
  }

  const message =
    erreur === "lien"
      ? "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau."
      : erreur === "envoi"
        ? "L'email n'a pas pu partir. Votre contribution est bien gardée : réessayez."
        : cookie
          ? `Dernière étape : cliquez sur le lien envoyé à ${maskEmail(cookie.email)}. Votre contribution partira en relecture aussitôt.`
          : null;

  return (
    <>
      {message && <p className="mt-4 text-lg">{message}</p>}
      <div className="mt-8 flex flex-col items-start gap-4">
        {cookie ? (
          <>
            <ResendForm />
            <Link href={safeNextPath(cookie.formPath)} className={`font-semibold underline ${FOCUS_RING}`}>
              Mauvaise adresse ? Recommencer
            </Link>
          </>
        ) : (
          <Link href="/compte" className={`font-semibold underline ${FOCUS_RING}`}>
            Recevoir un lien de connexion
          </Link>
        )}
      </div>
    </>
  );
}

export default function VerifierPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  return (
    <main className={`${CONTAINER} py-16`}>
      <h1 className="text-3xl font-semibold">Vérifiez votre boîte mail</h1>
      <Suspense>
        <VerifyContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
