const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

if (!WHATSAPP_NUMBER) {
  console.warn(
    "WhatsAppCTA: NEXT_PUBLIC_WHATSAPP_NUMBER is not set — the WhatsApp link will be broken.",
  );
}

export function WhatsAppCTA({ placeName }: { placeName: string }) {
  const message = `Bonjour ! Je cherche une idée de sortie nature. À propos de ${placeName} : `;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  // TODO(07-measurement): fire whatsapp_click { slug } analytics event on click.

  return (
    <div className="sticky top-6 rounded-2xl bg-mediterranee p-6 text-calcaire">
      <h3 className="font-display text-xl leading-snug">
        Besoin d&apos;un plan sur mesure ?
      </h3>
      <p className="mt-2.5 text-sm text-calcaire/85">
        Enfants, chien, mistral, plan B si ça sature — écrivez-moi, gratuit.
      </p>
      <a
        href={href}
        className="mt-4.5 flex items-center justify-center gap-2 rounded-[10px] bg-calcaire px-5 py-3.5 font-semibold text-mediterranee-deep"
      >
        Écrire sur WhatsApp
      </a>
    </div>
  );
}
