# Guide Nature de La Ciotat

A free local guide to the calanques, criques and sentiers of La Ciotat and its
surroundings (littoral Marseille–Bandol, Sainte-Baume), written by the people
who live here and curated by Alexandre. Live at https://laciotatnature.fr.

See `spec/00-scope.md` for the mission, current state, non-goals and the map
of the spec files.

## Stack

TypeScript · Next.js 16 (App Router, Cache Components) · React 19 ·
PostgreSQL (Neon) · Prisma 7 · Tailwind CSS 4 · Vercel · pnpm.
Contributor accounts use Better Auth (email magic link) and Resend.
Third-party services and env vars: `spec/08-infra.md`.

## Setup

Requires a Neon Postgres database (or any Postgres reachable over the network;
the project connects via `@prisma/adapter-pg`).

```bash
pnpm install
cp .env.dist .env.local          # fill in the values
pnpm exec prisma migrate deploy  # apply migrations
pnpm exec prisma generate        # generate the Prisma client (also runs on install)
```

Beyond the database and API keys, contributor accounts need
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `EMAIL_FROM` and `ADMIN_EMAIL`;
`RESEND_API_KEY` can stay empty in development, where emails (including
magic links) are printed in the `pnpm dev` terminal.

There is no local database process: `.env.local` (gitignored) points at a Neon
database or branch.

## Development

```bash
pnpm dev      # Next.js dev server
pnpm test     # vitest
pnpm lint     # eslint
pnpm build    # production build (includes type-checking)
```

## Corpus

Places, claims and photos live in Postgres and are managed in the private
admin at `/admin` (Basic Auth, `ADMIN_PASSWORD`). Contributions (tips,
corrections, photos, new places) from signed-in contributors are reviewed in
`/admin/contributions` before anything is published. See
`spec/02-corpus-ops.md` and `spec/05-admin.md`.

```bash
pnpm corpus:check   # validate seed files in src/corpus/places (no DB)
pnpm corpus:seed    # validate, then upsert seed files into Postgres
pnpm corpus:stats   # coverage report
pnpm corpus:score   # compute missing claim quality scores (Jev)
pnpm search:seed    # upsert the landing's search shortcuts
```

Writes made outside the deployed app reach prod within an hour, or
immediately with:

```bash
curl -X POST -H "Authorization: Bearer $REVALIDATE_TOKEN" $NEXT_PUBLIC_SITE_URL/api/revalidate
```

## Project structure

```text
spec/                     # living product/engineering spec (source of truth)
docs/superpowers/specs/   # design specs and records for larger pieces of work
prisma/schema.prisma      # data model
app/                      # Next.js routes: (landing), (public), admin, api
src/auth/                 # Better Auth (magic link, session helper)
src/contributions/        # contribution schemas, submit flow, service
src/email/                # Resend sender and French email templates
src/components/           # UI components
src/corpus/               # queries, validation, taxonomy, photos, ingestion
src/search/               # landing search (SearchAI port + Jev adapter)
src/storage/              # Neon Object Storage (place photos)
src/seo/                  # JSON-LD, llms.txt
scripts/                  # corpus and search CLI scripts
```
