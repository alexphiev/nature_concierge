const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

if (!WHATSAPP_NUMBER) {
  console.warn(
    "LandingWhatsAppCTA: NEXT_PUBLIC_WHATSAPP_NUMBER is not set — the WhatsApp link will be broken.",
  );
}

export function LandingWhatsAppCTA() {
  const message = `Bonjour ! Je cherche une idée de sortie nature.
Quand : … / Qui : … (enfants, chien, mobilité…) / Où en gros : … /
Contraintes : … (météo, marche, parking…)`;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  // TODO(07-measurement): fire whatsapp_click { source: "landing" } analytics event on click.

  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white sm:w-auto"
    >
      Demander un plan sur WhatsApp
    </a>
  );
}
