# 00 — Scope

## Mission

The Guide Nature de La Ciotat is a free local guide to the calanques, criques,
sentiers and natural sites of La Ciotat and its surroundings (littoral
Marseille–Bandol, Sainte-Baume). It answers « où aller en nature, avec mes
envies et mes contraintes » with concrete, conditional advice: when to go,
where to park, who it suits, what to avoid.

The guide is **written by the people who live here and curated by
Alexandre**: anyone can read it anonymously; locals who want to contribute
create an account and add tips, corrections, photos or new places; every
contribution is reviewed before publication.

## Current state (October 2026)

Live at https://laciotatnature.fr ("Site en cours de construction" banner).

- **Public site**: landing with AI-ranked search (`04-landing-search.md`),
  places index and place pages with attributed tips, `/contribuer`, About,
  account, privacy and legal pages (`03-public-site.md`).
- **Contributor accounts**: Better Auth email magic link, no password
  (`01-data-model.md`, `08-infra.md`). Contributors add tips, corrections,
  photos and new places through forms; tips are credited by display name and
  commune.
- **Admin** (`/admin`, Alexandre only): places with photos, AI-assisted claim
  capture and review, and the `/admin/contributions` review queue
  (`05-admin.md`).
- **Corpus**: places and claims live in Postgres, entered through the admin or
  approved from contributions (`02-corpus-ops.md`).
- Community contributions (accounts, forms, queue, attribution, reworked
  public pages) shipped in October 2026; design record in
  `docs/superpowers/specs/2026-10-17-community-contributions-design.md`.
  WhatsApp and the concierge `Request` tables are gone.

## Next: polish

No new feature is committed. Small fixes and owner inputs (Tipeee link,
About portrait, success metrics for the community phase) are tracked in
`docs/follow-ups.md`.

## Non-goals

- ❌ No accounts for readers. Accounts exist only for contributors (email
  magic link), with no public profiles, followers, likes or comments. A
  contributor sees only a private list of their own contributions and their
  status on `/compte`.
- ❌ No publication without review. Every contribution is read by Alexandre
  first; there is no trusted-contributor bypass.
- ❌ No generated text shown to visitors. AI ranks and drafts (search
  relevance, claim extraction, quality score); people write what's published.
- ❌ No scraping of third-party content. A web page, post or reel can be a
  lead (`Source`), never published content.
- ❌ No live status layer (fire access, water quality). It was built and
  removed; the site links to the official fire-access map instead.
- ❌ No map-and-filter explorer, no bookings, payments or partnerships, no
  native app.
- ❌ No multi-region. Territory is hardcoded to the littoral 13 + ouest Var +
  Sainte-Baume.

## Success metrics

Not defined for the community phase yet. The original concierge metrics
(WhatsApp requests, return rate) no longer apply.

## Stack

TypeScript · Next.js 16 (App Router, Cache Components) · React 19 ·
PostgreSQL on Neon · Prisma 7 · Tailwind CSS 4 · Vercel · pnpm. Details and
third-party services in `08-infra.md`.

## Spec map

| File | Covers |
|---|---|
| `01-data-model.md` | Prisma models (corpus, auth, contributions) and data rules |
| `02-corpus-ops.md` | How places and claims enter the corpus, quality bar |
| `03-public-site.md` | `/lieux`, `/lieux/[slug]`, `/contribuer`, contribution forms, account, About, shared chrome |
| `04-landing-search.md` | Landing page and Jev-powered search |
| `05-admin.md` | `/admin`: places, photos, capture, review, contributions queue |
| `06-design.md` | Visual language |
| `07-seo.md` | SEO and AI-SEO |
| `08-infra.md` | Hosting, services (auth, email), env vars, analytics |
