const ACCEPTED = [
  "Une expérience vécue sur place, de première main",
  "Des informations concrètes et vérifiables",
  "Un ton bienveillant",
  "Utile à quelqu'un qui s'y rend",
];

const DECLINED = [
  "Promotion ou publicité",
  "Données personnelles sur des tiers",
  "Encourager l'accès hors sentier ou le bivouac dans le Parc national",
  "Entrer dans une propriété privée",
  "Des photos que vous n'avez pas prises",
  "Tout ce qui contredit les règles officielles d'accès liées au risque incendie",
];

export function Charter({ expanded = false }: { expanded?: boolean }) {
  if (expanded) {
    return (
      <section id="charte" aria-labelledby="charte-titre" className="scroll-mt-6">
        <h2
          id="charte-titre"
          className="font-landing-display text-[28px] leading-[1.15] font-semibold md:text-[36px]"
        >
          Ce qui est publié : la charte
        </h2>
        <CharterLists className="mt-6" />
      </section>
    );
  }
  return (
    <details id="charte" className="rounded-xl border border-encre/15 bg-calcaire-deep p-4">
      <summary className="cursor-pointer font-semibold">
        Ce qui est publié : la charte
      </summary>
      <CharterLists className="mt-4" />
    </details>
  );
}

function CharterLists({ className }: { className: string }) {
  return (
    <div className={`${className} grid gap-6 text-base md:grid-cols-2`}>
      <div>
        <h3 className="font-semibold">Accepté</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {ACCEPTED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold">Refusé</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {DECLINED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
