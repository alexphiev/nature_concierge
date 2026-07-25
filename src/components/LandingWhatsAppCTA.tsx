import { WhatsAppIcon } from "@/src/components/icons/WhatsAppIcon";

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
      className="flex w-full items-center justify-center gap-2.5 rounded-[10px] bg-mediterranee px-6 py-3.5 font-medium text-white transition-colors duration-150 hover:bg-mediterranee/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee sm:w-auto"
    >
      <WhatsAppIcon className="size-4.5 shrink-0" />
      Demander un plan sur WhatsApp
    </a>
  );
}
