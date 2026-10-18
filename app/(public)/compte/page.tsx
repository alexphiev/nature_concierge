import type { Metadata } from "next";
import { Suspense } from "react";
import { getSessionUser } from "@/src/auth/session";
import { CONTAINER } from "@/src/components/landing/shared";
import { DeleteAccountForm, ProfileForm, SignOutButton } from "./AccountForms";
import { getUserContributions } from "@/src/contributions/service";
import { MyContributions } from "./MyContributions";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false },
};

async function AccountContent({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const [{ erreur }, user] = await Promise.all([searchParams, getSessionUser()]);

  if (!user) {
    return (
      <>
        {erreur === "lien" && (
          <p role="alert" className="mt-4 text-lg text-pin">
            Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.
          </p>
        )}
        <p className="mt-4 text-lg">
          Saisissez votre email : nous vous envoyons un lien de connexion, sans mot de passe.
        </p>
        <div className="mt-6">
          <SignInForm />
        </div>
      </>
    );
  }

  const contributions = await getUserContributions(user.id);

  return (
    <div className="mt-6 space-y-10">
      <p>
        Connecté avec <strong>{user.email}</strong>. Cette adresse n&apos;est jamais affichée.
      </p>
      <ProfileForm user={user} />
      <MyContributions items={contributions} />
      <SignOutButton />
      <section aria-labelledby="delete-title" className="space-y-4 border-t border-encre/15 pt-8">
        <h2 id="delete-title" className="font-display text-2xl font-semibold">
          Supprimer mon compte
        </h2>
        <p>
          Vos conseils publiés restent en ligne, signés « Un ancien contributeur ». Vos
          contributions en attente sont supprimées.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}

export default function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  return (
    <main className={`${CONTAINER} max-w-[720px]! py-10 md:py-14`}>
      <h1 className="font-display text-[2rem] leading-tight font-semibold">Mon compte</h1>
      <Suspense>
        <AccountContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
