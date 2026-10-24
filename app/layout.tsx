import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { figtree, fraunces } from "@/src/fonts";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, BASE_OPEN_GRAPH } from "@/src/site";

// Only the admin still uses a monospace font.
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Guide Nature de La Ciotat — calanques, criques et sentiers",
    template: "%s · Guide Nature de La Ciotat",
  },
  description:
    "Le guide nature de La Ciotat : calanques, criques et sentiers, avec des infos pratiques vérifiées et des conseils de terrain, relus avant publication.",
  openGraph: BASE_OPEN_GRAPH,
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${figtree.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-calcaire text-encre">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
