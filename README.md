# Nature Concierge

The local guide that no office de tourisme can be: structurally neutral,
cross-commune, opinionated, and condition-aware. It answers "où aller dans
la nature, là, maintenant, avec mes contraintes" for the littoral between
Marseille and Bandol (+ Sainte-Baume) at the quality of an excellent human
local — because its knowledge is a hand-verified corpus of claims and
real-time access data, not open-web mush.

See `spec/00-scope.md` for the full mission, MVP scope, and non-goals.

## Stack

TypeScript · Next.js 16 (App Router) · PostgreSQL (Neon) · Prisma 7 ·
Tailwind + shadcn/ui · pnpm

## Setup

Requires a Neon Postgres database (or any Postgres instance reachable over
the network — the project connects via `@prisma/adapter-pg`).

```bash
pnpm install
cp .env.dist .env.local   # fill in DATABASE_URL with your Neon connection string
pnpm exec prisma migrate deploy   # apply migrations
pnpm exec prisma generate         # generate the Prisma client
```

There is no local database process to run — `.env.local` (gitignored)
should point at your own Neon database (or branch, for isolated dev/test).

## Development

```bash
pnpm dev      # start the Next.js dev server
pnpm test     # run the test suite (vitest)
pnpm lint     # run eslint
pnpm build    # production build
```

## Corpus

The corpus (places, claims, sources) is versioned data in the repo, authored
as typed TypeScript files under `src/corpus/places/`, validated by zod, and
loaded into Postgres by a seed pipeline. There is no admin UI — git is the
audit trail. See `spec/02-corpus-ops.md` for the full design.

```bash
pnpm corpus:check   # validate every place file (no DB required)
pnpm corpus:seed    # validate, then upsert places/claims/sources into Postgres
pnpm corpus:stats   # print a coverage report (claims per place, verification mix, re-verification backlog)
```

`corpus:seed` is idempotent (upserts by slug) and never deletes rows —
retiring a place or claim is a manual status change in its source file, not
a delete. After seeding or editing via a local admin against the shared DB,
the prod cache refreshes within 1 hour, or immediately with
`curl -X POST -H "Authorization: Bearer $REVALIDATE_TOKEN" $NEXT_PUBLIC_SITE_URL/api/revalidate`.

## Project structure

```text
spec/                     # the product/engineering spec, source of truth for build order
docs/superpowers/         # design docs and implementation plans for each build step
prisma/schema.prisma      # the corpus data model
src/corpus/               # taxonomy, zod validation, place-file authoring API (definePlace)
src/corpus/places/        # one file per place: place + its claims + sources
scripts/corpus/           # corpus:check / corpus:seed / corpus:stats CLI scripts
app/                      # Next.js App Router pages
```

## Build order

See `spec/00-scope.md` for the full sequence. In short:

1. Data model + corpus ops (schema, validation, seed pipeline) — done
2. Public site (places index + place pages)
3. Landing page + WhatsApp CTA
4. Signal ops (daily status update script)
5. Concierge ops + measurement
6. Infra (deploy)
