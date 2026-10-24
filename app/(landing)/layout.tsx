import type { Viewport } from "next";
import { SiteHeader } from "@/src/components/site/SiteHeader";
import { SiteFooter } from "@/src/components/site/SiteFooter";

// Without cover, env(safe-area-inset-*) is always 0 on notched phones.
export const viewport: Viewport = { viewportFit: "cover" };

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-1 flex-col bg-[#F5EFE4] font-landing-body leading-[normal] text-[#1D2A2E]"
    >
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
