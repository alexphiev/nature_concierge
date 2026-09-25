# Static place pages + SEO / AI-SEO — Implementation Plan

Spec: `spec/03-public-site.md` (rendering strategy, Web SEO, LLM SEO sections). This plan supersedes its "choose ISR first" line: the owner asked for a static shell with only live data (fire status) rendered at request time, and French routes `/lieux/[slug]` as the spec's route table already says.

**Goal:** every place page is a prerendered static shell (CDN-fast, full guide content in HTML) with only the daily status streamed at request time, invalidated instantly when the owner publishes corpus changes; plus metadata, JSON-LD, dynamic `llms.txt`, nearby-place links and per-place OG images.

## Global Constraints

- Next.js **16.2.10** with breaking changes vs training data. Before writing Next code, read the relevant guide under `node_modules/next/dist/docs/` (caching: `01-app/01-getting-started/08-caching.md`, `09-revalidating.md`, `01-app/02-guides/migrating-to-cache-components.md`; metadata: `01-app/03-api-reference/03-file-conventions/01-metadata/`, `04-functions/generate-metadata.md`).
- All user-facing copy in **French**.
- Status must **never** be served from a stale/cached render and must never default to green. The status-loading fallback must be neutral (e.g. "Statut du jour…"), never "Non vérifié" and never a verdict.
- Status must still be in server HTML (streamed in the same response via `<Suspense>`), never fetched client-side by JS.
- Territory timezone is **Europe/Paris**. `@db.Date` comparisons must use a UTC-midnight `Date` built from a `yyyy-mm-dd` string (`new Date(\`${ymd}T00:00:00.000Z\`)`), never `setHours(0,0,0,0)`.
- Public queries keep the giveaway rule: claims filtered `isPublic = true AND status = PUBLISHED`.
- Single cache tag for all corpus data: `"corpus"`. Admin mutations that change public content call `updateTag("corpus")` (server actions); the `/api/revalidate` route handler calls `revalidateTag("corpus", "max")`.
- Site origin: `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`, exported once as `SITE_URL` from `src/site.ts` (created in Task 4; Tasks before that keep their local constant).
- Code style: match surrounding code; comments only for non-obvious logic; no speculative abstractions.
- Tests: `pnpm test` (vitest, Prisma mocked via `vi.mock("./db")` pattern as in `src/corpus/queries.test.ts`). Lint: `pnpm lint`. Typecheck: `pnpm exec tsc --noEmit`. Build: `pnpm build` (needs `.env.local`, present; hits the real DB).
- No browser/Playwright testing. Verify via build output, tests, and `curl` against `pnpm start` where useful.
- Commit per task with a conventional message ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Europe/Paris "today" for status + Paris-time datelines

**Why:** `resolvePlaceStatus` and `getTodayStatusCounts` compute "today" with `new Date(new Date().setHours(0,0,0,0))` in server TZ (UTC on Vercel). Between 00:00 and 02:00 Paris time they read yesterday's row. `Dateline` and `LiveProofLine` format times in server TZ (UTC), so "18h12" shows "16h12".

**Files:**
- Create `src/corpus/paris-date.ts` + `src/corpus/paris-date.test.ts`
- Modify `src/corpus/queries.ts` (two `forDate` computations; update the comment block in `resolvePlaceStatus` only if it references the old computation)
- Modify `src/components/Dateline.tsx`, `src/components/LiveProofLine.tsx` — add `timeZone: "Europe/Paris"` to every `Intl.DateTimeFormat`
- Modify `app/admin/statut/page.tsx` line ~85 (`today.setHours(0,0,0,0)`) to use the helper if it is computing the Paris calendar day (read the surrounding code first; keep behaviour otherwise identical)

**Spec:**
```ts
// src/corpus/paris-date.ts
// Returns the Europe/Paris calendar date of `now` as "yyyy-mm-dd".
export function parisDateString(now: Date = new Date()): string
// UTC-midnight Date for the Paris calendar day — the only form that matches @db.Date columns.
export function parisToday(now: Date = new Date()): Date
```
Implement `parisDateString` with `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" })` (en-CA yields `yyyy-mm-dd`).

**Tests (write first, see them fail):**
- `parisDateString(new Date("2026-07-21T22:30:00Z"))` → `"2026-07-22"` (00:30 Paris, CEST)
- `parisDateString(new Date("2026-07-21T21:59:00Z"))` → `"2026-07-21"`
- `parisDateString(new Date("2026-01-15T23:30:00Z"))` → `"2026-01-16"` (CET, UTC+1)
- `parisToday(new Date("2026-07-21T22:30:00Z")).toISOString()` → `"2026-07-22T00:00:00.000Z"`
- In `queries.test.ts`, add a test that `resolvePlaceStatus` queries `statusLog.findFirst` with `forDate` equal to `parisToday()` (use `vi.useFakeTimers()` + `vi.setSystemTime(new Date("2026-07-21T22:30:00Z"))` and assert `forDate` is `2026-07-22T00:00:00.000Z`). Adjust existing tests that asserted the old local-midnight value.

**Verify:** `pnpm test`, `pnpm exec tsc --noEmit`. Commit.

---

### Task 2: Rename public routes `/places` → `/lieux` with permanent redirects

**Files:**
- `git mv "app/(public)/places" "app/(public)/lieux"`
- `git mv app/places app/lieux` (the `[slug]/photo` route handler + its test)
- Every public link/path string pointing to the public place routes: `src/components/*` (`PlaceCard`, `SpotCard`, `PlaceGallery`, `PhotoCarousel`, `AlternativeCallout`, `SiteFooter`, … — grep `"/places` and `` `/places ``), `app/(public)/page.tsx`, `app/(public)/lieux/**`, `app/sitemap.ts`, `app/admin/statut/actions.ts` (`revalidatePath`), `app/api/revalidate/route.ts`, `public/llms.txt`, tests asserting URLs.
- **Do not touch** admin routes `/admin/places/**` or links to them (e.g. in `AdminNav`, admin pages). Grep carefully: only paths that begin with `/places` (public), not `/admin/places`.
- `next.config.ts`: add
  ```ts
  async redirects() {
    return [
      { source: "/places", destination: "/lieux", permanent: true },
      { source: "/places/:path*", destination: "/lieux/:path*", permanent: true },
    ];
  },
  ```
- Admin pages that link to the public page of a place (e.g. "voir la page") must point to `/lieux/...`.

**Verify:** `grep -rn "['\"\`]/places" app src public --include=*.ts --include=*.tsx --include=*.txt` returns only `/admin/places` hits (or none); `pnpm test`; `pnpm exec tsc --noEmit`; `pnpm build` succeeds and lists `/lieux/[slug]`. Commit.

---

### Task 3: Cache Components — static shell per place, status streamed at request time

Read first: `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`, `09-revalidating.md`, `01-app/02-guides/migrating-to-cache-components.md`, `01-app/03-api-reference/01-directives/use-cache.md`, `04-functions/cacheTag.md`, `04-functions/updateTag.md`.

**Model:**
- Corpus data (places, public claims, images, children, parent, coverage counts) is cached with `'use cache'` + `cacheTag("corpus")` + `cacheLife("max")`, invalidated by admin mutations.
- Google Places lookups (`getGooglePlaceDetails`, `getGooglePlacePhoto` → the underlying `fetchPlaceDetails`/`resolvePhotoUri`): `'use cache'` + `cacheLife("weeks")` (replaces the `next: { revalidate: 604800 }` fetch option, which the migration guide says to replace). Keep the `X-Goog-FieldMask: "photos"` header and the billing comment.
- Status (`resolvePlaceStatus`, `getTodayStatusCounts`) is **not cached**: rendered at request time inside `<Suspense>` in small async server components that `await connection()` first.

**Files / changes:**
1. `next.config.ts`: `cacheComponents: true` (keep existing `experimental.serverActions` and Task 2 redirects).
2. `src/corpus/queries.ts`: add `'use cache'`, `cacheTag("corpus")`, `cacheLife("max")` to `getActivePlaces`, `getPlaceBySlug`, `getCoverageCounts`. Leave admin-only queries (`getAllPlaces`, `getGoverningAuthorities`, `getSignalZones`) uncached. If `getActivePlaces` is also used by admin pages that's fine (mutations call `updateTag`). Make sure `queries.test.ts` still passes (mock `next/cache` if needed: `vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }))`).
3. New `src/components/LiveStatus.tsx` (server components, request-time):
   - `LiveStatusPill({ placeId, bare? })` → `await connection()`, `resolvePlaceStatus`, renders existing `StatusPill` plus, for the non-bare header variant, the "Zone feu {formatZoneLabel(zoneLabel)}" meta item currently built in the page (keep the exact current visual output of the header row).
   - `LiveStatusBlock({ placeId, officialInfoUrl })` → renders existing `StatusBlock`.
   - A neutral fallback component(s) for `<Suspense fallback>` matching the dimensions of the pill/block (e.g. dashed pill reading "Statut du jour…", block with the "Statut du jour" heading and a muted line "Relevé en cours de chargement…"). Never a verdict.
4. `app/(public)/lieux/[slug]/page.tsx`:
   - Remove `export const revalidate`.
   - Keep `generateStaticParams` (must return ≥1 param under Cache Components — if there are no active places it errors; that's acceptable, note it in the report).
   - Static parts: everything except status. Replace direct `resolvePlaceStatus` calls with `<Suspense fallback=…><LiveStatusPill …/></Suspense>`, `<Suspense …><LiveStatusBlock …/></Suspense>`, and in each `SpotCard` a status slot (change `SpotCard` to accept `status: React.ReactNode` / a `statusSlot` prop instead of `ResolvedStatus`, rendering `<Suspense><LiveStatusPill placeId={spot.id} bare/></Suspense>`).
   - The header meta row: the "Zone feu …" item moves into the live pill component (it depends on status); spots count and "Géré par" stay static.
5. `app/(public)/lieux/page.tsx` (index): `PlaceCard` takes a status slot instead of `ResolvedStatus`; page renders `<Suspense fallback=…><LiveStatusPill placeId={place.id} /* PlaceCard's own pill style */ /></Suspense>`. PlaceCard has its own local `StatusPill` variant (with backdrop blur) — keep that visual: export it or pass a variant; don't restyle.
6. `app/(public)/page.tsx` (landing): wrap `LiveProofLine` in `<Suspense fallback={null}>` behind an async component that does `await connection()` + `getTodayStatusCounts()`. The rest of the landing (coverage counts, place names) comes from cached queries.
7. `app/admin/layout.tsx`: wrap `{children}` in `<Suspense>` (admin pages call `connection()` at top level; they must not error under Cache Components). Fallback: a small muted "Chargement…" text.
8. Mutations:
   - `app/admin/places/actions.ts`: `updateTag("corpus")` after writes in `createPlace` and `updatePlace` (before `redirect`).
   - `app/admin/review/[draftId]/actions.ts`: `updateTag("corpus")` in `approveClaim` and `approveAllInBlock` (after the writes).
   - `app/admin/statut/actions.ts`: remove the loop that revalidates public place paths (status is no longer cached) and the now-unused zonePlace query; keep `revalidatePath("/admin/statut", "page")`.
   - `app/api/revalidate/route.ts`: replace `revalidatePath` with `revalidateTag("corpus", "max")`; the `slug` body field is no longer needed — drop the slug validation and return `{ revalidated: true }`. Keep bearer auth unchanged.
   - Update/adjust existing action tests (`app/admin/places/actions.test.ts`, etc.) — mock `next/cache` `updateTag`, and add an assertion that `updateTag` is called with `"corpus"` in `createPlace`/`updatePlace`.
9. `app/sitemap.ts`: make the sitemap function `'use cache'` with `cacheTag("corpus")` and `cacheLife("hours")` (freshness includes status confirmations, so hourly is right).
10. `app/lieux/[slug]/photo/route.ts`: must keep working (request-time). Only adjust if the build errors.

**Verify:**
- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`.
- `pnpm build` succeeds with no "Uncached data was accessed outside of <Suspense>" / blocking-route errors, and the route table shows `/lieux/[slug]` as Partial Prerender (◐) with the active slugs listed. Paste the relevant build-table lines in the report.
- `pnpm start` then `curl -s localhost:3000/lieux/<an-active-slug>` contains the place `<h1>`, the claim texts, AND the status verdict text (streamed in the same response). Paste evidence (grep counts) in the report. Stop the server afterwards.
- Commit.

---

### Task 4: Metadata, canonical URLs and structured data

Read first: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`, `01-app/03-api-reference/03-file-conventions/01-metadata/robots.md`.

**Files:**
1. Create `src/site.ts`: `export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";` and `export const SITE_NAME = "Nature Concierge";`. Replace the local `SITE_URL` constants in `app/robots.ts` and `app/sitemap.ts`.
2. `app/layout.tsx` metadata:
   ```ts
   metadataBase: new URL(SITE_URL),
   title: { default: "Nature Concierge — nature entre Marseille et Bandol", template: "%s · Nature Concierge" },
   description: (keep current),
   openGraph: { siteName: SITE_NAME, locale: "fr_FR", type: "website" },
   twitter: { card: "summary_large_image" },
   ```
3. `app/robots.ts`: `rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }`, `sitemap: \`${SITE_URL}/sitemap.xml\``.
4. Create `src/seo/place-jsonld.ts` (pure, unit-tested in `src/seo/place-jsonld.test.ts`):
   - `placeTitle(place)` → `` `${name} (${commune}) : ouvert aujourd'hui ? Accès, parking` ``
   - `placeDescription(place)` → `place.description` if present, else first public claim text, else `` `Statut du jour, accès et conseils pour ${name}.` ``; whitespace-collapsed, truncated to ≤155 chars at a word boundary with a trailing "…" when cut.
   - `buildPlaceJsonLd({ place, parent, url, photoUrl })` → `{ "@context": "https://schema.org", "@graph": [...] }` with:
     - `TouristAttraction`: `@id: url + "#lieu"`, `name`, `description` (placeDescription), `url`, `geo` (GeoCoordinates), `address` (`PostalAddress` with `addressLocality: commune`, `addressCountry: "FR"`), `containedInPlace` (parent → `{ "@type": "TouristAttraction", name, url: SITE_URL + "/lieux/" + parent.slug }`, else `{ "@type": "City", name: commune }`), `image: photoUrl` when non-null, `publicAccess: true` omitted (unknown — do not add).
     - `BreadcrumbList`: Accueil (`SITE_URL`) → Les lieux (`/lieux`) → parent (if any) → place.
     - `FAQPage` only if the place has public claims: one Question per claimType present (order = ClaimList's THEME_ORDER: ACCESS, CROWDING, SUITABILITY, TIP, AVOID, ALTERNATIVE, DECODING), answer = that type's claim texts joined with a space. Question templates:
       - ACCESS: `Comment accéder à ${name} ?`
       - CROWDING: `Y a-t-il du monde à ${name} ?`
       - SUITABILITY: `${name}, c'est pour qui ?`
       - TIP: `Quels conseils pour visiter ${name} ?`
       - AVOID: `Que faut-il éviter à ${name} ?`
       - ALTERNATIVE: `Quelle alternative à ${name} ?`
       - DECODING: `Comment comprendre les règles d'accès à ${name} ?`
     - Never include daily status in JSON-LD (it lives in the static shell and would go stale).
   - Tests: title format; description fallback chain + truncation (≤155 chars, word boundary, "…"); graph contains the three nodes with the fields above; FAQ omitted with zero claims; questions grouped by type in THEME_ORDER; breadcrumb with and without parent; no `image` key when photoUrl null.
5. `app/(public)/lieux/[slug]/page.tsx`:
   - `generateMetadata`: `title: { absolute: placeTitle(place) }`, `description: placeDescription(place)`, `alternates: { canonical: \`/lieux/${slug}\` }`, `openGraph: { title, description, url: \`/lieux/${slug}\`, type: "website" }`.
   - Replace the inline `jsonLd` object with `buildPlaceJsonLd(...)`; `photoUrl` = `` `${SITE_URL}/lieux/${slug}/photo` `` when Google photo exists, else null. Escape `<` in the serialized JSON (`JSON.stringify(x).replace(/</g, "\\u003c")`).
6. `app/(public)/lieux/page.tsx`: metadata `title: "Les lieux"` (template adds the brand), keep description, `alternates.canonical: "/lieux"`; add an `ItemList` JSON-LD of the listed places (`ListItem` with `position`, `url`, `name`).
7. `app/(public)/page.tsx`: `alternates.canonical: "/"` via exported `metadata`; add JSON-LD `@graph` with `WebSite` (`name`, `url`, `inLanguage: "fr-FR"`) and `Organization` (`name`, `url`, `areaServed: "Littoral Marseille–Bandol, ouest Var, Sainte-Baume"`).

**Verify:** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`. `pnpm start` + `curl` a place page: `<title>`, `<link rel="canonical" href="…/lieux/slug">`, `og:` tags, one `application/ld+json` script that parses as JSON. Commit.

---

### Task 5: Dynamic `llms.txt`

**Files:**
- Delete `public/llms.txt`.
- Create `src/seo/llms-txt.ts` (pure) + test: `buildLlmsTxt(places, siteUrl)` where `places` are active places with `slug, name, commune, type, description, parentId`. Output (markdown, French):
  ```
  # Nature Concierge

  > Le guide local pour la nature entre Marseille et Bandol : statut du jour (accès incendie) et conseils vérifiés sur le terrain, lieu par lieu.

  ## Mission
  (keep the current public/llms.txt Mission paragraph verbatim)

  ## Territoire couvert
  (keep current text)

  ## Mise à jour
  (keep current text)

  ## Lieux
  - [Calanque du Mugel](https://…/lieux/calanque-du-mugel): Calanque à La Ciotat. <description first sentence, if any>
    - [Anse du Sec](https://…/lieux/anse-du-sec): … (spots nested under their parent, 2-space indent)

  ## Contact
  (keep current text)
  ```
  Type label from `TYPE_LABELS` (`src/components/PlaceCard.tsx`). Spots whose parent is not in the list are listed top-level. Order = input order (demandRank). First sentence = text up to and including the first `.`, `!` or `?` followed by whitespace/end; omitted when no description.
- Create `app/llms.txt/route.ts`: `GET` returns `buildLlmsTxt(await getActivePlaces(), SITE_URL)` with `Content-Type: text/plain; charset=utf-8`. Make the handler's data cached (`'use cache'` + `cacheTag("corpus")` + `cacheLife("max")` in a helper function it awaits) so it prerenders.
- Tests: nesting, orphan spot top-level, description first sentence, no description, absolute URLs.

**Verify:** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build` (route `/llms.txt` present), `curl localhost:3000/llms.txt` after `pnpm start`. Commit.

---

### Task 6: "À proximité" — nearby places section

**Files:**
- Create `src/corpus/nearby.ts` + test:
  ```ts
  export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number // haversine, R = 6371
  export function nearbyPlaces<T extends { id: string; parentId: string | null; lat: number; lng: number }>(
    place: T, candidates: T[], { limit = 4, maxKm = 25 } = {},
  ): { place: T; km: number }[]
  ```
  Excludes: the place itself, its parent, its own children (candidates whose `parentId === place.id`), and its siblings (same non-null `parentId`) — siblings are already reachable from the parent page. Sorted by distance ascending, filtered `km <= maxKm`, sliced to `limit`.
- Tests: known distance (Marseille Vieux-Port 43.2951,5.3740 → La Ciotat 43.1747,5.6047 ≈ 22.3 km, assert within 0.5), exclusions (self/parent/children/siblings), maxKm cutoff, limit, ordering.
- `app/(public)/lieux/[slug]/page.tsx`: using cached `getActivePlaces()`, render a section in the main column after the spots section (before `PracticalImages`) — only when ≥1 result:
  - `<section aria-label="À proximité">`, `<h2 className={SECTION_TITLE}>À proximité</h2>`
  - list of links `/lieux/{slug}`: name (semibold), and a muted line `{TYPE_LABEL} · {commune} · à {km formatted "3,2"} km` (fr-FR, 1 decimal). Style consistent with `SpotCard`'s text styles but no photo and no status (keep it fully static). Simple 1-col / sm:2-col grid.

**Verify:** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`. Commit.

---

### Task 7: Open Graph images

Read first: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`.

**Files:**
- `app/(public)/lieux/[slug]/opengraph-image.tsx`: `ImageResponse` from `next/og`, `size = { width: 1200, height: 630 }`, `contentType = "image/png"`, `alt` via `generateImageMetadata` or static export per docs (alt: `` `${name} — ${commune}` `` if the docs allow a dynamic alt; otherwise static "Nature Concierge"). Content: background `#FAF7F0` (calcaire), small uppercase line `{TYPE_LABEL} · {commune} ({departement})` in `#4A6B4D` (pin), large place name in `#1C2B33` (encre), bottom row "Nature Concierge" + "Statut du jour, accès, conseils vérifiés" in `#0F4C5C` (mediterranee). No status (would go stale in shares). Default font (don't fetch Google fonts). Uses cached `getPlaceBySlug`; `notFound()`-equivalent when missing per docs.
- `app/opengraph-image.tsx`: site-wide default (same palette): "Nature Concierge" + "Où aller en nature entre Marseille et Bandol — et où ne pas aller."
- Ensure page metadata doesn't override `openGraph.images` (file convention supplies it).

**Verify:** `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` (OG routes prerendered for active slugs). `pnpm start` + `curl -sI localhost:3000/lieux/<slug>/opengraph-image…` (use the exact URL from the page's `og:image` meta) returns `200 image/png`. Commit.
