# 08 — Infra (time-boxed: 45 minutes of decisions, total)

## Decisions

- **Domain**: one .fr, French name, chosen fast; the brand test is later, the
  SEO clock starts now. Redirect www → apex.
- **Hosting**: Vercel (EU region for functions where selectable) — accepting the
  pragmatic trade for MVP speed. If strict EEA posture is preferred: Scaleway
  or OVH + coolify. Do not spend more than 15 minutes on this choice; the site
  is public content, the sensitive asset is the DB.
- **PostgreSQL**: Neon (EU region) or Scaleway managed PG. One database,
  `main` branch only. Connection via Prisma with pooling (Neon pooler / pgbouncer).
- **Analytics**: Plausible EU cloud (fastest) — revisit only if cost annoys.
- **WhatsApp**: dedicated number (dual-SIM or eSIM), WhatsApp Business app
  (greeting message + away message configured per 06 response promise).

## Environments

`local` and `production` share a single Neon database (EU region) — local
dev connects via `DATABASE_URL` in `.env.local`. No staging, no per-branch
Postgres. The MVP's blast radius is one person's reputation, protected by
`pnpm corpus:check` in CI.

## CI (GitHub Actions)

On PR: typecheck, lint, `pnpm corpus:check`, build.
On main: same + deploy + `pnpm corpus:seed` against prod (idempotent) — seed
runs as a deploy step so corpus edits ship like code.

## Secrets

`DATABASE_URL`, `GEMINI_API_KEY` (extraction calls, see `10-corpus-ingestion.md`),
`ADMIN_PASSWORD` (or session secret, see `10-corpus-ingestion.md`), analytics
domain key. Admin-triggered revalidation reuses the admin session — no
separate revalidation token needed. Any additional third-party API key beyond
Gemini is scope creep made visible; there is no scraping and no other model
provider in the MVP.

## Backups

Provider's automated PG backups + weekly `pg_dump` artifact to object storage.
The corpus itself is already in git; the irreplaceable data is **StatusLog +
Request** — verify those two tables restore correctly, once.

## Cost ceiling

< €25/month all-in at MVP scale. Anything above that number requires deleting
something, not budgeting more.
