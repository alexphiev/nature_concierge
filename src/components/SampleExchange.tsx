export function SampleExchange() {
  return (
    <div className="rounded-[10px] bg-calcaire-deep p-5 sm:p-8">
      <div className="flex flex-col gap-4">
        <p className="rounded-[10px] border-l-2 border-sable bg-calcaire-deep px-5 py-4 leading-relaxed text-encre/90">
          <span className="mr-2 font-mono text-[0.75rem] uppercase tracking-wider text-sable">
            Q.
          </span>
          « Dimanche aprèm avec les enfants (3 et 6 ans), on est vers
          Saint-Cyr, il annonce du mistral. Une idée ? »
        </p>
        <p className="rounded-[10px] border-l-2 border-mediterranee bg-calcaire px-5 py-4 leading-relaxed text-encre/90">
          <span className="mr-2 font-mono text-[0.75rem] uppercase tracking-wider text-mediterranee">
            R.
          </span>
          « Évitez Port d&apos;Alon dimanche : le parking sature vers 10h30 et
          la calanque prend le mistral de plein fouet. Allez plutôt à la
          Madrague — abritée, sentier court, faisable avec un 3 ans. Visez
          avant 10h, ça tient jusqu&apos;à 11h. Vérifiez quand même la carte
          préfecture ce soir après 18h, le massif peut passer en rouge. »
        </p>
      </div>
      <p className="mt-5 font-mono text-[0.8rem] text-sable">
        Une vraie réponse, un vrai dimanche. C&apos;est ce que vous recevez.
      </p>
    </div>
  );
}
