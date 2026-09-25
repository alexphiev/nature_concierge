const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

if (!WHATSAPP_NUMBER) {
  console.warn(
    "WhatsAppCTA: NEXT_PUBLIC_WHATSAPP_NUMBER is not set — the WhatsApp link will be broken.",
  );
}

function whatsAppHref(placeName: string): string {
  const message = `Bonjour ! Je cherche une idée de sortie nature. À propos de ${placeName} : `;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function ChatIcon() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" />
    </svg>
  );
}

// TODO(07-measurement): fire whatsapp_click { slug } analytics event on click.

export function WhatsAppCTA({ placeName }: { placeName: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-xl leading-snug font-semibold">
          Besoin d&apos;un plan sur mesure ?
        </h3>
        <p className="text-sm leading-relaxed text-encre/75">
          Enfants, chien, mistral, plan B si ça sature — écrivez-moi, c&apos;est gratuit.
        </p>
      </div>
      <a
        href={whatsAppHref(placeName)}
        className="flex items-center justify-center gap-2.5 rounded-xl bg-mediterranee px-5 py-3.5 font-semibold text-calcaire transition-colors hover:bg-mediterranee-deep"
      >
        <ChatIcon />
        Écrire sur WhatsApp
      </a>
    </div>
  );
}

export function WhatsAppBar({ placeName }: { placeName: string }) {
  return (
    <div className="sticky bottom-0 z-40 -mx-4 mt-12 flex items-center justify-between gap-3 border-t border-sable/50 bg-calcaire px-5 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="flex flex-col">
        <span className="text-sm font-semibold">Plan sur mesure</span>
        <span className="text-xs text-encre/70">Enfants, chien, mistral… gratuit</span>
      </div>
      <a
        href={whatsAppHref(placeName)}
        className="inline-flex items-center gap-2 rounded-xl bg-mediterranee px-4.5 py-3 text-sm font-semibold text-calcaire"
      >
        <ChatIcon />
        WhatsApp
      </a>
    </div>
  );
}
