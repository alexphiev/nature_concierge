import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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
  const [{ erreur }, cookie] = await Promise.all([searchParams, readPendingCookie()]);

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
            <Link href={cookie.formPath} className={`font-semibold underline ${FOCUS_RING}`}>
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
