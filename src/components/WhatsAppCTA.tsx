const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export function WhatsAppCTA({ placeName }: { placeName: string }) {
  const message = `Bonjour ! Je cherche une idée de sortie nature. À propos de ${placeName} : `;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  // TODO(07-measurement): fire whatsapp_click { slug } analytics event on click.

  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white sm:w-auto"
    >
      Besoin d&apos;un plan sur mesure ? Écrivez-moi sur WhatsApp — gratuit
    </a>
  );
}
