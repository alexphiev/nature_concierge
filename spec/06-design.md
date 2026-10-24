# 06 — Design (public-facing views)

## Direction

Warm, minimal, grounded in the territory: **calcaire** (limestone), **pin
d'Alep**, **Méditerranée profonde**. The site should feel like a trustworthy
field notebook kept by people who are actually there, not a travel brand.
Imagery is real photos of the place (ours first, Google Places as fallback);
never stock.

## Type and colors

One type system across the site: **Fraunces** for titles (`font-display`,
`font-landing-display`) and **Figtree** for text (`font-body`,
`font-landing-body`), both loaded once in the root layout. Small labels
(place types, theme names, eyebrows) are Figtree semibold uppercase. IBM Plex
Mono is kept for the admin only.

Colors still run two registers, a leftover of building the landing and the
place pages at different times:

| | Landing, About, header, footer | Place pages, places index, admin |
|---|---|---|
| Ground | `#F5EFE4`, cards `#FFFDF8`, borders `#E4DACA` | `--calcaire` `#FAF7F0`, `--calcaire-deep` `#F1EBDE`, `--sable` `#B8A98C` |
| Ink | `#1D2A2E` | `--encre` `#1C2B33` |
| Primary | `#0E4B5A` (hero band, links, buttons) | `--mediterranee` `#0F4C5C` |
| Accent | terracotta `#A34A25` on peach `#FBE9DD` (support and contribution blocks) | `--pin` `#4A6B4D` (theme badges) |

Landing colors are hard-coded hex values in components; place-page colors are
CSS tokens in `app/globals.css` exposed to Tailwind via `@theme inline`.
Unifying them is a candidate cleanup, not yet planned.

`--statut-*` tokens remain from the removed status layer; `--statut-rouge`
is still used as the risk accent for SAFETY / AVOID claim groups.

## Components and patterns

- **Cards**: rounded (14–20px), 1px warm border, near-zero shadow; the place
  sidebar card is the only one with a soft shadow.
- **Practical info vs lived tips**: a place page shows two blocks. *Infos
  pratiques* (claims with `kind = PRACTICAL_INFO`) is a compact, formal sheet
  grouped by theme, each fact dated and linked to its source when it is a
  URL. *Conseils vécus* (`kind = LOCAL_TIP`) are signed cards grouped by
  theme, in a two-column masonry, with the author's initial. Neutral themes
  use `--pin`, risk themes red, ALTERNATIVE the sea color.
- **Needs card**: when a place has fewer than 3 claims of a kind, a peach card
  asks up to 3 precise questions (« Quand y a-t-il du monde ? ») that open the
  matching form with the theme preselected. Never « À compléter ».
- **Photos**: main photo + square grid with lightbox; credits overlaid
  (« Photo : … »). No photo → `--calcaire-deep` hatch panel with the place
  type label.
- **Buttons**: filled primary for the main action of a block, outlined for
  secondary; full-width on mobile; sticky bottom bar on mobile place pages.
- **Hero**: deep teal band with a layered wave divider into the page ground.

## Motion

Almost none: short hover/focus transitions. `prefers-reduced-motion`
disables all animation and transitions globally (`globals.css`).

## Voice in UI copy

Sentence case, plain verbs, the voice of a knowledgeable neighbour (« Évitez
le dimanche 11h–13h »). Errors and empty states are direct, never cute. The
word « IA » appears nowhere.

## Quality floor

Mobile-first (375px), safe-area insets, visible 2px focus ring in the primary
color, AA contrast, color never the only signal (icon + label), images with
explicit dimensions, LCP < 2.5s.
