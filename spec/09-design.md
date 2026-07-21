# 09 — Design (public-facing views)

## Direction

Warm, minimal, clean, professional — grounded in the territory itself, not in a
generic "warm startup" kit. The visual world is the littoral between Marseille
and Bandol: **calcaire blanc** (limestone), **pin d'Alep**, **Méditerranée
profonde**, and the coastline's own information vernacular — the **sémaphore**
and the daily préfecture bulletin. The site should feel like a trustworthy field
logbook kept by someone who is actually there, not like a travel brand.

Two deliberate constraints:

1. **The brand accent is never red/orange/terracotta.** Fire-risk semantics own
   red and orange on this site; the brand must not compete with or dilute the
   signal system. Warmth comes from the limestone ground and the typography,
   not from a hot accent.
2. **One signature element**: the **status block styled as a semaphore board /
   logbook entry**. Everything else stays quiet.

## Color tokens

| token | hex | use |
|-------|-----|-----|
| `--calcaire` | `#FAF7F0` | page background (warm limestone white) |
| `--calcaire-deep` | `#F1EBDE` | cards, alternate sections |
| `--encre` | `#1C2B33` | primary text (deep sea-slate ink) |
| `--mediterranee` | `#0F4C5C` | brand primary: links, CTA, headings accent |
| `--pin` | `#4A6B4D` | secondary accent (pin d'Alep), subtle tags |
| `--sable` | `#B8A98C` | hairlines, muted meta text |
| Status only: | | |
| `--statut-vert` | `#2E7D46` | accès autorisé |
| `--statut-orange` | `#C77419` | restrictions |
| `--statut-rouge` | `#B3362B` | accès restreint/interdit |
| `--statut-inconnu` | `#6B7280` | non vérifié (with hatched/dashed treatment) |

Status chips always pair color + icon + label — never color alone.

## Typography

- **Display — Bricolage Grotesque** (Google Fonts): headings, place names,
  hero. Characterful, warm curves, contemporary; used with restraint (2 sizes).
- **Body — Public Sans**: all reading text. Professional, quiet, excellent at
  small sizes.
- **Logbook — IBM Plex Mono**: status values, datelines ("Vérifié le 21 juillet,
  18h12"), source attributions. The mono register is what makes verification
  feel like an official relevé rather than marketing copy. Use it *only* for
  data/verification text, nowhere else.

Scale (rem): 3.0 / 2.0 hero-display · 1.5 h2 · 1.125 body-lg · 1.0 body ·
0.875 meta-mono. Line-height 1.6 body, 1.15 display. Max prose width 65ch.

## The signature: status block ("le relevé du jour")

A bordered panel at the top of each place page, visually distinct from all other
cards: `--calcaire-deep` ground, 2px left rule in the current status color,
content in the logbook register:

```
┌──────────────────────────────────────────────┐
│ ● ROUGE — Accès restreint                    │  ← Plex Mono, status color
│ Ouvert 8h–17h · plage principale uniquement  │  ← decoded local meaning
│ · parking réduit                             │
│ ─────────────────────────────────────────    │
│ Vérifié le 21 juil. 18h12 · Préfecture du    │  ← mono meta, link
│ Var ↗                                        │
└──────────────────────────────────────────────┘
```

Unverified state: `--statut-inconnu`, dashed border, text "Données non
vérifiées aujourd'hui — consultez la carte officielle ↗". This state is
designed with the same care as the others; honesty is part of the identity.

## Layout

- Single column, generous whitespace, max content width 720px for reading,
  1040px for index grid. Radius 10px on cards, shadows near-zero (1px borders
  in `--sable` at 40% instead). No hairline-broadsheet grid, no dark mode (MVP).
- Place page order fixed per 03: relevé → identity/photo → conseils du guide →
  WhatsApp CTA → alternative callout.
- Claims render as short standalone paragraphs with a small `--pin` theme tag
  (Accès / Affluence / Pour qui / À éviter) — no icon library soup, no cards
  per claim.
- WhatsApp CTA: one solid `--mediterranee` button, white text, WhatsApp glyph,
  full-width on mobile. The only filled button on any page.

## Imagery

Our own photos only (field visits produce them). Natural light, no filters, no
stock. If no photo exists yet, render a quiet `--calcaire-deep` panel with the
place type label — never a placeholder stock image.

## Motion

Almost none: 150ms ease on hover/focus states, one subtle fade-in on the status
value at load. `prefers-reduced-motion` disables both. No scroll animations.

## Voice in UI copy

Sentence case, plain verbs, the guide's voice ("Évitez le dimanche 11h–13h",
"Dites-nous si c'était juste"). Errors and empty states direct, never cute.
The word "IA" appears nowhere.

## Quality floor

Mobile-first (test at 375px), visible keyboard focus (`--mediterranee` 2px
ring), AA contrast on all text (checked against `--calcaire`), status readable
by colorblind users (icon+label), LCP < 2.5s.
