import { figtree, fraunces } from "@/src/fonts";
import { ConstructionBanner } from "@/src/components/landing/ConstructionBanner";
import { SiteHeader } from "@/src/components/site/SiteHeader";
import { SiteFooter } from "@/src/components/site/SiteFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${fraunces.variable} ${figtree.variable} flex flex-1 flex-col`}>
      <ConstructionBanner />
      <SiteHeader guideActive />
      {children}
      <SiteFooter />
    </div>
  );
}
