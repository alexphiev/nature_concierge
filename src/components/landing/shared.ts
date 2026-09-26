const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

if (!WHATSAPP_NUMBER) {
  console.warn(
    "Landing: NEXT_PUBLIC_WHATSAPP_NUMBER is not set — the WhatsApp links will be broken.",
  );
}

function whatsAppHref(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const ASK_HREF = whatsAppHref(
  "Bonjour ! Je cherche une idée de sortie nature. Je pense y aller …",
);
export const PROPOSE_PLACE_HREF = whatsAppHref("Bonjour ! Je voudrais proposer un lieu : ");
export const SHARE_TIP_HREF = whatsAppHref("Bonjour ! J’ai une astuce à partager : ");

export const ABOUT_HREF = "/a-propos";

// Placeholders until the owner supplies the targets.
export const STORY_HREF = "#";
export const COFFEE_HREF = "#";
export const ACCESS_MAP_HREF = "#";

export const CONTAINER =
  "mx-auto box-content max-w-[1200px] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] md:pr-[max(2rem,env(safe-area-inset-right))] md:pl-[max(2rem,env(safe-area-inset-left))]";
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E4B5A]";

export const GUIDE_HREF = "/lieux";
export const ACTIVE_LINK = "text-[#0E4B5A] underline decoration-2 underline-offset-8";
