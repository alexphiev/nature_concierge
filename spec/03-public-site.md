# 03 — Public Site (places, place pages, About)

All copy in French. Visual language in `06-design.md`, SEO in `07-seo.md`.
The community rework of these pages is specified in
`docs/superpowers/specs/2026-10-17-community-contributions-design.md`; this
file describes what is built.

## Routes

| Route | Page |
|---|---|
| `/` | Landing + search (`04-landing-search.md`) |
| `/lieux` | Places index |
| `/lieux/[slug]` | Place page (the SEO unit) |
| `/lieux/[slug]/photo?i=N` | Redirect to the Nth Google Places photo (key never exposed) |
| `/a-propos` | About |
| `/places/*` | 308 → `/lieux/*` |

Route groups: `app/(landing)` (landing, About) and `app/(public)` (places)
share `SiteHeader`, `SiteFooter` and `ConstructionBanner` (hidden when
`SHOW_CONSTRUCTION_BANNER=false`).

## Rendering

`cacheComponents` is on. Place pages are prerendered for every ACTIVE place
(`generateStaticParams`); all corpus reads are `"use cache"` with the
`corpus` tag (`02-corpus-ops.md`). Place pages and the index have no
per-request data today; only the landing's search shortcuts are dynamic.

## Places index `/lieux`

Coverage line, H1 « Les lieux », grid of `PlaceCard`s for ACTIVE places by
`demandRank`. Spots are hidden when their parent is ACTIVE (they're listed on
the parent's page). JSON-LD `ItemList`.

`PlaceCard`: cover photo (or hatch panel + type label), type, name, commune.

## Place page `/lieux/[slug]`

Top to bottom:

1. Breadcrumb (Les lieux / parent / place).
2. Header: type · commune (département), H1 name, meta (spot count, « Géré
   par {governingAuthority} »), « Itinéraire Google Maps » button.
3. **Gallery** (`PlaceGallery`): one main photo + a grid of squares, with a
   full-screen lightbox and photo credits.
4. Main column:
   - « À propos »: `description` with « Lire la suite ».
   - « Conseils du guide » (`ClaimList`): public claims grouped by
     `claimType` in a fixed order, each group with an icon and count; SAFETY
     and AVOID get a risk accent, ALTERNATIVE a sea accent. Hidden when empty.
   - « Valable pour tout {parent} »: the parent's public claims, on spots.
   - Spots (`SpotCard`s), for a parent place.
   - « À proximité »: the 4 nearest ACTIVE places within 25 km
     (`src/corpus/nearby.ts`).
   - « Images pratiques » (`PracticalImages`).
5. Sidebar (sticky on desktop, first on mobile): WhatsApp « plan sur
   mesure » card (`WhatsAppCTA`), « Carte officielle ↗ » (when
   `officialInfoUrl`) and « Google Maps ↗ » links, `AlternativeCallout`
   (« Si c'est fermé ou saturé → {place} » for ALTERNATIVE claims).
6. Mobile: sticky `WhatsAppBar`.

The WhatsApp CTAs are removed by the community contributions work.

## Photos

Composition (`src/corpus/place-photos.ts`):

- Uploaded `PlacePhoto`s first, by `order`, served from Neon Object Storage
  through `next/image`.
- Then Google Places photos (`/lieux/[slug]/photo?i=k`) only until the gallery
  reaches 5 (`MIN_GALLERY_PHOTOS`); Google is not called when 5+ photos are
  uploaded.
- Cards use the first uploaded photo, else the first Google photo, else the
  hatch placeholder (never a stock image).
- Google details (photos + Maps link) are fetched server-side in
  `src/corpus/google-places.ts`, cached for weeks (`cacheLife("weeks")`;
  failures are cached for minutes only). The photo route uses
  `skipHttpRedirect=true` and redirects to Google's keyless `photoUri`, so
  `GOOGLE_PLACES_API_KEY` never reaches the browser. Google attributions are
  displayed as credits.

## About `/a-propos`

`AboutContent`: who runs the guide (portrait placeholder), what it offers
(place pages, WhatsApp advice, a growing guide), commitments, Tipeee support
block, FAQ, final CTA band.

## Shared chrome

- `SiteHeader`: logo + « Guide Nature de La Ciotat », « Tous les lieux »,
  « À propos », « Soutenir » (Tipeee); `MobileMenu` on small screens.
- `SiteFooter`: « Un guide tenu par Alexandre… », project story link, Tipeee,
  fire-risk line linking to the official access map.
- Placeholder links still to fill in `src/components/landing/shared.ts`:
  `STORY_HREF`, `TIPEEE_HREF`, `ACCESS_MAP_HREF` are `#`.

## Accessibility & performance floor

Visible keyboard focus, color never the only signal, `prefers-reduced-motion`
respected, images with dimensions (no layout shift), mobile-first at 375px,
safe-area insets on notched phones, LCP < 2.5s on 4G.
