# Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing places index (`/places`) and place detail page (`/places/[slug]`), styled per the project's visual identity, backed by the existing corpus data layer.

**Architecture:** A read-only query layer (`src/corpus/queries.ts`) wraps the existing Prisma client and enforces the "public claims only" business rule. A rebuilt root layout carries the project's fonts/tokens (Bricolage Grotesque, Public Sans, IBM Plex Mono; Tailwind v4 `@theme inline` tokens). Route-level components (`app/places/page.tsx`, `app/places/[slug]/page.tsx`) are Server Components using `generateStaticParams` + ISR (`revalidate = 900`), composed from single-purpose presentational components in `src/components/`. A token-secured Route Handler exposes on-demand revalidation for a future signal-ops script to call.

**Tech Stack:** Next.js 16.2.10 (App Router), TypeScript, Tailwind v4, Prisma 7.9.0 (existing corpus layer), `next/font/google`.

## Global Constraints

- All user-facing copy in French (`03-public-site.md`). This includes UI labels, not just corpus content.
- Routes are `/places` and `/places/[slug]` (English URL segments per explicit user instruction — the spec's own French `/lieux` naming is superseded for this project).
- Public pages expose only: full status layer + `isPublic = true AND status = PUBLISHED` claims. No query or endpoint may expose the full claim set (`03-public-site.md` "Giveaway line").
- Status block must never default to green and must never render a stale row without its date visible; absence of a `StatusLog` row renders a distinct "non vérifié" state, not a fallback (`03-public-site.md`, `09-design.md`).
- Brand accent is never red/orange/terracotta — those are reserved for fire-risk status semantics (`09-design.md`).
- Status chips/blocks always pair color + icon + label, never color alone (`09-design.md`, accessibility floor).
- No dark mode for MVP (`09-design.md`).
- IBM Plex Mono is used *only* for status/dateline/source-attribution text, nowhere else (`09-design.md`).
- Place page section order is fixed: status block → identity/photo → claims ("conseils du guide") → WhatsApp CTA → alternative callout (`03-public-site.md`, `09-design.md`).
- The only filled/solid button on any page is the WhatsApp CTA (`09-design.md`).
- Mobile-first, test at 375px; visible `--mediterranee` 2px keyboard focus ring; AA contrast; `prefers-reduced-motion` respected; LCP < 2.5s (`03-public-site.md`, `09-design.md`).
- Index page is a list, never a map/filter UI (`00-scope.md` non-goal).
- Out of scope for this plan (do not build): `/` landing page, `/statut`, `sitemap.ts`/`robots.ts`/`llms.txt`, analytics event firing (leave a marked no-op only), any `StatusLog` seed data.

---

## File Structure

```
app/layout.tsx                      # rebuilt: fonts, lang="fr", no dark mode, SiteFooter
app/globals.css                     # rebuilt: 09-design.md token table in Tailwind v4 @theme
app/places/page.tsx                 # /places index (Server Component)
app/places/[slug]/page.tsx          # /places/[slug] detail (Server Component, ISR)
app/api/revalidate/route.ts         # POST, token-secured revalidation endpoint
src/corpus/queries.ts               # getActivePlaces, getPlaceBySlug, getTodayStatus
src/corpus/queries.test.ts          # unit tests (mocked Prisma client)
src/components/StatusBlock.tsx
src/components/StatusChip.tsx
src/components/ClaimList.tsx
src/components/ClaimItem.tsx
src/components/WhatsAppCTA.tsx
src/components/AlternativeCallout.tsx
src/components/PlaceCard.tsx
src/components/Dateline.tsx
src/components/SiteFooter.tsx
```

Rationale: `src/corpus/queries.ts` stays in `src/corpus/` alongside the existing schema/db/taxonomy modules — it's corpus-domain logic, not a UI concern, and this keeps every DB-touching corpus function in one place for the giveaway-line rule to be auditable in one file. `src/components/` holds pure presentational pieces, each independently reviewable against `09-design.md`.

---

## Task 1: Query layer (`src/corpus/queries.ts`)

**Files:**
- Create: `src/corpus/queries.ts`
- Create: `src/corpus/queries.test.ts`

**Interfaces:**
- Consumes: `prisma` from `src/corpus/db.ts` (existing).
- Produces:
  - `getActivePlaces(): Promise<Place[]>` — Prisma `Place[]` type, `status: ACTIVE`, ordered by `demandRank` ascending. Consumed by Task 5 (`/places`) and Task 6 (`generateStaticParams`).
  - `getPlaceBySlug(slug: string): Promise<PlaceWithPublicClaims | null>` — `null` if not found or not ACTIVE. Consumed by Task 6.
  - `getTodayStatus(placeId: string): Promise<StatusLog | null>` — `null` is a valid, expected result. Consumed by Task 3 (`StatusBlock`) via Task 6.
  - Type: `PlaceWithPublicClaims = Place & { claims: Claim[] }` (claims pre-filtered to public+published).

This task has no UI dependency — build and test it standalone first.

- [ ] **Step 1: Write the failing test for `getActivePlaces`**

Create `src/corpus/queries.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyPlaceMock = vi.fn();
const findFirstPlaceMock = vi.fn();
const findFirstStatusLogMock = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    place: {
      findMany: findManyPlaceMock,
      findFirst: findFirstPlaceMock,
    },
    statusLog: {
      findFirst: findFirstStatusLogMock,
    },
  },
}));

import { getActivePlaces, getPlaceBySlug, getTodayStatus } from "./queries";

beforeEach(() => {
  findManyPlaceMock.mockReset();
  findFirstPlaceMock.mockReset();
  findFirstStatusLogMock.mockReset();
});

describe("getActivePlaces", () => {
  it("queries ACTIVE places ordered by demandRank ascending", async () => {
    findManyPlaceMock.mockResolvedValue([{ slug: "port-d-alon" }]);

    const result = await getActivePlaces();

    expect(findManyPlaceMock).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      orderBy: { demandRank: "asc" },
    });
    expect(result).toEqual([{ slug: "port-d-alon" }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/corpus/queries.test.ts`
Expected: FAIL — `Cannot find module './queries'`.

- [ ] **Step 3: Implement `getActivePlaces`**

Create `src/corpus/queries.ts`:

```ts
import { prisma } from "./db";
import type { Place, Claim, StatusLog } from "../../prisma/generated/client";

export async function getActivePlaces(): Promise<Place[]> {
  return prisma.place.findMany({
    where: { status: "ACTIVE" },
    orderBy: { demandRank: "asc" },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/corpus/queries.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Write the failing tests for `getPlaceBySlug`**

Append to `src/corpus/queries.test.ts`:

```ts
describe("getPlaceBySlug", () => {
  it("queries an ACTIVE place by slug with only public+published claims", async () => {
    findFirstPlaceMock.mockResolvedValue({
      slug: "port-d-alon",
      claims: [{ claimText: "hook claim" }],
    });

    const result = await getPlaceBySlug("port-d-alon");

    expect(findFirstPlaceMock).toHaveBeenCalledWith({
      where: { slug: "port-d-alon", status: "ACTIVE" },
      include: {
        claims: {
          where: { isPublic: true, status: "PUBLISHED" },
        },
      },
    });
    expect(result).toEqual({
      slug: "port-d-alon",
      claims: [{ claimText: "hook claim" }],
    });
  });

  it("returns null when no matching place is found", async () => {
    findFirstPlaceMock.mockResolvedValue(null);

    const result = await getPlaceBySlug("does-not-exist");

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 6: Run to verify these fail**

Run: `pnpm exec vitest run src/corpus/queries.test.ts`
Expected: FAIL — `getPlaceBySlug is not a function` (2 new failures; first test still passes).

- [ ] **Step 7: Implement `getPlaceBySlug`**

Append to `src/corpus/queries.ts`:

```ts
export type PlaceWithPublicClaims = Place & { claims: Claim[] };

export async function getPlaceBySlug(
  slug: string,
): Promise<PlaceWithPublicClaims | null> {
  return prisma.place.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      claims: {
        where: { isPublic: true, status: "PUBLISHED" },
      },
    },
  }) as Promise<PlaceWithPublicClaims | null>;
}
```

- [ ] **Step 8: Run to verify all pass**

Run: `pnpm exec vitest run src/corpus/queries.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Write the failing tests for `getTodayStatus`**

Append to `src/corpus/queries.test.ts`:

```ts
describe("getTodayStatus", () => {
  it("queries the most recent StatusLog for today or later for the place", async () => {
    findFirstStatusLogMock.mockResolvedValue({ value: "vert" });

    const result = await getTodayStatus("place-id-1");

    expect(findFirstStatusLogMock).toHaveBeenCalledWith({
      where: {
        placeId: "place-id-1",
        forDate: { gte: expect.any(Date) },
      },
      orderBy: { forDate: "asc" },
    });
    expect(result).toEqual({ value: "vert" });
  });

  it("returns null when no StatusLog row exists (unverified state)", async () => {
    findFirstStatusLogMock.mockResolvedValue(null);

    const result = await getTodayStatus("place-id-1");

    expect(result).toBeNull();
  });
});
```

Design note for the implementer: `forDate: { gte: <start of today at 00:00> }` combined with `orderBy: { forDate: "asc" }` naturally returns today's row if present, else tomorrow's (relevant after ~18h per fire-status publishing schedule), else `null` — without needing separate today/tomorrow branches. Compute "start of today" as `new Date(new Date().setHours(0, 0, 0, 0))`.

- [ ] **Step 10: Run to verify these fail**

Run: `pnpm exec vitest run src/corpus/queries.test.ts`
Expected: FAIL — `getTodayStatus is not a function` (2 new failures; prior 3 still pass).

- [ ] **Step 11: Implement `getTodayStatus`**

Append to `src/corpus/queries.ts`:

```ts
export async function getTodayStatus(
  placeId: string,
): Promise<StatusLog | null> {
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

  return prisma.statusLog.findFirst({
    where: {
      placeId,
      forDate: { gte: startOfToday },
    },
    orderBy: { forDate: "asc" },
  });
}
```

- [ ] **Step 12: Run full test file to verify all pass**

Run: `pnpm exec vitest run src/corpus/queries.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 13: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 14: Commit**

```bash
git add src/corpus/queries.ts src/corpus/queries.test.ts
git commit -m "Add corpus query layer for public site (giveaway-line enforced)"
```

---

## Task 2: Layout, fonts, and design tokens

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `src/components/SiteFooter.tsx`

**Interfaces:**
- Produces: Tailwind utility classes `bg-calcaire`, `bg-calcaire-deep`, `text-encre`, `text-mediterranee`/`bg-mediterranee`, `text-pin`, `border-sable`, `text-statut-vert`/`orange`/`rouge`/`inconnu` — consumed by every component task (3–9) and both page tasks (5–6).
- Produces: CSS custom properties `--font-display` (Bricolage Grotesque), `--font-body` (Public Sans), `--font-mono` (IBM Plex Mono) usable as `font-display`/`font-body`/`font-mono` Tailwind utilities — consumed by every component task.
- Produces: `<SiteFooter />` component, consumed by this task's own `layout.tsx` only.

- [ ] **Step 1: Rewrite `app/globals.css` with the design token table**

```css
@import "tailwindcss";

:root {
  --calcaire: #FAF7F0;
  --calcaire-deep: #F1EBDE;
  --encre: #1C2B33;
  --mediterranee: #0F4C5C;
  --pin: #4A6B4D;
  --sable: #B8A98C;

  --statut-vert: #2E7D46;
  --statut-orange: #C77419;
  --statut-rouge: #B3362B;
  --statut-inconnu: #6B7280;
}

@theme inline {
  --color-calcaire: var(--calcaire);
  --color-calcaire-deep: var(--calcaire-deep);
  --color-encre: var(--encre);
  --color-mediterranee: var(--mediterranee);
  --color-pin: var(--pin);
  --color-sable: var(--sable);

  --color-statut-vert: var(--statut-vert);
  --color-statut-orange: var(--statut-orange);
  --color-statut-rouge: var(--statut-rouge);
  --color-statut-inconnu: var(--statut-inconnu);

  --font-display: var(--font-bricolage-grotesque);
  --font-body: var(--font-public-sans);
  --font-mono: var(--font-ibm-plex-mono);
}

body {
  background: var(--calcaire);
  color: var(--encre);
  font-family: var(--font-body), sans-serif;
}
```

- [ ] **Step 2: Write `src/components/SiteFooter.tsx`**

```tsx
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-sable/40 py-8 text-sm text-encre/70">
      <div className="mx-auto max-w-[1040px] px-4">
        <p>
          Ce site est tenu par une seule personne, sur le terrain. Les
          informations affichées viennent de sources officielles ou d&apos;une
          vérification directe — quand on ne sait pas, on le dit.
        </p>
        <p className="mt-2">
          <Link href="/places" className="text-mediterranee underline">
            Voir tous les lieux
          </Link>
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Rewrite `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { SiteFooter } from "@/src/components/SiteFooter";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage-grotesque",
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Nature Concierge",
  description:
    "Le guide local qui vous dit où aller en nature entre Marseille et Bandol — et où ne pas aller.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${bricolageGrotesque.variable} ${publicSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-calcaire text-encre">
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
```

Note: `@/src/components/SiteFooter` uses the existing `@/*` → `./*` path alias from `tsconfig.json`.

- [ ] **Step 4: Delete unused default assets referenced by the old boilerplate**

The existing `app/page.tsx` still imports `/next.svg` and `/vercel.svg` from `public/` — leave `app/page.tsx` untouched in this task (it's still the placeholder root page; landing is a separate future step), so these stay referenced and no `public/` cleanup is needed here.

- [ ] **Step 5: Verify the app builds**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

Run: `pnpm build`
Expected: build succeeds (existing `app/page.tsx` still renders fine standalone; no route added yet in this task).

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/globals.css src/components/SiteFooter.tsx
git commit -m "Rebuild root layout with project fonts and design tokens"
```

---

## Task 3: `StatusBlock`, `StatusChip`, `Dateline`

**Files:**
- Create: `src/components/Dateline.tsx`
- Create: `src/components/StatusChip.tsx`
- Create: `src/components/StatusBlock.tsx`

**Interfaces:**
- Consumes: `StatusLog | null` type from `src/corpus/queries.ts` (Task 1). Tailwind tokens from Task 2.
- Produces: `<Dateline checkedAt={Date} />`, consumed by `StatusBlock` (this task) and reusable later.
- Produces: `<StatusChip value={string} />` — maps a normalized status value (`vert`/`orange`/`rouge`/`rouge-extreme`/unset) to color+icon+label. Consumed by `PlaceCard` (Task 5).
- Produces: `<StatusBlock statusLog={StatusLog | null} officialInfoUrl={string | null} />`. Consumed by Task 6 (`/places/[slug]`).

- [ ] **Step 1: Write `src/components/Dateline.tsx`**

```tsx
function formatDateline(date: Date): string {
  const datePart = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `Vérifié le ${datePart} à ${timePart}`;
}

export function Dateline({ checkedAt }: { checkedAt: Date }) {
  return (
    <span className="font-mono text-[0.875rem] text-encre/70">
      {formatDateline(checkedAt)}
    </span>
  );
}
```

- [ ] **Step 2: Write `src/components/StatusChip.tsx`**

```tsx
type StatusValue = "vert" | "jaune" | "orange" | "rouge" | "rouge-extreme" | null;

const STATUS_META: Record<
  NonNullable<StatusValue>,
  { label: string; colorClass: string }
> = {
  vert: { label: "Accès autorisé", colorClass: "text-statut-vert" },
  jaune: { label: "Restrictions légères", colorClass: "text-statut-orange" },
  orange: { label: "Restrictions", colorClass: "text-statut-orange" },
  rouge: { label: "Accès restreint", colorClass: "text-statut-rouge" },
  "rouge-extreme": { label: "Accès interdit", colorClass: "text-statut-rouge" },
};

export function StatusChip({ value }: { value: StatusValue }) {
  if (!value) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-statut-inconnu">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full border border-dashed border-statut-inconnu" />
        Non vérifié
      </span>
    );
  }

  const meta = STATUS_META[value];

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${meta.colorClass}`}>
      <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
```

- [ ] **Step 3: Write `src/components/StatusBlock.tsx`**

```tsx
import { Dateline } from "./Dateline";
import type { StatusLog } from "../../prisma/generated/client";

export function StatusBlock({
  statusLog,
  officialInfoUrl,
}: {
  statusLog: StatusLog | null;
  officialInfoUrl: string | null;
}) {
  if (!statusLog) {
    return (
      <section
        aria-label="Statut du jour"
        className="rounded-[10px] border border-dashed border-statut-inconnu bg-calcaire-deep p-4"
      >
        <p className="font-mono text-statut-inconnu">
          Données non vérifiées aujourd&apos;hui — consultez la carte
          officielle{" "}
          {officialInfoUrl && (
            <a href={officialInfoUrl} className="underline">
              ↗
            </a>
          )}
        </p>
      </section>
    );
  }

  const isRed = statusLog.value === "rouge" || statusLog.value === "rouge-extreme";
  const isOrange = statusLog.value === "orange" || statusLog.value === "jaune";
  const colorClass = isRed
    ? "border-statut-rouge text-statut-rouge"
    : isOrange
      ? "border-statut-orange text-statut-orange"
      : "border-statut-vert text-statut-vert";

  return (
    <section
      aria-label="Statut du jour"
      className={`rounded-[10px] border-l-2 bg-calcaire-deep p-4 ${colorClass}`}
    >
      <p className="font-mono uppercase">
        ● {statusLog.value} {statusLog.detail ? `— ${statusLog.detail}` : ""}
      </p>
      <hr className="my-3 border-sable/40" />
      <p>
        <Dateline checkedAt={statusLog.checkedAt} />
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Dateline.tsx src/components/StatusChip.tsx src/components/StatusBlock.tsx
git commit -m "Add StatusBlock, StatusChip, Dateline components"
```

---

## Task 4: `ClaimList`, `ClaimItem`, `WhatsAppCTA`, `AlternativeCallout`

**Files:**
- Create: `src/components/ClaimItem.tsx`
- Create: `src/components/ClaimList.tsx`
- Create: `src/components/WhatsAppCTA.tsx`
- Create: `src/components/AlternativeCallout.tsx`

**Interfaces:**
- Consumes: `Claim` type from `prisma/generated/client`. Tailwind tokens from Task 2.
- Produces: `<ClaimList claims={Claim[]} />`, consumed by Task 6.
- Produces: `<WhatsAppCTA placeName={string} />`, consumed by Task 6.
- Produces: `<AlternativeCallout claims={Claim[]} />` — filters internally for `verdict === "ALTERNATIVE"` claims and renders nothing if none exist. Consumed by Task 6.

- [ ] **Step 1: Write `src/components/ClaimItem.tsx`**

```tsx
import type { Claim } from "../../prisma/generated/client";

const THEME_LABELS: Record<Claim["claimType"], string> = {
  ACCESS: "Accès",
  CROWDING: "Affluence",
  SUITABILITY: "Pour qui",
  TIP: "Astuce",
  AVOID: "À éviter",
  ALTERNATIVE: "Alternative",
  DECODING: "Décryptage",
};

export function ClaimItem({ claim }: { claim: Claim }) {
  return (
    <p className="text-base leading-relaxed">
      <span className="mr-2 rounded-full bg-pin/10 px-2 py-0.5 text-xs font-medium text-pin">
        {THEME_LABELS[claim.claimType]}
      </span>
      {claim.claimText}
    </p>
  );
}
```

- [ ] **Step 2: Write `src/components/ClaimList.tsx`**

```tsx
import { ClaimItem } from "./ClaimItem";
import type { Claim } from "../../prisma/generated/client";

export function ClaimList({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) return null;

  return (
    <section aria-label="Le conseil du guide" className="flex flex-col gap-3">
      <h2 className="font-display text-2xl">Le conseil du guide</h2>
      {claims.map((claim) => (
        <ClaimItem key={claim.id} claim={claim} />
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Write `src/components/WhatsAppCTA.tsx`**

```tsx
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export function WhatsAppCTA({ placeName }: { placeName: string }) {
  const message = `Bonjour ! Je cherche une idée de sortie nature. À propos de ${placeName} : `;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  // TODO(07-measurement): fire whatsapp_click { slug } analytics event on click.

  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white sm:w-auto"
    >
      Besoin d&apos;un plan sur mesure ? Écrivez-moi sur WhatsApp — gratuit
    </a>
  );
}
```

- [ ] **Step 4: Write `src/components/AlternativeCallout.tsx`**

```tsx
import Link from "next/link";
import type { Claim, Place } from "../../prisma/generated/client";

export function AlternativeCallout({
  claims,
}: {
  claims: (Claim & { alternativePlace: Pick<Place, "slug" | "name"> | null })[];
}) {
  const alternatives = claims.filter(
    (c) => c.verdict === "ALTERNATIVE" && c.alternativePlace,
  );

  if (alternatives.length === 0) return null;

  return (
    <section aria-label="Alternatives" className="flex flex-col gap-2">
      {alternatives.map((claim) => (
        <p key={claim.id}>
          Si c&apos;est fermé ou saturé →{" "}
          <Link
            href={`/places/${claim.alternativePlace!.slug}`}
            className="text-mediterranee underline"
          >
            {claim.alternativePlace!.name}
          </Link>
        </p>
      ))}
    </section>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ClaimItem.tsx src/components/ClaimList.tsx src/components/WhatsAppCTA.tsx src/components/AlternativeCallout.tsx
git commit -m "Add ClaimList, WhatsAppCTA, AlternativeCallout components"
```

---

## Task 5: `PlaceCard` and `/places` index page

**Files:**
- Create: `src/components/PlaceCard.tsx`
- Create: `app/places/page.tsx`

**Interfaces:**
- Consumes: `getActivePlaces()` from `src/corpus/queries.ts` (Task 1), `StatusChip` (Task 3).
- Produces: the `/places` route.

- [ ] **Step 1: Write `src/components/PlaceCard.tsx`**

```tsx
import Link from "next/link";
import { StatusChip } from "./StatusChip";
import type { Place } from "../../prisma/generated/client";

const TYPE_LABELS: Record<Place["type"], string> = {
  CALANQUE: "Calanque",
  PLAGE: "Plage",
  MASSIF: "Massif",
  SENTIER: "Sentier",
  SOMMET: "Sommet",
  SITE: "Site",
};

export function PlaceCard({ place }: { place: Place }) {
  return (
    <Link
      href={`/places/${place.slug}`}
      className="block rounded-[10px] border border-sable/40 bg-calcaire-deep p-4 transition-colors duration-150 hover:border-mediterranee focus-visible:outline-2 focus-visible:outline-mediterranee"
    >
      <h2 className="font-display text-xl">{place.name}</h2>
      <p className="text-sm text-encre/70">
        {place.commune} · {TYPE_LABELS[place.type]}
      </p>
      <div className="mt-2">
        <StatusChip value={null} />
      </div>
    </Link>
  );
}
```

Note: `StatusChip` receives `null` here (unverified) rather than a real per-card status lookup — the index page does not fetch per-place `StatusLog` rows in this plan (that would require N status queries per page render, out of scope; `03-public-site.md`'s "today's status chip" on the index is deferred to a later pass once `04-signal-ops.md` data exists and a batched query can be designed). This is a known, intentional simplification, not a bug — flagged explicitly here so it's not mistaken for an oversight.

- [ ] **Step 2: Write `app/places/page.tsx`**

```tsx
import type { Metadata } from "next";
import { getActivePlaces } from "@/src/corpus/queries";
import { PlaceCard } from "@/src/components/PlaceCard";

export const metadata: Metadata = {
  title: "Les lieux — Nature Concierge",
  description:
    "Calanques, plages, massifs et sentiers entre Marseille et Bandol, avec leur statut du jour.",
};

export default async function PlacesIndexPage() {
  const places = await getActivePlaces();

  return (
    <main className="mx-auto flex max-w-[1040px] flex-col gap-6 px-4 py-12">
      <p className="text-sm text-encre/70">
        Couverture actuelle : littoral Marseille–Bandol et Sainte-Baume.
        D&apos;autres lieux arrivent.
      </p>
      <h1 className="font-display text-3xl">Les lieux</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify the route builds and renders**

Run: `pnpm build`
Expected: build succeeds; `/places` listed in the route output.

Run: `pnpm dev` (in background or separate terminal), then check `curl -s http://localhost:3000/places | grep -o "Port d.Alon"` after the server is up.
Expected: output contains the place name (proves the query + render works against Neon with the seeded Port d'Alon).

- [ ] **Step 4: Commit**

```bash
git add src/components/PlaceCard.tsx app/places/page.tsx
git commit -m "Add /places index page"
```

---

## Task 6: `/places/[slug]` detail page

**Files:**
- Create: `app/places/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getActivePlaces`, `getPlaceBySlug`, `getTodayStatus` (Task 1); `StatusBlock` (Task 3); `ClaimList`, `WhatsAppCTA`, `AlternativeCallout` (Task 4).
- Produces: the `/places/[slug]` route, statically generated with ISR.

- [ ] **Step 1: Write `app/places/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getActivePlaces,
  getPlaceBySlug,
  getTodayStatus,
} from "@/src/corpus/queries";
import { StatusBlock } from "@/src/components/StatusBlock";
import { ClaimList } from "@/src/components/ClaimList";
import { WhatsAppCTA } from "@/src/components/WhatsAppCTA";
import { AlternativeCallout } from "@/src/components/AlternativeCallout";

export const revalidate = 900;

export async function generateStaticParams() {
  const places = await getActivePlaces();
  return places.map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return {};

  return {
    title: `${place.name} : ouvert aujourd'hui ? Accès, parking, affluence — ${place.commune}`,
    description:
      place.claims[0]?.claimText ??
      `Statut du jour, accès et conseils pour ${place.name}.`,
  };
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) notFound();

  const statusLog = await getTodayStatus(place.id);

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-8 px-4 py-12">
      <StatusBlock statusLog={statusLog} officialInfoUrl={place.officialInfoUrl} />

      <div>
        <h1 className="font-display text-3xl">{place.name}</h1>
        <p className="text-sm text-encre/70">{place.commune}</p>
        {place.description && <p className="mt-3">{place.description}</p>}
      </div>

      <ClaimList claims={place.claims} />

      <WhatsAppCTA placeName={place.name} />

      <AlternativeCallout claims={place.claims as never} />
    </main>
  );
}
```

Note on `AlternativeCallout claims={place.claims as never}`: `place.claims` from `getPlaceBySlug` does not currently `include` the `alternativePlace` relation, so this cast is a placeholder gap — the implementer must fix this by extending `getPlaceBySlug`'s Prisma `include` to add `alternativePlace: { select: { slug: true, name: true } }` nested under `claims`, updating `PlaceWithPublicClaims` in `src/corpus/queries.ts` (Task 1) accordingly, and removing the `as never` cast here. Do this as part of this task, not as a follow-up — the cast must not ship.

- [ ] **Step 2: Fix the `alternativePlace` include (per the note above)**

In `src/corpus/queries.ts`, update `getPlaceBySlug`:

```ts
export type PlaceWithPublicClaims = Place & {
  claims: (Claim & { alternativePlace: Pick<Place, "slug" | "name"> | null })[];
};

export async function getPlaceBySlug(
  slug: string,
): Promise<PlaceWithPublicClaims | null> {
  return prisma.place.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      claims: {
        where: { isPublic: true, status: "PUBLISHED" },
        include: {
          alternativePlace: { select: { slug: true, name: true } },
        },
      },
    },
  }) as Promise<PlaceWithPublicClaims | null>;
}
```

Then in `app/places/[slug]/page.tsx`, change the last line to:

```tsx
      <AlternativeCallout claims={place.claims} />
```

- [ ] **Step 3: Update `src/corpus/queries.test.ts` for the new include shape**

In the `getPlaceBySlug` test's `toHaveBeenCalledWith` assertion, update the expected `include` to:

```ts
    expect(findFirstPlaceMock).toHaveBeenCalledWith({
      where: { slug: "port-d-alon", status: "ACTIVE" },
      include: {
        claims: {
          where: { isPublic: true, status: "PUBLISHED" },
          include: {
            alternativePlace: { select: { slug: true, name: true } },
          },
        },
      },
    });
```

- [ ] **Step 4: Run the query tests to verify they still pass**

Run: `pnpm exec vitest run src/corpus/queries.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors, and no `as never`/`as any` remaining in `app/places/[slug]/page.tsx`.

- [ ] **Step 6: Verify the route builds and renders against real seeded data**

Run: `pnpm build`
Expected: build succeeds; `/places/port-d-alon` appears in the static route output (confirms `generateStaticParams` picked up the seeded place).

Run: `pnpm dev`, then:
```bash
curl -s http://localhost:3000/places/port-d-alon | grep -o "Données non vérifiées"
```
Expected: match found (no `StatusLog` seeded yet, so the unverified state must render).

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/places/does-not-exist
```
Expected: `404`.

- [ ] **Step 7: Commit**

```bash
git add app/places/[slug]/page.tsx src/corpus/queries.ts src/corpus/queries.test.ts
git commit -m "Add /places/[slug] detail page with ISR"
```

---

## Task 7: Revalidation route handler

**Files:**
- Create: `app/api/revalidate/route.ts`

**Interfaces:**
- Consumes: `REVALIDATE_TOKEN` env var (must be added to `.env.dist`/`.env.local`).
- Produces: `POST /api/revalidate` — the endpoint `04-signal-ops.md`'s future `status:update` script will call. Not wired to anything in this plan.

- [ ] **Step 1: Add `REVALIDATE_TOKEN` to `.env.dist`**

Append a line to `.env.dist`:

```
REVALIDATE_TOKEN=<random-secret-token>
```

- [ ] **Step 2: Add a real value to `.env.local`**

Generate a token and append to `.env.local` (gitignored, do not commit its value):

```bash
echo "REVALIDATE_TOKEN=$(openssl rand -hex 32)" >> .env.local
```

- [ ] **Step 3: Write `app/api/revalidate/route.ts`**

```ts
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

function isValidToken(provided: string | null): boolean {
  const expected = process.env.REVALIDATE_TOKEN;
  if (!expected || !provided) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const slug = body?.slug;

  if (typeof slug !== "string" || slug.length === 0) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  revalidatePath(`/places/${slug}`, "page");

  return NextResponse.json({ revalidated: true, slug });
}
```

- [ ] **Step 4: Verify manually**

Run: `pnpm dev`, then in another terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/revalidate \
  -H "Authorization: Bearer wrong-token" \
  -H "Content-Type: application/json" \
  -d '{"slug":"port-d-alon"}'
```
Expected: `401`.

```bash
TOKEN=$(grep REVALIDATE_TOKEN .env.local | cut -d= -f2)
curl -s -X POST http://localhost:3000/api/revalidate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"port-d-alon"}'
```
Expected: `{"revalidated":true,"slug":"port-d-alon"}` with HTTP 200.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/revalidate/route.ts .env.dist
git commit -m "Add token-secured revalidation route handler"
```

(`.env.local`'s new `REVALIDATE_TOKEN` line is gitignored, not committed.)

---

## Task 8: JSON-LD structured data on the detail page

**Files:**
- Modify: `app/places/[slug]/page.tsx`

**Interfaces:**
- Consumes: `place` data already fetched in Task 6's page component.
- Produces: `<script type="application/ld+json">` in the rendered page, `Place` + `FAQPage` schema per `03-public-site.md`.

- [ ] **Step 1: Add JSON-LD generation to `app/places/[slug]/page.tsx`**

Add above the `return` statement inside `PlaceDetailPage`:

```tsx
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        name: place.name,
        geo: {
          "@type": "GeoCoordinates",
          latitude: place.lat,
          longitude: place.lng,
        },
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: place.commune,
        },
      },
      place.claims.length > 0 && {
        "@type": "FAQPage",
        mainEntity: place.claims.slice(0, 3).map((claim) => ({
          "@type": "Question",
          name: `${claim.claimText.split(".")[0]} ?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: claim.claimText,
          },
        })),
      },
    ].filter(Boolean),
  };
```

Then add this as the first child inside the `<main>` return, before `<StatusBlock ... />`:

```tsx
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
```

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, then:
```bash
curl -s http://localhost:3000/places/port-d-alon | grep -o 'application/ld+json'
```
Expected: match found.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/places/[slug]/page.tsx
git commit -m "Add JSON-LD structured data to place detail page"
```

---

## Self-Review Notes

**Spec coverage check** (against `docs/superpowers/specs/2026-07-22-public-site-design.md`):
- Base layout rebuild (fonts, tokens, no dark mode, `lang="fr"`, `SiteFooter`) → Task 2. ✓
- Query layer with giveaway-line enforcement → Task 1. ✓
- `StatusBlock`, `StatusChip`, `Dateline` → Task 3. ✓
- `ClaimList`, `ClaimItem`, `WhatsAppCTA` (with marked analytics no-op), `AlternativeCallout` → Task 4. ✓
- `PlaceCard`, `/places` index → Task 5. ✓
- `/places/[slug]` detail, fixed section order, ISR + `generateStaticParams`, `notFound()` → Task 6. ✓
- Revalidation route handler, token-secured → Task 7. ✓
- JSON-LD → Task 8. ✓
- Out-of-scope items (landing, `/statut`, sitemap/robots/llms.txt, analytics wiring, StatusLog seeding) → correctly absent from all tasks. ✓

**Known, intentional simplification flagged inline:** Task 5's `PlaceCard` renders `StatusChip` with `null` (unverified) rather than a real per-place status lookup on the index page, since batching that query is a design decision better made once real `StatusLog` data exists (04-signal-ops). Documented in the task itself so it isn't mistaken for an oversight.

**Type consistency check:** `PlaceWithPublicClaims` is defined once in Task 1 and revised once in Task 6 (to add `alternativePlace`) — the revision is explicit and the test file is updated in the same task, not left inconsistent. `StatusChip`'s `StatusValue` type and `StatusBlock`'s raw `statusLog.value` string comparisons are intentionally loose (matching the corpus's `String` field, not a Prisma enum, per `01-data-model.md`'s design) rather than a false type mismatch.
