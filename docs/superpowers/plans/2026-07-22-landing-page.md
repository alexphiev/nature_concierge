# Landing Page + SEO Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mission/conversion page (`/`) per `05-landing.md`'s exact copy and structure, and close out the SEO scaffolding (`sitemap.ts`, `robots.ts`, `llms.txt`) deferred from the public-site build step.

**Architecture:** `app/page.tsx` replaces the `create-next-app` boilerplate with five fixed sections built from existing design tokens/fonts and a new `LandingWhatsAppCTA` component (kept separate from the place-page `WhatsAppCTA` since the two need different copy/templates). `app/sitemap.ts` and `app/robots.ts` are Next.js file-convention routes; `public/llms.txt` is a static file. A new `NEXT_PUBLIC_SITE_URL` env var supplies the absolute origin needed for sitemap URLs.

**Tech Stack:** Next.js 16.2.10 (App Router, `MetadataRoute.Sitemap`/`MetadataRoute.Robots` file conventions), TypeScript, Tailwind v4 (existing tokens), Prisma (existing corpus query layer).

## Global Constraints

- All user-facing copy in French, verbatim from `05-landing.md` — not paraphrased. This spec already wrote the final copy.
- The word "IA" appears nowhere on the landing page (`05-landing.md` copy rule).
- No exclamation inflation, sentence case, plain verbs (`05-landing.md` copy rule).
- WhatsApp CTA is the only filled/solid button on any page (`09-design.md`) — `LandingWhatsAppCTA` uses `bg-mediterranee`, matching the existing place-page `WhatsAppCTA`.
- No real photo of Alexandre exists yet — render a quiet `--calcaire-deep` placeholder panel, never a placeholder stock image (`09-design.md`).
- Analytics event firing is out of scope — `LandingWhatsAppCTA` gets a marked `// TODO(07-measurement)` no-op comment, matching the existing pattern in `src/components/WhatsAppCTA.tsx`.
- Routes are `/`, `/places`, `/places/[slug]` (English route segments, already established — do not reintroduce `/lieux`).
- Explicit non-goals from `05-landing.md`: no email capture, no newsletter, no testimonials section, no pricing section.
- `sitemap.ts`'s `lastmod` per place must reflect `max(claim.updatedAt across that place's public claims, latest StatusLog.checkedAt)` — freshness is the site's ranking story (`03-public-site.md`).

---

## File Structure

```
app/page.tsx                          # rebuilt: the landing page
app/sitemap.ts                        # new: MetadataRoute.Sitemap
app/robots.ts                         # new: MetadataRoute.Robots
public/llms.txt                       # new: static LLM-SEO file
src/components/LandingWhatsAppCTA.tsx # new: landing-specific WhatsApp CTA
src/corpus/queries.ts                 # extended: getPlaceFreshness helper
src/corpus/queries.test.ts            # extended: tests for the new helper
.env.dist                             # extended: NEXT_PUBLIC_SITE_URL
```

Rationale: `LandingWhatsAppCTA` stays a separate file from `WhatsAppCTA.tsx` rather than a branching prop, keeping each component's copy/template simple and independently readable — matches the design doc's explicit reasoning. The new query helper lives in the existing `src/corpus/queries.ts` alongside the other public-query functions, keeping the DB access chokepoint singular (this was confirmed as an architectural strength in the prior plan's final review).

---

## Task 1: `getPlaceFreshness` query helper

**Files:**
- Modify: `src/corpus/queries.ts`
- Modify: `src/corpus/queries.test.ts`

**Interfaces:**
- Consumes: `prisma` from `src/corpus/db.ts` (existing).
- Produces: `getPlaceFreshness(placeId: string): Promise<Date>` — returns the most recent of (latest public+published claim's `updatedAt`, latest `StatusLog.checkedAt` for that place), or the place's own `updatedAt` if neither exists. Consumed by Task 4 (`app/sitemap.ts`).

This task has no UI dependency — build and test it standalone, following the existing TDD pattern in this file.

- [ ] **Step 1: Write the failing tests**

Append to `src/corpus/queries.test.ts` (the file already has `vi.hoisted()` mocks for `prisma.place.findMany`/`findFirst` and `prisma.statusLog.findFirst` — reuse the existing hoisted mock object, adding a `claim.findFirst` mock and a `statusLog.findFirst` mock call for this new function):

```ts
describe("getPlaceFreshness", () => {
  it("returns the most recent of latest claim.updatedAt and latest StatusLog.checkedAt", async () => {
    findFirstClaimMock.mockResolvedValue({
      updatedAt: new Date("2026-07-20T10:00:00Z"),
    });
    findFirstStatusLogMock.mockResolvedValue({
      checkedAt: new Date("2026-07-21T18:00:00Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(findFirstClaimMock).toHaveBeenCalledWith({
      where: { placeId: "place-id-1", isPublic: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    expect(result).toEqual(new Date("2026-07-21T18:00:00Z"));
  });

  it("returns the claim date when it is more recent than the status log date", async () => {
    findFirstClaimMock.mockResolvedValue({
      updatedAt: new Date("2026-07-21T10:00:00Z"),
    });
    findFirstStatusLogMock.mockResolvedValue({
      checkedAt: new Date("2026-07-19T18:00:00Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(result).toEqual(new Date("2026-07-21T10:00:00Z"));
  });

  it("falls back to the place's own updatedAt when no claims or status logs exist", async () => {
    findFirstClaimMock.mockResolvedValue(null);
    findFirstStatusLogMock.mockResolvedValue(null);
    findFirstPlaceMock.mockResolvedValue({
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(findFirstPlaceMock).toHaveBeenCalledWith({
      where: { id: "place-id-1" },
      select: { updatedAt: true },
    });
    expect(result).toEqual(new Date("2026-07-01T00:00:00Z"));
  });
});
```

Also add the new `findFirstClaimMock` to the file's `vi.hoisted()` block and `vi.mock("./db", ...)` setup, and reset it in `beforeEach`. Find the existing hoisted block at the top of `src/corpus/queries.test.ts` — it currently looks like:

```ts
const { findManyPlaceMock, findFirstPlaceMock, findFirstStatusLogMock } =
  vi.hoisted(() => ({
    findManyPlaceMock: vi.fn(),
    findFirstPlaceMock: vi.fn(),
    findFirstStatusLogMock: vi.fn(),
  }));

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
```

Change it to:

```ts
const {
  findManyPlaceMock,
  findFirstPlaceMock,
  findFirstStatusLogMock,
  findFirstClaimMock,
} = vi.hoisted(() => ({
  findManyPlaceMock: vi.fn(),
  findFirstPlaceMock: vi.fn(),
  findFirstStatusLogMock: vi.fn(),
  findFirstClaimMock: vi.fn(),
}));

vi.mock("./db", () => ({
  prisma: {
    place: {
      findMany: findManyPlaceMock,
      findFirst: findFirstPlaceMock,
    },
    statusLog: {
      findFirst: findFirstStatusLogMock,
    },
    claim: {
      findFirst: findFirstClaimMock,
    },
  },
}));
```

And in the file's `beforeEach`, add `findFirstClaimMock.mockReset();` alongside the existing resets.

Also add `getPlaceFreshness` to the existing top-level import line:

```ts
import {
  getActivePlaces,
  getPlaceBySlug,
  getTodayStatus,
  getPlaceFreshness,
} from "./queries";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/corpus/queries.test.ts`
Expected: FAIL — `getPlaceFreshness is not a function` (3 new failures; existing tests still pass).

- [ ] **Step 3: Implement `getPlaceFreshness`**

Append to `src/corpus/queries.ts`:

```ts
export async function getPlaceFreshness(placeId: string): Promise<Date> {
  const [latestClaim, latestStatusLog] = await Promise.all([
    prisma.claim.findFirst({
      where: { placeId, isPublic: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.statusLog.findFirst({
      where: { placeId },
      orderBy: { checkedAt: "desc" },
      select: { checkedAt: true },
    }),
  ]);

  const candidates = [latestClaim?.updatedAt, latestStatusLog?.checkedAt].filter(
    (d): d is Date => d !== undefined,
  );

  if (candidates.length > 0) {
    return candidates.reduce((latest, d) => (d > latest ? d : latest));
  }

  const place = await prisma.place.findFirst({
    where: { id: placeId },
    select: { updatedAt: true },
  });

  return place?.updatedAt ?? new Date();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/corpus/queries.test.ts`
Expected: PASS (all tests, including the 3 new ones).

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/corpus/queries.ts src/corpus/queries.test.ts
git commit -m "Add getPlaceFreshness query helper for sitemap lastmod"
```

---

## Task 2: `NEXT_PUBLIC_SITE_URL` env var

**Files:**
- Modify: `.env.dist`

**Interfaces:**
- Produces: `process.env.NEXT_PUBLIC_SITE_URL`, consumed by Task 4 (`app/sitemap.ts`) and Task 5 (`app/robots.ts`) for absolute URL construction.

No real domain is chosen yet (`08-infra.md` is out of scope, deferred to manual infra work) — this env var defaults to `http://localhost:3000` for local dev and must be set to the real domain at deploy time.

- [ ] **Step 1: Add to `.env.dist`**

Append a line:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 2: Add the same value to `.env.local`**

Run:
```bash
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" >> .env.local
```

- [ ] **Step 3: Commit**

```bash
git add .env.dist
git commit -m "Add NEXT_PUBLIC_SITE_URL env var for absolute sitemap URLs"
```

(`.env.local`'s new line is gitignored, not committed.)

---

## Task 3: `LandingWhatsAppCTA` component

**Files:**
- Create: `src/components/LandingWhatsAppCTA.tsx`

**Interfaces:**
- Produces: `<LandingWhatsAppCTA />` (no props — the message is a fixed template, unlike the place-page `WhatsAppCTA` which takes `placeName`). Consumed by Task 7 (`app/page.tsx`), twice (hero + final CTA).

- [ ] **Step 1: Write `src/components/LandingWhatsAppCTA.tsx`**

```tsx
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

if (!WHATSAPP_NUMBER) {
  console.warn(
    "LandingWhatsAppCTA: NEXT_PUBLIC_WHATSAPP_NUMBER is not set — the WhatsApp link will be broken.",
  );
}

export function LandingWhatsAppCTA() {
  const message = `Bonjour ! Je cherche une idée de sortie nature.
Quand : … / Qui : … (enfants, chien, mobilité…) / Où en gros : … /
Contraintes : … (météo, marche, parking…)`;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  // TODO(07-measurement): fire whatsapp_click { source: "landing" } analytics event on click.

  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white sm:w-auto"
    >
      Demander un plan sur WhatsApp
    </a>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingWhatsAppCTA.tsx
git commit -m "Add LandingWhatsAppCTA component"
```

---

## Task 4: `app/sitemap.ts`

**Files:**
- Create: `app/sitemap.ts`

**Interfaces:**
- Consumes: `getActivePlaces` (existing), `getPlaceFreshness` (Task 1), `NEXT_PUBLIC_SITE_URL` (Task 2).
- Produces: the `/sitemap.xml` route.

- [ ] **Step 1: Write `app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";
import { getActivePlaces, getPlaceFreshness } from "@/src/corpus/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const places = await getActivePlaces();

  const placeEntries = await Promise.all(
    places.map(async (place) => ({
      url: `${SITE_URL}/places/${place.slug}`,
      lastModified: await getPlaceFreshness(place.id),
    })),
  );

  return [
    { url: SITE_URL, lastModified: new Date() },
    { url: `${SITE_URL}/places`, lastModified: new Date() },
    ...placeEntries,
  ];
}
```

- [ ] **Step 2: Verify it builds and renders**

Run: `pnpm build`
Expected: build succeeds; `/sitemap.xml` route present in output.

Run: `pnpm dev`, then:
```bash
curl -s http://localhost:3000/sitemap.xml | grep -o "port-d-alon"
```
Expected: match found (confirms the seeded place appears in the sitemap).

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/sitemap.ts
git commit -m "Add sitemap.ts with per-place freshness lastmod"
```

---

## Task 5: `app/robots.ts`

**Files:**
- Create: `app/robots.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SITE_URL` (Task 2).
- Produces: the `/robots.txt` route.

- [ ] **Step 1: Write `app/robots.ts`**

```ts
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 2: Verify it builds and renders**

Run: `pnpm build`
Expected: build succeeds; `/robots.txt` route present in output.

Run: `pnpm dev`, then:
```bash
curl -s http://localhost:3000/robots.txt
```
Expected: output contains `User-Agent: *`, `Allow: /`, and a `Sitemap:` line pointing at `/sitemap.xml`.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/robots.ts
git commit -m "Add robots.ts"
```

---

## Task 6: `public/llms.txt`

**Files:**
- Create: `public/llms.txt`

**Interfaces:**
- Produces: static file served at `/llms.txt`.

- [ ] **Step 1: Write `public/llms.txt`**

```
# Nature Concierge

## Mission

Le guide local pour la nature entre Marseille et Bandol : structurellement
neutre, inter-communes, opinionated, et attentif aux conditions du jour.
Chaque lieu a sa propre page avec un statut du jour (accès incendie, qualité
de l'eau) et des conseils vérifiés sur le terrain — pas un résumé du web.

## Territoire couvert

Littoral entre Marseille et Bandol, ouest Var, et le massif de la
Sainte-Baume.

## Pages

- / — présentation de la mission
- /places — liste des lieux couverts
- /places/{slug} — une page par lieu : statut du jour, accès, conseils

## Mise à jour

Les statuts (accès incendie, qualité de l'eau) sont vérifiés et mis à jour
chaque jour, généralement en fin d'après-midi.

## Contact

Pour une recommandation personnalisée, écrire via WhatsApp — le lien est sur
la page d'accueil (/).
```

- [ ] **Step 2: Verify it's served**

Run: `pnpm dev`, then:
```bash
curl -s http://localhost:3000/llms.txt | head -3
```
Expected: output starts with `# Nature Concierge`.

- [ ] **Step 3: Commit**

```bash
git add public/llms.txt
git commit -m "Add llms.txt for LLM-assistant citability"
```

---

## Task 7: Landing page (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `LandingWhatsAppCTA` (Task 3), `SiteFooter` (existing, from the prior plan).
- Produces: the `/` route content.

This is the last task — everything else (fonts, tokens, footer, CTA component) already exists.

- [ ] **Step 1: Rewrite `app/page.tsx`**

```tsx
import Link from "next/link";
import { LandingWhatsAppCTA } from "@/src/components/LandingWhatsAppCTA";

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-16 px-4 py-16">
      <section className="flex flex-col items-start gap-6">
        <h1 className="font-display text-3xl">
          Le guide local qui vous dit où aller. Et où ne pas aller.
        </h1>
        <p className="text-lg">
          Sorties nature entre Marseille et Bandol, conseillées comme le
          ferait un très bon guide du coin : selon la météo, le monde, les
          fermetures du jour — et selon vous. Gratuit, réponse en quelques
          heures.
        </p>
        <LandingWhatsAppCTA />
        <Link href="/places" className="text-mediterranee underline">
          Voir les lieux couverts
        </Link>
      </section>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="font-display text-2xl">
            Personne ne centralise l&apos;essentiel.
          </h2>
          <p className="mt-2">
            Fermetures incendie, qualité de l&apos;eau, saturation des
            parkings : ces infos existent, éparpillées entre préfectures,
            mairies et applis par site. On les rassemble, chaque jour.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl">
            Un office de tourisme défend sa commune.
          </h2>
          <p className="mt-2">
            Nous, on vous défend vous. Si Cassis sature, on vous envoie
            ailleurs — un OT ne peut pas faire ça.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl">
            Des conseils qu&apos;aucune IA générique ne connaît.
          </h2>
          <p className="mt-2">
            Nos réponses viennent d&apos;un carnet de terrain vérifié : où se
            garer vraiment, à quelle heure ça bascule, quoi éviter avec une
            poussette. Pas de résumés du web.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Comment ça marche</h2>
        <p>Écrivez-nous (qui, quand, contraintes)</p>
        <p>On prépare votre sortie sur mesure, avec plan B</p>
        <p>Vous y allez ; dites-nous si c&apos;était juste, ça aide le suivant.</p>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="h-16 w-16 shrink-0 rounded-full bg-calcaire-deep"
          />
          <p>
            Je m&apos;appelle Alexandre, développeur et habitant de La
            Ciotat.
          </p>
        </div>
        <p>
          Sources officielles liées, date de vérification affichée partout,
          quand on ne sait pas, on le dit.
        </p>
        <p>Gratuit, pas de compte, prénom suffit.</p>
      </section>

      <section className="flex flex-col items-start gap-4">
        <LandingWhatsAppCTA />
      </section>
    </main>
  );
}
```

Note: the existing `SiteFooter` is already rendered globally by `app/layout.tsx` (confirmed in the prior plan's Task 2) — do not add a second footer here.

- [ ] **Step 2: Remove now-unused boilerplate assets (if nothing else references them)**

Check whether `/next.svg` and `/vercel.svg` in `public/` are referenced anywhere else:

```bash
grep -rn "next.svg\|vercel.svg" app/ src/
```

Expected: no matches (the old `app/page.tsx` was the only consumer, and it's just been replaced). If confirmed unused, delete them:

```bash
rm public/next.svg public/vercel.svg
```

If the grep finds any other reference, skip this step and leave the files — do not delete something still in use.

- [ ] **Step 3: Verify the page renders correctly**

Run: `pnpm build`
Expected: build succeeds; `/` listed as a static route.

Run: `pnpm dev`, then:
```bash
curl -s http://localhost:3000/ | grep -o "Le guide local qui vous dit où aller"
```
Expected: match found.

```bash
curl -s http://localhost:3000/ | grep -c "wa.me"
```
Expected: `2` (hero CTA + final CTA, both `LandingWhatsAppCTA` instances).

```bash
curl -s http://localhost:3000/ | grep -o "IA générique"
```
Expected: match found (confirms the "IA générique" phrase is present — this is the ONLY place "IA" may appear, as part of "IA générique," contrasting with the site's own approach; verify no OTHER instance of the bare word "IA" appears standalone).

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "Add landing page content"
```

(If Step 2 deleted the SVG files, include them: `git add -u public/`.)

---

## Self-Review Notes

**Spec coverage check** (against `docs/superpowers/specs/2026-07-22-landing-page-design.md`):
- `getPlaceFreshness` query helper → Task 1. ✓
- `NEXT_PUBLIC_SITE_URL` env var → Task 2. ✓
- `LandingWhatsAppCTA` (separate component, marked analytics no-op) → Task 3. ✓
- `app/sitemap.ts` (ACTIVE places + landing + index, per-place lastmod) → Task 4. ✓
- `app/robots.ts` → Task 5. ✓
- `public/llms.txt` → Task 6. ✓
- Landing page (5 sections, fixed order, verbatim copy, placeholder photo panel, `/places` link) → Task 7. ✓
- Out-of-scope items (real analytics, `/statut`, real photo) → correctly absent from all tasks. ✓

**Type consistency check:** `getPlaceFreshness` is defined once in Task 1 and consumed unchanged in Task 4 — no cross-task signature drift. `LandingWhatsAppCTA` takes no props (unlike `WhatsAppCTA`'s `placeName`), consistent between its Task 3 definition and Task 7 usage (`<LandingWhatsAppCTA />`, no props passed).

**Placeholder scan:** No TBDs. The one visual placeholder (Alexandre's photo → a plain `bg-calcaire-deep` circle) is an explicit, spec-justified design decision (`09-design.md`'s "never a placeholder stock image" rule), not an unfinished implementation gap — the circle IS the final MVP-scope design, not a stand-in for code that should exist but doesn't.
