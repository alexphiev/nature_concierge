# Public Site Redesign — /places, /places/[slug] + Google Places Photos

## Purpose

`/places` and `/places/[slug]` currently render as bare data — flat bordered
boxes, no imagery, and a real bug (`PlaceCard`'s status chip is hardcoded to
`value={null}`, so live status never shows on the index). The landing page
already follows `spec/09-design.md` closely; these two pages don't. This
spec locks in a visual redesign (approved via browser mockups: grid "Option
A — Spécimen de terrain" for the index, and the hero/relevé/sidebar layout
for the detail page) plus a new capability the redesign depends on: place
photos, sourced from the Google Places API.

## Visual redesign — approved direction

### `/places` index — "Spécimen de terrain" card

Each `PlaceCard` becomes:
- A photo panel (4:3), or — when no photo is available — a quiet
  `--calcaire-deep` panel with a subtle diagonal hatch texture and the
  place type as a small pill label (matches spec 09's "never a placeholder
  stock image" rule).
- A status pill floating top-right on the photo, using the same
  vert/orange/rouge/inconnu vocabulary as `StatusChip`, but rendered
  translucent-over-photo rather than inline text.
- Below the photo: place name (display font), commune + département line,
  then a divider and one representative claim as a "hook" (theme tag +
  text), matching how the detail page's claim list is styled.
- **Bug fix**: `PlaceCard` currently hardcodes `<StatusChip value={null} />`.
  It must call `resolvePlaceStatus(place.id)` (already built, from
  `src/corpus/queries.ts`) per card, same as the detail page does.

### `/places/[slug]` detail — hero + relevé + sidebar

- **Hero**: two-column (photo left, identity right on desktop; stacked on
  mobile) — photo panel (16:10, same fallback rule as the card), commune
  eyebrow line, place name in display font, description.
- **Relevé du jour** (status block): rebuilt as one composed panel instead
  of stacked mono lines — a left "stamp" column (verdict word + colored
  level), a center detail column (meaning text + active-fire caveat when
  applicable), a right meta column (dateline + official source link).
  Keeps every existing `ResolvedStatus` field and the ZAPEF-aware
  verdict text ("Ouvert — accès restreint") already built in the prior
  status-model plan — this is a rendering change only, no logic change.
- **Conseil du guide**: claims grouped by `claimType`, each theme under a
  small uppercase label with a trailing rule, claim text with a left
  border accent instead of a plain paragraph.
- **Sidebar**: WhatsApp CTA becomes a sticky card (`--mediterranee`
  background) instead of a full-width button in the flow; the alternative-
  place callout becomes a small card beneath it instead of a bare
  paragraph.
- Global: `next/image` is not used for the hero/card photo (see "Why plain
  `<img>`" below) — a plain `<img>` with explicit `width`/`height` (or CSS
  `aspect-ratio`) satisfies spec 03's "images with dimensions, no layout
  shift" requirement without needing `next/image`'s remote-pattern
  allowlist for a Google-hosted, redirect-based image source.

No changes to the landing page, `SiteFooter`, or admin UI styling — scope
is `/places`, `/places/[slug]`, and the components they own
(`PlaceCard`, `StatusBlock`, `StatusChip`, `ClaimList`, `ClaimItem`,
`WhatsAppCTA`, `AlternativeCallout`).

## Photos — sourced from Google Places API (New), fetched fresh

### Why not store a photo URL or photo reference

Google's Place Photos (New) documentation is explicit: *"You cannot cache
a photo name. Also, the name can expire."* No TTL is documented — it can
simply stop working. Storing a `photoUrl`/`photoName` permanently on
`Place` (the original, simpler idea) risks a hero photo silently 404ing
site-wide with no warning and no automatic recovery. Given this is a
public-facing, SEO-relevant page, correctness beats the extra API call.

### What's stored permanently on `Place`

```prisma
model Place {
  // ...existing fields...
  googlePlaceId  String?  // stable Google resource id, e.g. "ChIJ..." — pasted in manually by the operator
}
```

Only the id. Everything else Google-related (photo, Maps link) is fetched
fresh at read time, per Google's own guidance to always retrieve the photo
`name` from a live API response.

### `/admin/places` — manual field, no lookup UI (deliberately simple)

No Google search/picker for this pass — the operator finds the place on
Google Maps themselves and pastes its place id into one new text field on
`PlaceForm` ("Identifiant Google Places (optionnel)"). No new server
action, no new API call from the admin surface at all. `googlePlaceId` is
read/written by the existing `createPlace`/`updatePlace` actions exactly
like every other plain text field on that form already is.

### Photo + Maps link lookup — `src/corpus/google-places.ts` + a redirect route

All decision-making (does a photo exist? what's the Maps link?) happens
**server-side**, in the page component, before rendering — both `/places`
and `/places/[slug]` stay full server components, no client JS.

**`getGooglePlaceDetails(googlePlaceId: string | null): Promise<GooglePlaceDetails | null>`**
(new function in `src/corpus/google-places.ts`, called directly by
`PlaceCard` and the detail hero, cached via Next.js `fetch` caching):

1. If `googlePlaceId` is null → return `null` immediately (no API call).
2. Call **Place Details (New)**:
   `GET https://places.googleapis.com/v1/places/{googlePlaceId}` with
   header `X-Goog-FieldMask: photos,googleMapsUri`, using Next.js's
   extended `fetch` with `{ next: { revalidate: 604800 } }` (**7 days** —
   well inside Google's "don't treat this as permanent" guidance for the
   photo `name`, while cutting Places API calls from once-per-page-view
   to roughly once-per-week-per-place; a stale photo reference expiring
   mid-week just means the next request after the cache window gets a
   fresh one, self-healing with no manual intervention — `googleMapsUri`
   itself is a stable link and doesn't expire, it's just fetched in the
   same call since it's free once we're already calling Place Details for
   the photo).
3. If the call fails → return `null`.
4. Return `{ photo, googleMapsUri }` where `googleMapsUri` is the raw
   field from the response (or `null` if absent), and `photo` is `null`
   if `photos` is empty, else `{ mediaUrl, attribution }` where `mediaUrl`
   is `https://places.googleapis.com/v1/{photos[0].name}/media?key=${GOOGLE_PLACES_API_KEY}&maxWidthPx=1200`
   and `attribution` is `photos[0].authorAttributions[0]?.displayName ?? null`.

**`app/places/[slug]/photo/route.ts`**: a thin GET route that calls
`getGooglePlaceDetails` and issues a `307` redirect to `photo.mediaUrl`
(or a `404` if `photo` is `null`). This is what the `<img src>` actually
points to — the browser, not this app's server, fetches the image bytes
from Google's CDN. The route exists only so the API key never reaches the
client and so the same 7-day-cached lookup isn't duplicated between "does
a photo exist" (used to decide layout) and "what URL does the img tag
use" (the redirect target) — both call the same cached
`getGooglePlaceDetails`.

### Fallback behavior (no id set, or Google returns nothing)

Both `PlaceCard` and the detail hero call
`getGooglePlaceDetails(place.googlePlaceId)` directly, server-side, and
branch synchronously on the result:
- `photo` is `null` → render the quiet `--calcaire-deep` hatch panel with
  the place type label (existing spec 09 rule) — covers both "no id set"
  and "Google has no photos for this place."
- `photo` is non-null → render `<img src="/places/{slug}/photo" width=…
  height=…>` (pointing at the redirect route above) plus, if `attribution`
  is non-null, a small corner overlay with the credit text.
- The detail page additionally renders a "Voir sur Google Maps ↗" link
  next to the official-source link in the relevé panel's meta column,
  only when `googleMapsUri` is non-null.

## New environment variable

`GOOGLE_PLACES_API_KEY` — server-only (never exposed to the client; both
the admin lookup and the photo route are server-side). Added to
`.env.dist` as a placeholder, real value added to `.env.local` by the
user before implementation/testing.

## Out of scope

- No photo *upload* — all photography comes from Google's index, never a
  file upload from the operator.
- No multi-photo galleries — one hero photo per place (`photos[0]`), per
  the approved mockup's single-hero-image layout.
- No Google reviews, ratings, or other Place Details fields — only
  `photos` and `googleMapsUri` are fetched, per this redesign's scope.
  (`googlePlaceId` is the only field stored, specifically so a later
  feature — reviews, richer details — doesn't need a second lookup.)
- No `/admin/places` Google search/picker UI — the operator finds the
  place id manually and pastes it in as a plain text field, deliberately
  simple for this pass. A search/picker is a reasonable later addition if
  manual lookup proves tedious, but is not part of this scope.
- No changes to `/admin/statut`, `/admin/ingest`, `/admin/review`, or any
  other already-shipped admin surface.
- No dark-mode-specific asset handling beyond what the existing CSS custom
  properties already provide (the mockups were built and verified in both
  themes; the real implementation inherits the app's existing token setup
  from `app/globals.css`, not a new theme system).
