# Design — Public Site (`/places` + `/places/[slug]`)

Source specs: `spec/00-scope.md`, `spec/03-public-site.md`, `spec/09-design.md`.

## Goal

Build the public-facing shop window: a places index and one statically
generated page per place, with the signature status-block element, styled
per the project's visual identity. This is the second build step per
`00-scope.md`'s order, following the data model + corpus ops foundation
(already built — Prisma schema, corpus pipeline, Port d'Alon seeded to
Neon).

## Scope

**In:**
- `/places` — index of ACTIVE places, ordered by `demandRank`
- `/places/[slug]` — place detail page (the SEO unit)
- Base layout rebuild: fonts (Bricolage Grotesque / Public Sans / IBM Plex
  Mono), Tailwind v4 design tokens from `09-design.md`, `lang="fr"`, no dark
  mode, `SiteFooter`
- Read-only corpus query layer (`src/corpus/queries.ts`)
- Revalidation route handler, token-secured
- Full component set named in `03-public-site.md`: `StatusBlock`,
  `StatusChip`, `ClaimList`, `ClaimItem`, `WhatsAppCTA`,
  `AlternativeCallout`, `PlaceCard`, `Dateline`, `SiteFooter`

**Out (deferred to later spec steps):**
- `/` (landing page) — `05-landing.md`, its own build step
- `/statut` — spec marks it explicitly phase-2/optional, not MVP
- `sitemap.ts` / `robots.ts` / `llms.txt` — deferred to land alongside the
  landing page step, since `sitemap.ts` per spec must include "ACTIVE
  places + landing + index" and building it before landing exists means
  revisiting it anyway. **Tracked explicitly here so it isn't dropped**:
  when `05-landing.md` is built, this SEO scaffolding must be added in the
  same pass.
- Analytics event firing (`whatsapp_click`, etc.) — `07-measurement.md`.
  `WhatsAppCTA` gets a clearly-marked no-op hook where the event fire will
  go, not a real implementation.
- `StatusLog` seed data — `04-signal-ops.md`. This step's status block will
  correctly render the "non vérifié" (unverified) state for Port d'Alon
  since no status rows exist yet; that state must look right regardless of
  when signal-ops lands.

## Rendering approach (Next.js 16.2.10, verified against installed docs)

This project has Cache Components/PPR **disabled** (no `cacheComponents` in
`next.config.ts`). Confirmed via `node_modules/next/dist/docs/01-app/`:
- `generate-static-params.md` — standard `generateStaticParams()` export,
  unchanged shape from prior Next versions when Cache Components is off.
- `02-guides/incremental-static-regeneration.md` — `export const revalidate
  = N` route segment config is the current, fully supported mechanism (not
  superseded unless Cache Components is opted into).
- `revalidatePath.md` — `revalidatePath(path: string, type?: 'page' |
  'layout'): void`, callable from Route Handlers; marks the path stale for
  regeneration on next visit (not eager).

Therefore: `/places/[slug]` uses `generateStaticParams()` over ACTIVE
places + `export const revalidate = 900` (15 min), exactly as
`03-public-site.md` specifies. No Suspense-streaming split needed — this is
simpler than the Cache-Components-era pattern and matches the spec's
"choose ISR first (simpler, SEO-visible)" guidance directly.

## Data layer

New file `src/corpus/queries.ts`, built on the existing `prisma` client
(`src/corpus/db.ts`). Enforces the spec's "giveaway line" business rule
at the query level — no page component queries Prisma directly:

- `getActivePlaces(): Promise<Place[]>` — `status: ACTIVE`, ordered by
  `demandRank` ascending.
- `getPlaceBySlug(slug: string): Promise<PlaceWithClaims | null>` —
  `status: ACTIVE`, includes claims filtered to `isPublic: true AND status:
  PUBLISHED` only.
- `getTodayStatus(placeId: string): Promise<StatusLog | null>` — today's
  (or tomorrow's, if after 18h local time) `StatusLog` row for the place;
  `null` is the expected/correct result when signal-ops hasn't run yet,
  and must render the loud "non vérifié" state, never a stale fallback.

## Layout & design tokens

`app/layout.tsx` rebuilt:
- `lang="fr"`
- `next/font/google`: Bricolage Grotesque (display, 2 sizes per spec),
  Public Sans (body), IBM Plex Mono (status/dateline/source-attribution
  text only) — replacing the current Geist Sans/Mono placeholders
- No `prefers-color-scheme` dark-mode block — removed entirely, not just
  unused, per `09-design.md`'s explicit "no dark mode (MVP)"
- Renders `SiteFooter` (who we are, sources-honesty note, link to
  `/places`)

`app/globals.css` — Tailwind v4 CSS-first config (`@theme inline`), full
token table from `09-design.md`:

```css
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
```

Layout constraints per spec: single column, max content width 720px
reading / 1040px index grid, 10px card radius, near-zero shadows (1px
`--sable` @ 40% borders instead), mobile-first (375px floor), visible
`--mediterranee` 2px focus ring, AA contrast, `prefers-reduced-motion`
respected.

## Components (`src/components/`)

Each single-purpose, matching `03-public-site.md`'s named list:

- **`StatusBlock`** — the signature element (`09-design.md`): bordered
  panel, `--calcaire-deep` ground, 2px left rule in current status color,
  Plex Mono status line + decoded local meaning + `Dateline` + official
  source link. Unverified state: `--statut-inconnu`, dashed border,
  "Données non vérifiées aujourd'hui — consultez la carte officielle ↗" —
  designed with the same care as the verified states, not an afterthought.
- **`StatusChip`** — compact color+icon+label chip for `PlaceCard`s on the
  index; color is never the only signal.
- **`ClaimList`** / **`ClaimItem`** — public claims grouped by theme (Accès
  · Affluence · Pour qui · À éviter), short standalone paragraphs, small
  `--pin` theme tag, no per-claim cards.
- **`WhatsAppCTA`** — solid `--mediterranee` full-width-on-mobile button,
  `wa.me` deep link prefilled with place name, WhatsApp glyph. Analytics
  fire is a marked `// TODO(07-measurement): whatsapp_click event` no-op,
  not implemented here.
- **`AlternativeCallout`** — renders only when the place has `ALTERNATIVE`
  verdict claims; links to the alternative place.
- **`PlaceCard`** — index list item: name, commune, type, `StatusChip`
  (today's status), one hook claim.
- **`Dateline`** — Plex Mono "Vérifié le {date} à {heure}" text; shared by
  `StatusBlock` and (later) page-level visible datelines.
- **`SiteFooter`** — who we are, sources-honesty note, `/places` link.

## Pages

**`/places` (`app/places/page.tsx`)** — Server Component. Queries
`getActivePlaces()`. Renders a list (never a map/filter UI, per
`00-scope.md` non-goals) of `PlaceCard`s. Honest-coverage line at top:
"Couverture actuelle : littoral Marseille–Bandol et Sainte-Baume. D'autres
lieux arrivent."

**`/places/[slug]` (`app/places/[slug]/page.tsx`)** — Server Component.
`generateStaticParams()` over `getActivePlaces()` slugs.
`export const revalidate = 900`. `generateMetadata()` per spec's title/
description pattern. `notFound()` for unknown/inactive slugs. Fixed order:
`StatusBlock` → identity (name/commune/type/description/photo-or-quiet-
panel) → `ClaimList` → `WhatsAppCTA` → `AlternativeCallout`. JSON-LD
(`Place` + `FAQPage` from hook claims) included at this step since it's
page-local, not sitemap-dependent.

## Revalidation route

**`app/api/revalidate/route.ts`** — `POST` only. Reads a bearer token from
the `Authorization` header, compares against `process.env.REVALIDATE_TOKEN`
(constant-time compare), 401s on mismatch. On success, reads `slug` from
the JSON body and calls `revalidatePath(\`/places/${slug}\`, 'page')`.
Returns `{ revalidated: true, slug }`. This is what `04-signal-ops.md`'s
`status:update` script will call — not built or wired to anything in this
step, just the endpoint existing and working in isolation (tested by
curling it directly).

## Testing / verification

- `pnpm build` succeeds; `/places/port-d-alon` appears in the static
  output (proves `generateStaticParams` picked it up).
- `/places` renders Port d'Alon as the only card.
- `/places/port-d-alon` renders the full fixed component order; status
  block shows the "non vérifié" state (no `StatusLog` seeded yet).
- `/places/does-not-exist` returns a 404.
- `curl -X POST /api/revalidate` with wrong/missing token → 401; with
  correct token + valid slug → 200 and the place page is marked stale.
- Manual visual check at 375px viewport width against `09-design.md`'s
  quality floor (focus rings, contrast, no color-only status signaling).

## Out of scope for this step (explicit non-goals)

Matches `00-scope.md` project-wide non-goals, plus locally: no map/filter
UI, no user accounts, no admin UI, landing page, `/statut`, SEO sitemap
scaffolding (tracked above for the landing step), analytics wiring.
