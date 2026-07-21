# 06 — Concierge Ops (the human process; the MVP's actual product)

## Intake (the guide's four questions)

If the pre-filled template arrives incomplete, ask at most one grouping message:

1. **Qui** — adultes/enfants (âges), chien, mobilité (poussette, PMR, seniors).
2. **Quand** — jour + créneau (matin/après-midi/soirée), flexible ou pas.
3. **Déjà vu / envies** — ce qu'ils connaissent, ce qu'ils aiment (baignade,
   marche, calme, paysage).
4. **Contraintes** — voiture ou pas, tolérance marche/chaleur/vent, budget temps.

## Answer protocol

- Response time promise: quelques heures, même jour avant 20h.
- **Claims-or-silence rule**: every recommendation sentence must trace to a
  claim row or a StatusLog row. No corpus coverage ⇒ say so honestly
  ("je n'ai pas encore de quoi bien répondre sur X") + offer nearest covered
  alternative. Never answer from general knowledge under our name.
- Structure of a good answer: main pick (with the why: conditions + audience
  fit), the micro-logistics (heure cible, où se garer), the plan B (alternative
  edge), the official check ("vérifiez la carte préfecture ce soir après 18h" +
  link), one closing feedback ask.
- Closing ask (verbatim, always): "Dites-moi si le parking / l'accès était ok —
  ça aide le prochain."
- Tone: le bon guide du coin. Opinionated allowed and expected ("évitez X
  dimanche, franchement").

## Logging discipline (same day, no exceptions)

Every conversation becomes a `Request` row via `pnpm request:log` — interactive
CLI prompting for: channel, userRef, requestText (paste), requestType,
constraintsGiven (taxonomy picker), placesRecommended, claimsUsed (fuzzy search
by place), claimsCreated, timeSpentMin, outcome. Outcome updates
(`USER_REPORTED_BACK`, `RETURNED_NEW_REQUEST`, `REFERRED_SOMEONE`) are edits to
the same row via `pnpm request:log --update <id>`.

A reported-back observation ("parking plein dès 9h30 finalement") is gold:
log outcome AND create/refresh the corresponding claim with
`verification: LOCAL_TESTIMONY` → upgrade to `FIELD_VERIFIED` when we confirm.

## Seeding plan (staggered, one channel every few days, UTM/channel tagged)

1. r/marseille post (passion framing, no company name).
2. 2–3 Facebook groups (randonnée 13, sorties famille Marseille/Aubagne, groupes ciotadens).
3. One camping La Ciotat–Saint-Cyr: QR card at reception → landing with `?src=camping`.
4. OT counters visited for fieldwork get the URL only if they ask.

## Pre-committed thresholds (copied from 00-scope; do not edit here)

≥ 25 completed requests · ≥ 20% return/follow-up within 3 weeks · median
time-per-answer < 30 min by request #15 · ≥ 3 unprompted referrals.

## Weekly ritual (30 min, Sunday)

Run `pnpm corpus:stats` + request metrics query; review: reuse rate ↗ ?
gap rate ↘ ? which channel produced requests? which pages got impressions?
Decide next week's field visit + claims backlog from actual gaps, not interest.
