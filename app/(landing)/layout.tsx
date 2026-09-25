import { Figtree, Fraunces } from "next/font/google";
import { LandingHeader } from "@/src/components/landing/LandingHeader";
import { LandingFooter } from "@/src/components/landing/LandingFooter";
import { MobileStickyBar } from "@/src/components/landing/MobileStickyBar";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fraunces.variable} ${figtree.variable} flex flex-1 flex-col bg-[#F5EFE4] pb-[calc(84px+env(safe-area-inset-bottom))] font-landing-body leading-[normal] text-[#1D2A2E] md:pb-0`}
    >
      <LandingHeader />
      {children}
      <LandingFooter />
      <MobileStickyBar />
    </div>
  );
}
