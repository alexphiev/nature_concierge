# Task 5 Report: `app/admin/page.tsx` — dashboard

## What was done

1. Read the task brief (`.superpowers/sdd/task-5-brief.md`) and confirmed the `IngestionDraft` model / `DraftStatus` enum in `prisma/schema.prisma` match the fields used in the brief's code exactly (`id`, `createdAt`, `inputText`, `inputImages`, `status`; enum values `PENDING_REVIEW`, `ERROR`, `APPROVED`, `REJECTED`).
2. Created `app/admin/page.tsx` with the exact code from the brief (Step 1), verbatim — no deviations.
3. Ran `pnpm exec tsc --noEmit` — no errors.
4. Ran `pnpm build` — succeeded, `/admin` listed as a route in the build output (static `○` symbol).
5. Verified the full auth + render flow. A dev server from a prior session was already running on port 3000 in this same worktree directory (PID 63913, healthy, responding). Attempting `pnpm dev` in a fresh shell correctly detected this and refused to start a duplicate, so verification was run against the already-running server (Turbopack hot-reloaded the new `page.tsx` automatically since the file was already on disk before the curl checks).
6. Committed `app/admin/page.tsx` as instructed.

## Commands run and output

### Type-check
```
$ pnpm exec tsc --noEmit
(no output — success)
```

### Build
```
$ pnpm build
...
✓ Compiled successfully in 2.1s
  Running TypeScript ...
  Finished TypeScript in 1977ms ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (10/10) in 1008ms
  Finalizing page optimization ...

Route (app)              Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ○ /admin
├ ƒ /api/revalidate
├ ○ /places
├ ● /places/[slug]              15m      1y
│ └ /places/port-d-alon         15m      1y
├ ○ /robots.txt
└ ○ /sitemap.xml
```
`/admin` is present in the route list. Build succeeded with no errors (only pre-existing pg SSL-mode deprecation warnings from the `PrismaPg` adapter, unrelated to this change, and a pre-existing multi-lockfile workspace-root warning).

### Auth gate — no credentials
```
$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin
401
```

### Auth gate — with real ADMIN_PASSWORD from .env.local
```
$ ADMIN_PW=$(grep ADMIN_PASSWORD .env.local | cut -d= -f2-)
$ curl -s -o /dev/null -w "%{http_code}\n" -u "admin:$ADMIN_PW" http://localhost:3000/admin
200
```

### Dashboard content check
```
$ curl -s -u "admin:$ADMIN_PW" http://localhost:3000/admin | grep -o "brouillons\|À relire\|Aucun brouillon"
brouillons
À relire
Aucun brouillon
Aucun brouillon
Aucun brouillon
Aucun brouillon
```
Also confirmed all four section headers render: `Corpus`, `À relire`, `Erreurs`, `Approuvés récemment`, `Rejetés récemment`.

### Robots header check
```
$ curl -s -i -u "admin:$ADMIN_PW" http://localhost:3000/admin | grep -i "x-robots-tag"
x-robots-tag: noindex
```

All four expected outcomes from the brief's Step 3 matched exactly.

## Database state

Confirmed via the rendered page: all four sections (`À relire`, `Erreurs`, `Approuvés récemment`, `Rejetés récemment`) show "Aucun brouillon." — the expected empty state since there are zero `IngestionDraft` rows in the real Neon database and no capture flow exists yet. This is correct per the task context, not a bug.

## Commit

```
$ git add app/admin/page.tsx
$ git commit -m "Add /admin dashboard listing drafts by status"
[worktree-admin-foundation 257bd04] Add /admin dashboard listing drafts by status
 1 file changed, 74 insertions(+)
 create mode 100644 app/admin/page.tsx
```

Commit SHA: `257bd04`

## Concerns

- None blocking. One minor observation: `/admin` is marked as a static route (`○`) in the `pnpm build` output rather than dynamic (`ƒ`), even though the page does a live Prisma query (`prisma.ingestionDraft.findMany`). This didn't cause any verification failures (the live dev-server curl checks all passed against the real database), but is worth a maintainer's awareness if drafts data is expected to be fresh per-request in production rather than cached/prerendered at build time. This is inherent to how Next.js 16 classified the route given the brief's exact code (no `dynamic` export or `noStore()` call was specified in the brief), not a deviation introduced by this implementation — the code was written verbatim as specified.
- A stale/pre-existing `next dev` process from an earlier session was already running on port 3000 in this worktree. Verification was performed against that server (after confirming it picked up the new file via hot reload) rather than starting a fresh one, since the brief's intent (verify auth + render flow via curl) was fully satisfied either way.

## Fix: /admin static prerendering (stale data)

The concern flagged above turned out to be a real bug: `pnpm build` classified `/admin` as `○` (Static), meaning Next.js prerendered the page once at build time. Since the page's only content comes from `prisma.ingestionDraft.findMany(...)`, a static `/admin` would freeze the draft list/counts as of the last build and never reflect drafts created afterward — defeating the purpose of a live admin dashboard.

Per this project's installed Next.js 16.2.10 docs (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`), the fix is to call `await connection()` from `next/server` before doing any per-request work, which explicitly opts the route out of static prerendering.

### Change

In `app/admin/page.tsx`:
- Added `import { connection } from "next/server";` alongside the existing imports.
- Added `await connection();` as the first line of `AdminDashboardPage`, before the `prisma.ingestionDraft.findMany` call.

No other code in the file was touched.

### Verification

**1. `pnpm exec tsc --noEmit`** — no output, no errors.

**2. `pnpm build`** — route table before vs. after:

Before (from initial implementation report):
```
├ ƒ /api/revalidate
├ ○ /places
```
with `/admin` listed as:
```
├ ○ /admin
```

After the fix:
```
Route (app)              Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ƒ /admin
├ ƒ /api/revalidate
├ ○ /places
├ ● /places/[slug]              15m      1y
│ └ /places/port-d-alon         15m      1y
├ ○ /robots.txt
└ ○ /sitemap.xml
```

`/admin` is now `ƒ` (Dynamic, server-rendered on demand), confirming the fix took effect.

**3. Live dev-server check** — started `pnpm dev`, then:
```
curl -s -o /dev/null -w "%{http_code}\n" -u "admin:$ADMIN_PASSWORD" http://localhost:3000/admin
200
```
(An existing `next dev` process for this worktree was already running on port 3000; the curl check was run against it since it serves the same updated code. A separately spawned `pnpm dev` instance failed to bind port 3000, as expected, and was not left running.)

### Commit

Committed as `app/admin/page.tsx` + this report update with message "Force dynamic rendering on /admin so draft data is never stale".
