import Link from "next/link";

export function ContributeCard({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-xl leading-snug font-semibold">
          Vous connaissez ce lieu ?
        </h3>
        <p className="text-sm leading-relaxed text-encre/75">
          Ajoutez une astuce, corrigez une info ou partagez vos photos. Tout est relu avant
          publication.
        </p>
      </div>
      <Link
        href={`/lieux/${slug}/astuce`}
        className="flex items-center justify-center rounded-xl bg-mediterranee px-5 py-3.5 font-semibold text-calcaire transition-colors hover:bg-mediterranee-deep"
      >
        Ajouter une astuce
      </Link>
      <div className="flex justify-center gap-5 text-sm">
        <Link href={`/lieux/${slug}/photos`} className="text-mediterranee underline underline-offset-2">
          Ajouter des photos
        </Link>
        <Link href={`/lieux/${slug}/corriger`} className="text-mediterranee underline underline-offset-2">
          Signaler une erreur
        </Link>
      </div>
    </div>
  );
}
