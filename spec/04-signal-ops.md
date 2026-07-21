# 04 — Signal Ops (real-time layer, manual by design)

Automation is explicitly deferred. This file specifies the **manual** daily
workflow precisely enough that (a) it takes < 10 minutes/day, (b) it produces
clean `StatusLog` history, (c) it becomes the scraper spec later without rework.

## Registered signal sources (initial set)

| id | signalType | provider | url | schedule | format | parseNotes |
|----|-----------|----------|-----|----------|--------|------------|
| fire-83 | FIRE_ACCESS | Préfecture du Var | var.gouv.fr carte massifs | daily ~18h, veille pour lendemain | carte web | Couleur par massif. Port d'Alon: jaune/vert/orange = ouvert 5h–23h; rouge = 8h–17h pinède+plage principale, parking réduit; rouge extrême = fermé y compris piétons. |
| fire-13 | FIRE_ACCESS | Préfecture des Bouches-du-Rhône | carte "envie de balade" | daily ~18h | carte web | Vert = autorisé; Rouge = interdit. Couvre Calanques, Sainte-Baume 13, Saint-Cyr-adjacent massifs côté 13. |
| water-ars | WATER_QUALITY | ARS / baignades.sante.gouv.fr | site national | saison, hebdo + alertes | site | Relever classement + interdictions temporaires par plage couverte. |
| air-atmosud | AIR_QUALITY | ATMO Sud | atmosud.org | daily | site/API | Indice ATMO du jour par commune; ne bloque pas l'accès, informe le conseil. |

Coverage mapping lives in `src/corpus/signal-sources.ts`
(`covers: ["port-d-alon", "calanque-x", …]`). **One préfecture map covers many
places — this mapping is the aggregation work and must be exhaustive per place.**

## Daily workflow (18h00–18h10, phone-compatible)

1. Open fire-83 and fire-13 maps (bookmarks).
2. Run `pnpm status:update` — an interactive CLI that:
   - iterates active SignalSources,
   - shows `parseNotes` for each,
   - prompts for the normalized value per covered massif/zone
     (one input can fan out to many places via the coverage mapping),
   - writes `StatusLog` rows with `forDate = tomorrow` (fire) / `today` (air/water),
   - calls the revalidation endpoint for affected place pages,
   - prints a summary ("14 places updated, 2 sources skipped").
3. Skipped source (site down, no time) ⇒ **no row written** ⇒ pages show the
   loud "non vérifié" state automatically. Honesty is the default failure mode.

`--value` flags allow non-interactive use
(`pnpm status:update --source fire-83 --zone "La Ciotat" --value rouge`).

## Normalized values

FIRE_ACCESS: `vert | jaune | orange | rouge | rouge-extreme` (+ per-place `detail`
string rendered from parseNotes decoding).
WATER_QUALITY: `excellente | bonne | suffisante | insuffisante | interdite`.
AIR_QUALITY: `bon | moyen | degrade | mauvais | tres-mauvais | extremement-mauvais`.

## What the log buys us (do not skip logging even when busy)

`StatusLog` history compounds into probabilistic claims nobody else can write
("massif fermé 11 jours en juillet, surtout par mistral établi") and later
trains/validates any prediction feature. It is free moat; a skipped day is a
hole in a dataset, not just a stale page.

## Automation trigger (when, not if)

When the manual routine is skipped ≥ 3 days in any 14-day window, or territory
exceeds ~25 covered places, write the scraper for fire-83/fire-13 first
(most valuable, most parseable). The scraper implements exactly this spec:
same sources, same normalized values, same fan-out mapping, same revalidation.
