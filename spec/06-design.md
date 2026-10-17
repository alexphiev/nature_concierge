# 06 — Design (public-facing views)

## Direction

Warm, minimal, grounded in the territory: **calcaire** (limestone), **pin
d'Alep**, **Méditerranée profonde**. The site should feel like a trustworthy
field notebook kept by people who are actually there, not a travel brand.
Imagery is real photos of the place (ours first, Google Places as fallback);
never stock.

## Two type systems (known inconsistency)

The site currently runs two visual registers, a leftover of building the
landing and the place pages at different times:

| | Landing, About, header, footer | Place pages, places index, admin |
|---|---|---|
| Display | Fraunces (`font-landing-display`) | Bricolage Grotesque (`font-display`) |
| Body | Figtree (`font-landing-body`) | Public Sans (`font-body`) |
| Meta | — | IBM Plex Mono (`font-mono`): types, breadcrumbs, theme labels |
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
- **Claims**: grouped by theme in a two-column masonry; each group has a
  round icon badge, a mono uppercase label with count, and bulleted
  sentences. Neutral themes use `--pin`, risk themes red, ALTERNATIVE the sea
  color.
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
