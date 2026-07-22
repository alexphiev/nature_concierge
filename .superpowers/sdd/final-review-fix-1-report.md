# Final review fix 1: SiteFooter leaking onto /admin

## Bug

`SiteFooter` (public marketing copy "Ce site est tenu par une seule personne...", link to `/places`) was
rendered unconditionally in the root layout (`app/layout.tsx`), as a sibling of `{children}`. This meant it
appeared on every route, including `/admin`, even though `app/admin/layout.tsx` was deliberately built to
omit it. The admin layout could not suppress a sibling rendered by its ancestor.

## Fix

Moved all currently-public routes into a new `app/(public)/` route group whose own layout owns
`SiteFooter`. The root layout now only provides the shared `<html>`/`<body>` wrapper, fonts, and metadata.
`/admin` remains a sibling of `(public)` at the `app/` level, so it inherits fonts/tokens from the root
layout but never renders the public group's footer.

### Files changed

- `app/(public)/page.tsx` — moved from `app/page.tsx` (via `git mv`), content unchanged.
- `app/(public)/places/page.tsx` — moved from `app/places/page.tsx` (via `git mv`), content unchanged.
- `app/(public)/places/[slug]/page.tsx` — moved from `app/places/[slug]/page.tsx` (via `git mv`), content unchanged.
- `app/(public)/layout.tsx` — new file, renders `<div className="flex flex-1 flex-col">{children}</div>` followed by `<SiteFooter />`.
- `app/layout.tsx` — removed the `SiteFooter` import and render call; `<body>` now renders `{children}` directly.

Untouched, as instructed: `app/admin/`, `app/api/`, `app/robots.ts`, `app/sitemap.ts`, `app/globals.css`, `app/favicon.ico`.

## Verification

### 1. `pnpm exec tsc --noEmit`

Initial run failed with stale `.next` generated type-validator errors referencing the old `app/page.tsx` /
`app/places/...` paths (leftover from before the move). Removed `.next` and reran — clean, no output, exit 0.

### 2. `pnpm build`

Build succeeded. Route table:

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

Confirmed: `/`, `/places`, `/places/[slug]` are present and unchanged in the route table (route groups do
not affect the URL). `/admin` still shows `ƒ` (Dynamic), as before.

### 3. `pnpm dev` + curl checks

Dev server started in background, ready in ~334ms.

- `curl -s http://localhost:3000/ | grep -o "une seule personne"` → matched `une seule personne` (footer present on landing page). PASS
- `curl -s http://localhost:3000/places | grep -o "une seule personne"` → matched `une seule personne` (footer present on places index). PASS
- `curl -s -u "admin:$ADMIN_PASSWORD" http://localhost:3000/admin | grep -o "une seule personne"` → no match (grep exit code 1). Footer is gone from `/admin`. PASS (this is the actual bug fix)
- `curl -s -u "admin:$ADMIN_PASSWORD" http://localhost:3000/admin | grep -o "Admin"` → matched `Admin` (multiple times, from the admin layout's own header and page content). Confirms `/admin` still renders correctly, just without the footer. PASS

Dev server killed afterward (`pkill -f "next dev"`).

ADMIN_PASSWORD value itself is not included anywhere in this report.

### 4. `pnpm exec vitest run`

```
 Test Files  2 passed (2)
      Tests  18 passed (18)
```

All 18 pre-existing tests pass, unaffected by the refactor.

## Result

All verification steps passed. No blockers.
