import type { Metadata } from "next";
import { AboutContent } from "@/src/components/landing/AboutContent";
import { BASE_OPEN_GRAPH } from "@/src/site";

const DESCRIPTION =
  "Qui tient le Guide Nature de La Ciotat, ce qu’il propose, et comment le soutenir.";

export const metadata: Metadata = {
  title: "À propos",
  description: DESCRIPTION,
  alternates: { canonical: "/a-propos" },
  openGraph: { ...BASE_OPEN_GRAPH, url: "/a-propos" },
};

export default function AboutPage() {
  return (
    <main>
      <AboutContent />
    </main>
  );
}
