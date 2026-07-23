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

Every conversation becomes a `Request` row via `/admin/requests/new`, inside
the same `/admin` tool from `10-corpus-ingestion.md`, using the same
draft-then-review pattern: paste the WhatsApp conversation text, Gemini Flash
drafts the structured fields — `requestType` tagged against the taxonomy,
`constraintsGiven` extracted, `placesRecommended` and `claimsUsed` suggested
via match against the corpus — and you edit/confirm on one screen before it
saves. This is the highest-frequency admin task (up to 25+ times in three
weeks, usually from a phone right after the conversation), so it gets the
lowest-friction interface, reusing infrastructure rather than adding a new one.

Fields to confirm: channel, userRef, requestText (the paste itself, kept
verbatim), requestType, constraintsGiven, placesRecommended, claimsUsed,
claimsCreated (any new claim written to answer this request — links back into
the corpus), timeSpentMin (log honestly, it's a threshold metric), outcome.

Outcome updates (`USER_REPORTED_BACK`, `RETURNED_NEW_REQUEST`,
`REFERRED_SOMEONE`) are edits to the same row from `/admin/requests`, a simple
list view with an edit action — no separate CLI path.

A reported-back observation ("parking plein dès 9h30 finalement") is gold:
update outcome AND create/refresh the corresponding claim with
`verification: LOCAL_TESTIMONY` → upgrade to `FIELD_VERIFIED` when confirmed —
this can happen directly from the request row via a "create claim from this"
shortcut that pre-fills the ingestion draft with the observation as input text.

## Seeding plan (staggered, one channel every few days, UTM/channel tagged)

1. r/marseille post (passion framing, no company name).
2. 2–3 Facebook groups (randonnée 13, sorties famille Marseille/Aubagne, groupes ciotadens).
3. One camping La Ciotat–Saint-Cyr: QR card at reception → landing with `?src=camping`.
4. OT counters visited for fieldwork get the URL only if they ask.

## Pre-committed thresholds (copied from 00-scope; do not edit here)

≥ 25 completed requests · ≥ 20% return/follow-up within 3 weeks · median
time-per-answer < 30 min by request #15 · ≥ 3 unprompted referrals.

## Weekly ritual (30 min, Sunday)

Check `/admin/metrics` (see `07-measurement.md`) — reuse rate ↗ ? gap rate ↘ ?
which channel produced requests? which pages got impressions? Decide next
week's field visit + claims backlog from actual gaps, not interest.
