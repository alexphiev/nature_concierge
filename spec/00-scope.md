# 00 — Scope

## Mission (5 lines)

We are building the local guide that no office de tourisme can be: structurally neutral,
cross-commune, opinionated, and condition-aware. It answers "où aller dans la nature,
là, maintenant, avec mes contraintes" for the littoral between Marseille and Bandol
(+ Sainte-Baume) at the quality of an excellent human local — because its knowledge
is a hand-verified corpus of claims and real-time access data, not open-web mush.

## The MVP's single job

**Strangers find place pages, trust them, and open a WhatsApp conversation.**

The MVP is a shop window plus a logbook:

1. A public site: places index + one page per place, with a live status block
   (fire access / water quality) and a curated subset of claims.
2. A landing page explaining the mission, converting to a WhatsApp chat.
3. A Postgres database implementing the corpus schema, fed by seed files in the repo.
4. Operational scripts for daily status updates and concierge request logging.

The concierge itself is **a human (Alexandre) on WhatsApp**. There is no AI answering
engine in this MVP. The AI-facing value of this phase is producing a v1-compatible
corpus while validating demand.

## Explicit non-goals (any PR touching these is rejected)

- ❌ No AI chat/answering engine, no RAG pipeline, no embeddings.
- ❌ No scrapers or cron automation (daily status is updated by a manual script run).
- ❌ No user accounts, auth, or profiles.
- ❌ No admin UI for the public-facing product (no user accounts, no CMS for
  visitors). A **private corpus-ingestion/review tool** at `/admin` for
  Alexandre only is in scope — see `10-corpus-ingestion.md`. It drafts
  Place/Claim records from pasted text or photos for manual approval; it does
  not replace the seed-file pipeline as the system of record, it feeds it.
- ❌ No map-and-filter explorer UI. (The index page is a list, not a map product.)
- ❌ No multi-region anything. Territory is hardcoded: littoral 13 + Var ouest + Sainte-Baume.
- ❌ No bookings, no payments, no partnerships features.
- ❌ No native app.

## Success metrics (pre-committed — do not revise after launch)

Concierge (3-week window from first seeded post):

- ≥ 25 completed requests.
- ≥ 20% of users return with a second request or an unprompted follow-up within 3 weeks.
- Median time-per-answer < 30 min by request #15 (corpus reuse must be kicking in).
- ≥ 3 unprompted referrals.

Site (first 6 weeks):

- Place pages indexed; impressions visible in Search Console for
  "[place] ouvert aujourd'hui" / "parking [place]" query patterns.
- Measurable page → WhatsApp clicks (event per place).

If most concierge thresholds are missed at end of August, the project loses the
prioritization decision against the resale SaaS. The metrics exist to make that
decision mechanical, not emotional.

## Order of build

1. `01-data-model.md` (Prisma schema + migrations)
2. `02-corpus-ops.md` (seed pipeline + validation)
3. `03-public-site.md` + `09-design.md` (public pages)
4. `05-landing.md` (landing + WhatsApp CTA)
5. `04-signal-ops.md` (daily status page inside `/admin`, zone-grouped)
6. `06-concierge-ops.md` + `07-measurement.md` (operations)
7. `08-infra.md` (deploy — time-boxed to 45 minutes of decisions)
8. `10-corpus-ingestion.md` (private `/admin` capture tool — purpose, access,
   extraction philosophy, image storage) then `11-admin-ingestion-ui.md`
   (authoritative routes, data model, server actions for `/admin/places`,
   `/admin/ingest`, `/admin/review`). Build after the above are live; this is a
   productivity layer on top of a working seed pipeline, not a dependency of it.

## Stack (fixed)

TypeScript · Next.js 16 (App Router) · PostgreSQL · Prisma · Tailwind + shadcn/ui ·
pnpm · EEA hosting. See `08-infra.md`.
