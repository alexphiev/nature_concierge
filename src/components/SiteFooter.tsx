import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-sable/40 py-8 text-sm text-encre/70">
      <div className="mx-auto max-w-[1040px] px-4">
        <p>
          Ce site est tenu par une seule personne, sur le terrain. Les
          informations affichées viennent de sources officielles ou d&apos;une
          vérification directe — quand on ne sait pas, on le dit.
        </p>
        <p className="mt-2">
          <Link href="/places" className="text-mediterranee underline">
            Voir tous les lieux
          </Link>
        </p>
      </div>
    </footer>
  );
}
