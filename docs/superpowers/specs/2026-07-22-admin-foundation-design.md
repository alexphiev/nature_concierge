# Design — Admin Foundation (auth + `IngestionDraft` schema + dashboard shell)

Source spec: `spec/10-corpus-ingestion.md`. Step (A) of 4 sequential steps
that together build the full corpus-ingestion tool. This step ships the
foundation — auth, data model, dashboard shell — provably working end to
end, before any capture/extraction logic exists.

## Context: how this deviates from the written build order

`00-scope.md`'s stated build order puts `10-corpus-ingestion.md` after
`04-signal-ops.md`, `06-concierge-ops.md`, `07-measurement.md`, and
`08-infra.md`. Those four are being deliberately skipped/deferred right now
(04 and 06 need a rethink — likely moving their CLI scripts into `/admin`
UI screens instead — and 07/08 are mostly manual/account work). This step
jumps `10-corpus-ingestion.md` ahead because it's the most fully-specified
remaining piece and establishes an `/admin` foundation that 04's and 06's
eventual UI-based redesigns will likely want to reuse (same auth layer, same
route group). `00-scope.md`'s build-order section is left as-is for now,
not renumbered — revisit once 04/06's redesigns are actually decided.

## Spec fix made while reading closely

`08-infra.md` said "No third-party API keys exist in the MVP (no LLM calls,
no scrapers) — keep it that way," directly contradicting
`10-corpus-ingestion.md`'s Gemini Flash requirement. Fixed (already
committed): `08-infra.md` now carves out an explicit exception for
`GEMINI_API_KEY`, scoped to the private `/admin` capture tool, not the
public site or a future concierge answering engine. Also added
`ADMIN_PASSWORD` to the same secrets list.

## Scope

**In (this step):**
- `proxy.ts` — Basic Auth gate for all `/admin/*` routes, checked against
  `ADMIN_PASSWORD` env var.
- `IngestionDraft` model + `DraftStatus` enum, added to
  `prisma/schema.prisma`, migrated.
- `app/admin/layout.tsx` — nested layout, inherits root layout's
  fonts/tokens, does NOT render the public `SiteFooter`.
- `app/admin/page.tsx` — dashboard: drafts grouped by status
  (`PENDING_REVIEW`, `ERROR`, `APPROVED` recent, `REJECTED` recent). Will
  legitimately render all-empty right now — no capture flow exists yet.
- `noindex` on all `/admin/*` responses; `/admin` excluded from
  `app/sitemap.ts`.

**Out (later steps in this 4-step sequence):**
- `/admin/new` capture form (text paste + image upload).
- Gemini Flash extraction call, Vercel Blob image storage.
- `/admin/review/[draftId]` review/approve/reject screen.
- `pnpm corpus:sync-seed-files` export.

## Auth

Confirmed against this project's actual Next.js version (16.2.10, verified
via `node_modules/next/dist/docs/` — the `middleware.ts` convention is
**deprecated in this version, renamed to `proxy.ts`** with an exported
`proxy` function, not `middleware`). Using the old convention would silently
not run.

`proxy.ts` at the project root:

```ts
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const config = {
  matcher: "/admin/:path*",
};

function isValidPassword(provided: string | null): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !provided) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export function proxy(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
    const [, password] = decoded.split(":");
    if (isValidPassword(password)) {
      const response = NextResponse.next();
      response.headers.set("X-Robots-Tag", "noindex");
      return response;
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}
```

Constant-time comparison reuses the exact pattern already established and
reviewed in `app/api/revalidate/route.ts` (length check before
`timingSafeEqual`, since mismatched-length buffers throw rather than
returning false).

## Data model

Verbatim from `10-corpus-ingestion.md`:

```prisma
model IngestionDraft {
  id             String      @id @default(cuid())
  createdAt      DateTime    @default(now())
  inputText      String?
  inputImages    String[]
  transcript     String?
  rawModelOutput Json?
  status         DraftStatus @default(PENDING_REVIEW)
  draftPlace     Json?
  draftClaims    Json
}

enum DraftStatus {
  PENDING_REVIEW
  ERROR
  APPROVED
  REJECTED
}
```

`draftPlace`/`draftClaims` stay loose `Json` deliberately (per spec's own
rationale: taxonomy will shift; only *approved* data conforms strictly to
the real `Claim` model, enforced at approval time — a later step, not this
one).

## Layout

`app/admin/layout.tsx` — a route-group-style nested layout under
`app/admin/`. Next.js automatically composes nested layouts with the root
layout, so `app/admin/layout.tsx` inherits the font variables and
`bg-calcaire`/`text-encre` styling from `app/layout.tsx` for free — it does
not need its own `<html>`/`<body>`, just wraps `children` and adds a small
"Admin" header bar for orientation (distinguishing it from the public site
while still using the same design tokens, per your choice to reuse them).
Crucially, it must NOT render `SiteFooter` — that component's copy
("Ce site est tenu par une seule personne...", link to `/places`) is public
marketing content with no place in an internal tool.

## Dashboard page

`app/admin/page.tsx` — Server Component. Queries `IngestionDraft` grouped
into the four status buckets (a single `findMany` + client-side grouping by
`status` is simplest at this volume — no pagination needed for "tens of
captures/week"). Each draft row shows: `createdAt` (relative or absolute,
whichever is simpler — no strong spec preference here), and a short preview
string: `inputText`'s first ~80 characters if present, else `"Capture
image"` if `inputImages.length > 0`, else `"(entrée vide)"` as a defensive
fallback (shouldn't happen in practice once step B exists, but the query
shouldn't crash on an edge case). No click-through yet (that's `/admin/review/[draftId]`,
step C) — this step's rows are static list items, not links, since the
target route doesn't exist.

## Testing / verification

- `pnpm exec prisma migrate dev` applies cleanly; `IngestionDraft` and
  `DraftStatus` exist in the generated client.
- `curl http://localhost:3000/admin` (no auth header) → 401 with
  `WWW-Authenticate: Basic` header present.
- `curl -u wronguser:wrongpass http://localhost:3000/admin` → 401.
- `curl -u admin:$ADMIN_PASSWORD http://localhost:3000/admin` → 200, page
  renders all four status sections (empty, since no drafts exist).
- Response includes an `X-Robots-Tag: noindex` header.
- `/admin` does not appear in `curl http://localhost:3000/sitemap.xml`.
- Visual check: `/admin` uses the same fonts/colors as `/places`, but does
  NOT render `SiteFooter`.

## Out of scope for this step (explicit non-goals)

Everything listed under "Out" above. Also: no rate-limiting on the Basic
Auth endpoint (single user, low-value target, matches spec's own framing —
"not a security-hardened multi-tenant system; it's a locked door on a
private tool"), no password rotation/multi-user support.
