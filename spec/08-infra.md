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

`local` (docker-compose Postgres) and `production`. No staging — the MVP's
blast radius is one person's reputation, protected by `pnpm corpus:check` in CI.

## CI (GitHub Actions)

On PR: typecheck, lint, `pnpm corpus:check`, build.
On main: same + deploy + `pnpm corpus:seed` against prod (idempotent) — seed
runs as a deploy step so corpus edits ship like code.

## Secrets

`DATABASE_URL`, `REVALIDATE_TOKEN` (status script → revalidation route),
analytics domain key, `ADMIN_PASSWORD` (private `/admin` access, see
`10-corpus-ingestion.md`), `GEMINI_API_KEY` (Gemini Flash extraction for
`/admin`'s corpus ingestion tool — the one deliberate exception to "no LLM
calls" in the public-facing product; it's a private capture aid, not the
public site or the concierge answering engine). Any other third-party API
key beyond these is scope creep made visible.

## Backups

Provider's automated PG backups + weekly `pg_dump` artifact to object storage.
The corpus itself is already in git; the irreplaceable data is **StatusLog +
Request** — verify those two tables restore correctly, once.

## Cost ceiling

< €25/month all-in at MVP scale. Anything above that number requires deleting
something, not budgeting more.
