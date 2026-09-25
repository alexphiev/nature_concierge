import { ChatIcon, Monogram } from "./icons";
import { ASK_HREF, FOCUS_RING } from "./shared";

export function MobileStickyBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(84px+env(safe-area-inset-bottom))] items-center gap-3 border-t border-[#E4DACA] bg-[#FFFDF8] pt-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] pb-[calc(16px+env(safe-area-inset-bottom))] md:hidden">
      <Monogram className="size-11 text-[19px]" />
      <a
        href={ASK_HREF}
        className={`flex h-13 grow items-center justify-center gap-2 rounded-full bg-[#0E4B5A] text-[16px] font-semibold text-white ${FOCUS_RING}`}
      >
        <ChatIcon className="size-[19px]" />
        Une question ? WhatsApp
      </a>
    </div>
  );
}
