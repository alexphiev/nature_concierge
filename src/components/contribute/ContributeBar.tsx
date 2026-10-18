import Link from "next/link";

export function ContributeBar({ slug }: { slug: string }) {
  return (
    <div className="sticky bottom-0 z-40 -mx-4 mt-12 flex items-center justify-between gap-3 border-t border-sable/50 bg-calcaire px-5 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:hidden">
      <span className="text-sm font-semibold">Vous connaissez ce lieu ?</span>
      <Link
        href={`/lieux/${slug}/astuce`}
        className="inline-flex items-center rounded-xl bg-mediterranee px-4.5 py-3 text-sm font-semibold whitespace-nowrap text-calcaire"
      >
        Contribuer
      </Link>
    </div>
  );
}
