import type { Metadata } from "next";
import { AboutContent } from "@/src/components/landing/AboutContent";
import { BASE_OPEN_GRAPH } from "@/src/site";

const DESCRIPTION =
  "Qui fait le Guide Nature de La Ciotat, comment il est relu, et comment y contribuer.";

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
