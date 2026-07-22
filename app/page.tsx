import Link from "next/link";
import { LandingWhatsAppCTA } from "@/src/components/LandingWhatsAppCTA";

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-16 px-4 py-16">
      <section className="flex flex-col items-start gap-6">
        <h1 className="font-display text-3xl">
          Le guide local qui vous dit où aller. Et où ne pas aller.
        </h1>
        <p className="text-lg">
          Sorties nature entre Marseille et Bandol, conseillées comme le
          ferait un très bon guide du coin : selon la météo, le monde, les
          fermetures du jour — et selon vous. Gratuit, réponse en quelques
          heures.
        </p>
        <LandingWhatsAppCTA />
        <Link href="/places" className="text-mediterranee underline">
          Voir les lieux couverts
        </Link>
      </section>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="font-display text-2xl">
            Personne ne centralise l&apos;essentiel.
          </h2>
          <p className="mt-2">
            Fermetures incendie, qualité de l&apos;eau, saturation des
            parkings : ces infos existent, éparpillées entre préfectures,
            mairies et applis par site. On les rassemble, chaque jour.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl">
            Un office de tourisme défend sa commune.
          </h2>
          <p className="mt-2">
            Nous, on vous défend vous. Si Cassis sature, on vous envoie
            ailleurs — un OT ne peut pas faire ça.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl">
            Des conseils qu&apos;aucune IA générique ne connaît.
          </h2>
          <p className="mt-2">
            Nos réponses viennent d&apos;un carnet de terrain vérifié : où se
            garer vraiment, à quelle heure ça bascule, quoi éviter avec une
            poussette. Pas de résumés du web.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Comment ça marche</h2>
        <p>Écrivez-nous (qui, quand, contraintes)</p>
        <p>On prépare votre sortie sur mesure, avec plan B</p>
        <p>Vous y allez ; dites-nous si c&apos;était juste, ça aide le suivant.</p>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="h-16 w-16 shrink-0 rounded-full bg-calcaire-deep"
          />
          <p>
            Je m&apos;appelle Alexandre, développeur et habitant de La
            Ciotat.
          </p>
        </div>
        <p>
          Sources officielles liées, date de vérification affichée partout,
          quand on ne sait pas, on le dit.
        </p>
        <p>Gratuit, pas de compte, prénom suffit.</p>
      </section>

      <section className="flex flex-col items-start gap-4">
        <LandingWhatsAppCTA />
      </section>
    </main>
  );
}
