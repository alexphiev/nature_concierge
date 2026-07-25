# 03 — Public Site (places index + place pages)

Next.js 16, App Router, TypeScript. Visual language: see `09-design.md`.
All user-facing copy in French.

## Routes

```
/                      → landing (see 05-landing.md)
/lieux                 → places index
/lieux/[slug]          → place detail (the SEO unit)
/statut                → (optional, phase 2 of MVP) all-territory status board
```

## Rendering strategy (the one architectural decision that matters)

- Place pages are **statically generated** (`generateStaticParams` over ACTIVE
  places) — the corpus part changes rarely.
- The **status block is never stale-served**: implement as a Server Component
  reading today's/tomorrow's `StatusLog` (resolved via the place's `SignalZone`,
  see `04-signal-ops.md`) with `revalidate = 900` (15 min) via ISR,
  OR static shell + small `/api/status/[slug]` fetched client-side. Choose ISR
  first (simpler, SEO-visible); switch only if update latency hurts.
- Saving the daily status page (`/admin/statut`, see `04-signal-ops.md`)
  triggers `revalidatePath('/lieux/[slug]')` for every place under a
  changed zone, via a revalidation call from that admin action (shared
  secret / same session, no separate token needed).

## Place page structure (top to bottom)

1. **Status block — the signature element (see 09-design.md).**
   - Today's (and after ~19h, tomorrow's) fire-access state with the exact
     local meaning, not just the level: "Rouge — ouvert 8h–17h, plage principale
     uniquement, parking réduit". Resolution runs through the place's zone **and
     its ZAPEF status** per `04-signal-ops.md` — a `rouge` day means "closed" for
     a normal place and "open, restricted" for a ZAPEF site like Port d'Alon,
     while `extreme` means closed for both. Getting this wrong in either
     direction (telling people a ZAPEF site is shut, or an ordinary massif is
     open) is the single worst failure this page can produce.
   - On `orange` / `rouge` / `extreme` days, always render the active-fire
     caveat: « En cas de fumée ou de consignes des secours sur place,
     suivez-les même si la carte indique autre chose. » The daily map is a
     scheduled forecast, not a live fire feed.
   - Water quality when covered.
   - `Vérifié le {confirmedAt} · Source officielle : {provider}` + link to
     `officialInfoUrl`.
   - **Loud failure state is first-class**: if no StatusLog row for the relevant
     date → render "Données non vérifiées aujourd'hui — consultez la carte
     officielle" in a distinct visual state. Never default to green. Never
     render a stale row without its date visible.
2. **Identity**: name, commune, type, short neutral description, photo (ours).
3. **Le conseil du guide** — public claims only (`isPublic = true`), rendered as
   self-contained quotable sentences grouped by theme (Accès · Affluence ·
   Pour qui · À éviter). 2–3 hook claims per place maximum.
4. **Concierge CTA**: "Besoin d'un plan sur mesure (enfants, mistral, plan B) ?
   Écrivez-moi sur WhatsApp — gratuit." → wa.me link with pre-filled message
   including the place name. Fires analytics event `whatsapp_click {slug}`.
5. **Alternatives teaser** (if ALTERNATIVE claims exist): "Si c'est fermé ou
   saturé → {alternative place link}" — this is the dispersal thesis rendered,
   and excellent internal linking.

## Giveaway line (business rule, enforce in queries)

Public pages expose: full status layer + `isPublic` hook claims.
Reserved for concierge: the conditional depth (full claim set, audience-specific
arbitration, plan Bs). Query for pages filters `isPublic = true AND status =
PUBLISHED`. No API endpoint exposes the full corpus.

## Web SEO

- Metadata per place targeting real query patterns:
  title `"{Name} : ouvert aujourd'hui ? Accès, parking, affluence — {commune}"`;
  description built from status + top hook claim.
- French slugs, canonical URLs, `sitemap.ts` (ACTIVE places + landing + index),
  `robots.ts`.
- JSON-LD per page: `Place` (geo, containedInPlace commune) + `FAQPage` built
  from hook claims phrased as Q/A ("Peut-on se garer facilement à Port d'Alon ?").
- `lastmod` in sitemap from max(claim.updatedAt, latest StatusLog) — freshness
  is our ranking story.
- Internal linking: index → places; place → alternatives; place → landing.

## LLM SEO (being citable by assistants is a distribution channel)

- Clean semantic HTML: one `<h1>`, status in a `<section aria-label="Statut du jour">`,
  claims as short standalone `<p>` sentences (no mid-sentence spans/links).
- `llms.txt` at root: mission, territory, page list, update cadence, contact.
- Visible plain-text dateline on every page: "Statut vérifié le 21 juillet 2026 à 18h12."
- Never gate content behind JS-only rendering; status must be in server HTML.

## Index page `/lieux`

List (not map) of ACTIVE places ordered by `demandRank`: name, commune, type,
today's status chip, one hook claim. A single quiet line at top states territory
coverage honestly: "Couverture actuelle : littoral Marseille–Bandol et Sainte-Baume.
D'autres lieux arrivent." Empty/thin coverage is stated, not hidden.

## Components (shadcn/ui base, styled per 09-design.md)

`StatusBlock`, `StatusChip`, `ClaimList`, `ClaimItem`, `WhatsAppCTA`,
`AlternativeCallout`, `PlaceCard`, `Dateline`, `SiteFooter` (who we are, sources
honesty note, link to méthodologie section on landing).

## Accessibility & perf floor

Keyboard focus visible, color-independent status (icon + label, never color alone),
reduced-motion respected, images `next/image` with dimensions, LCP < 2.5s on 4G.
