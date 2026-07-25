# 04 — Signal Ops (fire access, water, air)

Daily updates happen through `/admin/statut`, inside the same admin tool as
`11-admin-ingestion-ui.md`. This file specifies the zone model, the status
resolution rules (non-trivial — ZAPEF exceptions), the daily manual page, and
the automation path.

## Why zones, not places

A préfecture publishes one level per official massif, not per place, and several
places share a massif. Updating per-place scales daily work with place count;
updating per-zone scales it with the number of official massifs (9 in the Var,
~25 in the Bouches-du-Rhône, of which a handful matter for this territory).
`SignalZone` is the unit the daily page operates on.

**Zone → place assignment lives on `/admin/places`** (Surface 1 of
`11-admin-ingestion-ui.md`), not on `/admin/sources`: which massif covers a
place is a place-level fact, set once at place creation. `/admin/sources` only
manages sources and their zone definitions.

## The official source (verified July 2026)

All Mediterranean-rim préfectures (13, 83, 84, 30, 34, 2A/2B, 66…) publish
massif access through **one shared platform** operated by Entente Valabre with
Météo-France: `risque-prevention-incendie.fr/{dept}`. One integration covers
both départements of this territory.

**Publication cadence**: re-evaluated every evening and published **before
19h** (the Var page states an 18h update) for **the whole of the following
day**. It is a scheduled forecast decision, not a live feed — it does not
normally get revised mid-day. This is why `StatusLog.forDate` is the day the
status *applies to*, not the day it was read.

**Var — the nine official massifs** (seed these as `SignalZone`s, labels
verbatim, `externalRef` = the official number):

1 MONTS TOULONNAIS · 2 SAINTE BAUME · 3 HAUT VAR · 4 CORNICHE DES MAURES ·
5 MAURES · 6 CENTRE VAR · 7 PLATEAU DE CANJUERS · 8 ESTEREL · 9 ILES D'HYERES

For this territory, Sainte-Baume and Monts Toulonnais are the load-bearing ones.
Bouches-du-Rhône zones (Calanques, Étoile-Garlaban, Sainte-Victoire, Côte
Bleue…) are enumerated on the `/13` map; seed only those covering active places.

**Levels** — five tiers, official legend (the map renders the fifth as black):

| value | official meaning |
|-------|------------------|
| `vert` | accès et travaux autorisés |
| `jaune` | accès autorisé, travaux sous conditions |
| `orange` | accès déconseillé, travaux à risque interdits |
| `rouge` | **accès interdit hors ZAPEF**, travaux interdits |
| `extreme` | accès et travaux interdits partout, **sans exception** (carte : noir, « EXTRÊME ») |

(`extreme` replaces the earlier `rouge-extreme` value — match the official
five-tier vocabulary so the admin UI and the official map read identically.)

## ZAPEF — the exception that makes naive resolution wrong

Certain designated, managed sites keep public access **at `rouge`, when the
surrounding massif is closed**. The Var's ZAPEF list includes **Calanque Port
d'Alon** by name — the official version of what Saint-Cyr described by email.

Rules, in order:

1. `zone.value ≤ orange` → place open per the zone's normal rules.
2. `zone.value = rouge` **and** `place.zapef = true` → open under **restricted
   conditions** (Port d'Alon: 8h–17h, pinède + plage principale only, reduced
   parking). The restriction text comes from a `DECODING` claim on that place,
   not from the zone.
3. `zone.value = rouge` **and** `place.zapef = false` → closed.
4. `zone.value = extreme` → **closed regardless of ZAPEF.** No exception exists
   at this level.

**Known limitation, state it rather than engineer for it**: a préfecture can
suspend an individual ZAPEF's dérogation by separate decision (this has
happened — a 2024 decision suspending Le Faron). Rare, published as a standalone
PDF, not reflected in the daily map's colour. MVP does not detect it; the status
block's official-source link and the active-fire caveat below are the mitigation.

## Two caveats that belong in the product, not just the spec

**Météo des forêts ≠ massif access.** Météo-France's national "Météo des
forêts" gives a general danger level by département; it announces neither
closures nor active fires. Many hikers treat it as the access answer. It is
not — the authoritative source is the préfecture's arrêté-backed map. Two
consequences: (a) never source `FIRE_ACCESS` status from Météo-France, and
(b) write this as a public `DECODING` claim — it's a real trap a generic AI
answer won't warn anyone about.

**An active fire is not on this map.** The daily decision is a scheduled risk
assessment; a fire in progress can close things the map still shows as open.
The status block copy must carry, on `orange`/`rouge`/`extreme` days: *« En cas
de fumée ou de consignes des secours sur place, suivez-les même si la carte
indique autre chose. »* Cheap to add, and it's the kind of honesty the whole
product's trust rests on.

## Setup (rare — `/admin/sources`)

1. One `SignalSource` per institution: provider, url, signalType,
   updateSchedule, format. Initial set: fire-83 (Préfecture du Var,
   `risque-prevention-incendie.fr/var`), fire-13 (Préfecture des
   Bouches-du-Rhône, `/bouches-du-rhone`), water-ars (baignades, per monitored
   beach), air-atmosud (ATMO Sud, per commune/sector).
2. Its `SignalZone`s, labels and `externalRef` copied verbatim from the official
   map (list above for the Var), each with `parseNotes` decoding its levels for
   the places it covers.
3. Place coverage is assigned from `/admin/places`, not here.

## Daily page — `/admin/statut`

One screen, one row per active zone, under a minute on a normal day.

- Zone label + signal-type icon; **one-tap level buttons** (five tiers for fire,
  the equivalent set per signal type) using the `09-design.md` status tokens —
  no dropdowns, no typing in the common case.
- Detail field pre-filled from the zone's `parseNotes` for the selected level,
  editable in place.
- **Default: yesterday's value, pre-selected** — an unchanged zone needs zero
  taps.
- Per-row freshness marker distinguishing **three** states, and this distinction
  is load-bearing: *confirmed today* (you opened the source and saved),
  *carried forward* (defaulted, not confirmed), *not checked* (source never
  opened today). Do not let the global save collapse these into one — the
  question that matters is "did I look at the source today," not "did the value
  change."
- Bottom: one **Confirmer / Enregistrer**. Writes one `StatusLog` per zone
  (`forDate` = tomorrow for `FIRE_ACCESS`, today for water/air), sets
  `confirmedAt`, and revalidates every place under any zone whose value or
  detail changed (join through `ZonePlace`).
- A zone you never opened writes no row → places under it show the loud « non
  vérifié » state per `03-public-site.md`. Honesty stays the default failure
  mode.

Workflow: open the two préfecture maps (bookmarks), tap the 1–2 zones that
flipped, glance-confirm the rest, save.

## Automation — do this early, not "when it hurts"

Earlier versions of this spec deferred automation until the manual routine
started slipping. The platform finding changes that calculus: the maps are
served by a **Lizmap/QGIS Server OGC stack** at `opendfci.fr` exposing
documented **WMS / WMTS / WFS** endpoints with `GetCapabilities`. WFS
`GetFeature` returns structured GeoJSON with per-polygon attributes — a real
queryable API, not brittle HTML scraping. Same platform for both départements,
so one parser covers the territory.

**Verify before building**: the layer confirmed so far is the *travaux*
(professional works) risk map, which is a distinct regulatory layer from
*public access*. A sibling layer for access almost certainly exists on the same
service — confirm the exact layer name via `GetCapabilities` and pull a sample
`GetFeature` response before writing the parser. Do not assume the two layers
are interchangeable; the whole product's credibility rides on serving the right
one.

**Sequencing**: run week one manually anyway — you want to learn the zone list
and hit the ZAPEF edge cases by hand before trusting a script with them. Then
build the WFS integration in weeks 2–3, ahead of coverage expansion.

The scraper writes to the same `SignalZone`/`StatusLog` shape and coexists with
the manual page: an automated value is just a save with `confirmedAt` set by a
script, and `/admin/statut` still shows it and allows same-day manual override.

## Normalized values

FIRE_ACCESS: `vert | jaune | orange | rouge | extreme`
WATER_QUALITY: `excellente | bonne | suffisante | insuffisante | interdite`
AIR_QUALITY: `bon | moyen | degrade | mauvais | tres-mauvais | extremement-mauvais`

## What the log buys us

`StatusLog` history compounds into probabilistic claims nobody else can write
(« cette zone a été fermée 11 jours en juillet, surtout par mistral établi »)
and later validates any prediction feature. It's free moat; a skipped day is a
hole in a dataset, not just a stale page.
