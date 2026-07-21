# Design — Step 1: Data Model + Corpus Ops

Source specs: `spec/00-scope.md`, `spec/01-data-model.md`, `spec/02-corpus-ops.md`.

## Goal

Stand up Postgres locally, define the full corpus schema, and prove the
"knowledge enters as versioned code, not admin-UI data entry" loop end to end:
author one real place as a typed file → validate with zod → seed into Postgres
→ query a coverage report. This is the foundation every later spec step
(public site, signal ops, concierge ops) reads from.

## Scope

**In:**
- Local Postgres via docker-compose
- `prisma/schema.prisma` — the complete schema from `01-data-model.md`
  (all models/enums, including `SignalSource` / `StatusLog` / `Request` for
  FK integrity, even though nothing seeds them yet)
- Initial migration + generated Prisma client
- `src/corpus/taxonomy.ts` — const arrays + zod enums for `CONDITIONS`,
  `AUDIENCES`, `REQUEST_TYPES`
- `src/corpus/schema.ts` — zod schemas mirroring Prisma plus the business
  rules from `02-corpus-ops.md`, and the `definePlace` helper
- `src/corpus/places/port-d-alon.ts` — the worked example from the spec
- CLI scripts: `pnpm corpus:check`, `pnpm corpus:seed`, `pnpm corpus:stats`

**Out (deferred to later spec steps):**
- `signal-sources.ts` and any `SignalSource`/`StatusLog` seed data (→ 04)
- `Request` seed data or logging CLI (→ 06)
- CI wiring for `corpus:check` (→ 08)
- Any UI/route (→ 03, 05)

## Environment

`.env.dist` documents required vars (committed, no secrets):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nature_concierge
```
`.env.local` (gitignored) holds the actual local value, same default.

`docker-compose.yml` runs a single `postgres:16` service on port 5432 with a
named volume, matching the `.env.dist` default so `docker compose up -d` +
`pnpm prisma migrate dev` works with zero configuration.

## Business rules → zod (from `02-corpus-ops.md`)

Enforced in `src/corpus/schema.ts`, checked by `corpus:check`:

1. `conditions` non-empty unless `decayClass === "PERMANENT"`.
2. `verdict === "ALTERNATIVE"` ⇒ `alternativePlaceSlug` present and resolves
   to a place defined elsewhere in the corpus.
3. Every claim's `source` key resolves within its own file's `sources` map.
4. `verifiedOn` ≤ today; `SEASONAL` claims with `verifiedOn` older than 1 year
   collect into a warning list (not a hard failure).
5. `conditions` / `audience` values ∈ `taxonomy.ts`.
6. `slug` unique across all place files; `departement` ∈ `{"13","83"}`.
7. `claimText` ≤ ~220 chars, single-sentence heuristic (warning, not failure).

`corpus:check` exits non-zero on any hard failure (1–3, 5, 6); prints
warnings for soft ones (4, 7) without failing.

## CLI scripts

All three live under `scripts/corpus/` and are wired as `pnpm` scripts.

- **`corpus:check`** — imports every file under `src/corpus/places/`, runs
  it through the zod schema + business rules, prints pass/fail per place,
  exits 1 on any hard failure. No DB connection required.
- **`corpus:seed`** — runs `corpus:check` first (fail fast), then upserts
  Place → Source → Claim into Postgres per place file, keyed by natural keys
  (`Place.slug`; `Claim` upserted by a composite of `placeId` + `claimText`
  since claims have no natural slug). Idempotent: re-running produces no
  duplicate rows and no deletions. Retirement is a manual `status` change in
  the source file, never a delete.
- **`corpus:stats`** — queries Postgres, prints per-place claim counts vs.
  `demandRank`, a breakdown of `verification` values, and a re-verification
  backlog (SEASONAL claims with `verifiedOn` > 1 year old).

## Data flow

```
src/corpus/places/*.ts  --(corpus:check)-->  zod validation  --(corpus:seed)-->  Postgres
                                                                        |
                                                                 (corpus:stats)
                                                                        v
                                                                 coverage report
```

## Testing / verification

- `pnpm corpus:check` passes cleanly on `port-d-alon.ts`.
- `pnpm corpus:check` fails loudly on a deliberately broken fixture (e.g. a
  claim missing `conditions` without `PERMANENT` decay) — confirms the
  validator actually gates.
- `pnpm corpus:seed` against local Postgres creates one `Place`, one
  `Source`, and the claim(s) from the file.
- Re-running `pnpm corpus:seed` is a no-op on row count (idempotency).
- `pnpm corpus:stats` prints a coverage line for `port-d-alon`.

## Out of scope for this step (explicit non-goals)

Matches `00-scope.md`'s project-wide non-goals, plus locally: no admin UI for
corpus editing (git is the audit trail), no scraper/automation, no seeding of
`SignalSource`/`StatusLog`/`Request`.
