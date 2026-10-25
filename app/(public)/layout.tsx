import { SiteHeader } from "@/src/components/site/SiteHeader";
import { SiteFooter } from "@/src/components/site/SiteFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
