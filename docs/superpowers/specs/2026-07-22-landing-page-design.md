# Design — Landing Page + SEO Scaffolding

Source specs: `spec/00-scope.md`, `spec/05-landing.md`, `spec/03-public-site.md`,
`spec/09-design.md`.

## Goal

Build the mission page (`/`) that converts a stranger into a WhatsApp
conversation in 20 seconds, and close out the SEO scaffolding deferred from
the public-site build step (`sitemap.ts`, `robots.ts`, `llms.txt` — deferred
specifically until landing existed, since the sitemap requires "ACTIVE
places + landing + index").

## Scope

**In:**
- `app/page.tsx` — replaces the `create-next-app` boilerplate with the real
  landing page.
- `src/components/LandingWhatsAppCTA.tsx` — new, dedicated component (kept
  separate from the existing place-page `WhatsAppCTA`, since the two need
  different labels, different pre-filled templates, and different call
  contexts — forcing one component to branch on "am I on the landing page or
  a place page" was judged worse than two small, single-purpose components).
- `app/sitemap.ts` — `/`, `/places`, `/places/[slug]` per ACTIVE place.
- `app/robots.ts` — allow-all, points at the sitemap.
- `public/llms.txt` — static file per `03-public-site.md`'s LLM SEO section.

**Out (deferred to later spec steps):**
- Real analytics event firing (`whatsapp_click { source: "landing" }`) —
  `07-measurement.md`. Landing's CTA gets the same marked
  `// TODO(07-measurement)` no-op pattern already used on place pages.
- A real photo of Alexandre — none exists yet. Renders a quiet
  `--calcaire-deep` placeholder panel instead, per `09-design.md`'s own
  imagery rule ("never a placeholder stock image").
- `/statut` — still explicitly phase-2/optional per spec, not built.

## Spec corrections made while reading closely

Three `/lieux` route references in `03-public-site.md` (route table, the
revalidation call, the index-page heading) and one in `05-landing.md`
(secondary CTA link) still referred to the old French route naming, from
before routes were chosen as English (`/places`). Fixed in the spec files
directly (already committed) so the spec matches what was actually built.

## Landing page structure (`app/page.tsx`)

Five sections, fixed order per `05-landing.md`:

1. **Hero** — H1 "Le guide local qui vous dit où aller. Et où ne pas aller.",
   subhead, primary `LandingWhatsAppCTA`, secondary link to `/places`
   ("Voir les lieux couverts").
2. **Why this exists** — 3 short blocks, no icon soup, plain text with the
   spec's exact three headlines ("Personne ne centralise l'essentiel.",
   "Un office de tourisme défend sa commune.", "Des conseils qu'aucune IA
   générique ne connaît.").
3. **How it works** — 3 steps, one line each, per spec's exact copy.
4. **Trust markers** — who (Alexandre, quiet placeholder panel instead of a
   photo), method (sources officielles, date de vérification, "quand on ne
   sait pas, on le dit"), free/no-account note.
5. **Final CTA repeat + footer** — repeats `LandingWhatsAppCTA`, reuses the
   existing `SiteFooter` component from the public-site build.

All copy is verbatim from `05-landing.md`, not paraphrased — the spec
already wrote the final copy.

## `LandingWhatsAppCTA` component

```tsx
const message = `Bonjour ! Je cherche une idée de sortie nature.
Quand : … / Qui : … (enfants, chien, mobilité…) / Où en gros : … /
Contraintes : … (météo, marche, parking…)`;
```

Label: "Demander un plan sur WhatsApp". Same `bg-mediterranee` solid-button
styling as place-page `WhatsAppCTA` (the only filled buttons on the site),
same `NEXT_PUBLIC_WHATSAPP_NUMBER` env var, same missing-number
`console.warn` pattern already established in `WhatsAppCTA.tsx`. Analytics
is a marked no-op: `// TODO(07-measurement): fire whatsapp_click { source:
"landing" } analytics event on click.`

## SEO scaffolding

**`app/sitemap.ts`**: entries for `/`, `/places`, and `/places/${slug}` for
every place returned by `getActivePlaces()`. `lastmod` per place computed as
`max(claim.updatedAt across that place's public claims, latest StatusLog
row's checkedAt)` — per `03-public-site.md`'s freshness-as-ranking-signal
rule. This requires a new query helper (`getPlaceFreshness` or folded into
an extended `getActivePlaces`) since no existing query returns both
`claim.updatedAt` and the latest `StatusLog.checkedAt` together. `/` and
`/places` get today's date as `lastmod` (they're not corpus-driven).

**`app/robots.ts`**: `{ rules: { userAgent: "*", allow: "/" }, sitemap:
"<origin>/sitemap.xml" }` — standard Next.js `MetadataRoute.Robots` shape.

**`public/llms.txt`**: static plain-text file, not code-generated. Content:
mission (condensed from `00-scope.md`'s 5-line mission), territory
("littoral 13 + Var ouest + Sainte-Baume" per scope's non-goals section,
phrased positively as coverage rather than negatively as a non-goal), page
list (`/`, `/places`, `/places/[slug]` pattern), update cadence ("statuts
mis à jour quotidiennement vers 18h"), contact (WhatsApp number reference,
not the raw number — points to the landing page's CTA).

## Testing / verification

- `pnpm build` succeeds; `/` renders as a static route alongside the
  existing `/places` routes.
- Visual check against `05-landing.md`'s exact copy — every string on the
  page should be traceable to spec text, no paraphrasing.
- `curl localhost:3000/sitemap.xml` returns valid XML containing `/`,
  `/places`, and `/places/port-d-alon` (the one seeded place).
- `curl localhost:3000/robots.txt` returns valid robots directives pointing
  at the sitemap.
- `curl localhost:3000/llms.txt` returns the static file content.
- Both `LandingWhatsAppCTA` instances (hero + final CTA) produce a correctly
  URL-encoded `wa.me` link with the full intake template (verify French
  accented characters survive encoding, as already verified for the
  place-page CTA in the prior plan).

## Out of scope for this step (explicit non-goals)

Matches `05-landing.md`'s own explicit non-goals: no email capture, no
newsletter, no testimonials section, no pricing section. Matches
`00-scope.md`'s project-wide non-goals otherwise.
