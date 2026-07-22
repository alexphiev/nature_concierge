# Admin Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `/admin` foundation — Basic Auth gate, `IngestionDraft` data model, and an empty-but-working dashboard shell — as step (A) of the 4-step corpus-ingestion tool build. Provably working end to end before any capture/extraction logic exists.

**Architecture:** `proxy.ts` at the project root (Next.js 16's Basic Auth gate, replacing the deprecated `middleware.ts` convention) protects all `/admin/*` routes. `IngestionDraft`/`DraftStatus` are added to the existing Prisma schema and migrated. `app/admin/layout.tsx` is a nested layout inheriting the root layout's fonts/tokens without the public `SiteFooter`. `app/admin/page.tsx` queries drafts grouped by status.

**Tech Stack:** Next.js 16.2.10 (App Router, `proxy.ts` convention), TypeScript, Prisma 7.9.0 (existing corpus schema), Tailwind v4 (existing tokens).

## Global Constraints

- Auth is a single shared password from `ADMIN_PASSWORD` env var, Basic Auth, any username accepted (`10-corpus-ingestion.md`: "single shared secret... single user (Alexandre)").
- `/admin` must be `noindex` and excluded from `app/sitemap.ts` (`10-corpus-ingestion.md`: "Not linked from anywhere public, `noindex`").
- No `SiteFooter` on any `/admin/*` page — that component's copy is public marketing content.
- `IngestionDraft.draftPlace`/`draftClaims` stay loose `Json` (not strict Prisma relations) — deliberate per spec, taxonomy will shift.
- Constant-time password comparison (matching the existing pattern in `app/api/revalidate/route.ts`: length check before `timingSafeEqual`, since mismatched-length buffers throw).
- Reuse existing design tokens/fonts (`--calcaire`, `--mediterranee`, Bricolage Grotesque, etc.) — no new tokens.
- Out of scope for this plan (do not build): `/admin/new`, Gemini extraction, Vercel Blob, `/admin/review/[draftId]`, `corpus:sync-seed-files`.

---

## File Structure

```
proxy.ts                        # Basic Auth gate for /admin/*
prisma/schema.prisma             # + IngestionDraft, DraftStatus
app/admin/layout.tsx             # nested layout, no SiteFooter
app/admin/page.tsx                # dashboard: drafts by status
app/sitemap.ts                    # excludes /admin (already excludes it implicitly — verify)
.env.dist                         # + ADMIN_PASSWORD
```

Rationale: `proxy.ts` must live at the project root (Next.js file-convention requirement, not `app/`). `app/admin/` as a plain nested route (not a route group with parens) is correct here since `/admin` should appear literally in the URL.

---

## Task 1: `IngestionDraft` schema + migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `IngestionDraft` and `DraftStatus` Prisma models/types, generated into `prisma/generated/client`. Consumed by Task 5 (`app/admin/page.tsx`).

- [ ] **Step 1: Append to `prisma/schema.prisma`**

Add at the end of the file:

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

- [ ] **Step 2: Validate the schema**

Run: `pnpm exec prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 3: Create and apply the migration**

Run: `pnpm exec prisma migrate dev --name add_ingestion_draft`
Expected: creates a new migration directory under `prisma/migrations/`, applies it to Neon, regenerates the client. Output ends with `Your database is now in sync with your schema.`

- [ ] **Step 4: Verify the generated client has the new model**

Run: `pnpm exec tsc --noEmit`
Expected: no errors (confirms the generated client's types are valid TypeScript).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Add IngestionDraft model and DraftStatus enum"
```

---

## Task 2: `ADMIN_PASSWORD` env var

**Files:**
- Modify: `.env.dist`

**Interfaces:**
- Produces: `process.env.ADMIN_PASSWORD`, consumed by Task 3 (`proxy.ts`).

- [ ] **Step 1: Add to `.env.dist`**

Append a line:

```
ADMIN_PASSWORD=<choose-a-real-password-before-deploying>
```

- [ ] **Step 2: Add a real value to `.env.local`**

Run:
```bash
echo "ADMIN_PASSWORD=$(openssl rand -hex 16)" >> .env.local
```

- [ ] **Step 3: Commit**

```bash
git add .env.dist
git commit -m "Add ADMIN_PASSWORD env var for /admin Basic Auth"
```

(`.env.local`'s new line is gitignored, not committed.)

---

## Task 3: `proxy.ts` — Basic Auth gate

**Files:**
- Create: `proxy.ts` (project root, NOT inside `app/`)

**Interfaces:**
- Consumes: `ADMIN_PASSWORD` env var (Task 2).
- Produces: HTTP Basic Auth protection for all `/admin/:path*` requests.

**IMPORTANT — Next.js version note:** this project uses Next.js 16.2.10, where the `middleware.ts` file convention is **deprecated and renamed to `proxy.ts`**, exporting a function named `proxy` (not `middleware`). Confirmed via `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. Using the old `middleware.ts`/`export function middleware` convention will silently not run — do not use it.

- [ ] **Step 1: Write `proxy.ts`**

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

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify manually**

This step's verification requires `/admin` to return something (even a 404) once the proxy allows the request through — Task 4 hasn't been built yet, so for now verify only the 401 rejection paths. (Full 200-path verification happens in Task 5 after the dashboard page exists.)

Run: `pnpm dev`, then in another terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin
```
Expected: `401`.

```bash
curl -s -i http://localhost:3000/admin | grep -i "www-authenticate"
```
Expected: a line containing `WWW-Authenticate: Basic realm="Admin"`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -u "admin:wrong-password" http://localhost:3000/admin
```
Expected: `401`.

- [ ] **Step 4: Commit**

```bash
git add proxy.ts
git commit -m "Add Basic Auth gate for /admin routes"
```

---

## Task 4: `app/admin/layout.tsx`

**Files:**
- Create: `app/admin/layout.tsx`

**Interfaces:**
- Consumes: nothing new — inherits fonts/tokens automatically from `app/layout.tsx` via Next.js's nested-layout composition.
- Produces: the layout wrapper for all `/admin/*` pages. Consumed by Task 5 (`app/admin/page.tsx`).

- [ ] **Step 1: Write `app/admin/layout.tsx`**

```tsx
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-4 py-8">
      <header className="border-b border-sable/40 pb-4">
        <p className="font-mono text-sm text-encre/70">Admin</p>
      </header>
      {children}
    </div>
  );
}
```

Note: this does NOT render `SiteFooter` and does NOT wrap in `<html>`/`<body>` — those come from the inherited root layout (`app/layout.tsx`), which Next.js composes automatically for nested routes.

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "Add admin layout (no public SiteFooter)"
```

---

## Task 5: `app/admin/page.tsx` — dashboard

**Files:**
- Create: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `prisma` from `src/corpus/db.ts` (existing), `IngestionDraft`/`DraftStatus` (Task 1), `AdminLayout` (Task 4, applied automatically by Next.js's file convention — no explicit import needed).
- Produces: the `/admin` route content.

- [ ] **Step 1: Write `app/admin/page.tsx`**

```tsx
import type { Metadata } from "next";
import { prisma } from "@/src/corpus/db";
import type { IngestionDraft } from "../../prisma/generated/client";

export const metadata: Metadata = {
  title: "Admin — Nature Concierge",
  robots: { index: false, follow: false },
};

function draftPreview(draft: IngestionDraft): string {
  if (draft.inputText) {
    return draft.inputText.length > 80
      ? `${draft.inputText.slice(0, 80)}…`
      : draft.inputText;
  }
  if (draft.inputImages.length > 0) return "Capture image";
  return "(entrée vide)";
}

function DraftSection({
  title,
  drafts,
}: {
  title: string;
  drafts: IngestionDraft[];
}) {
  return (
    <section>
      <h2 className="font-display text-xl">
        {title} ({drafts.length})
      </h2>
      {drafts.length === 0 ? (
        <p className="mt-2 text-sm text-encre/70">Aucun brouillon.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3 text-sm"
            >
              <span className="font-mono text-xs text-encre/70">
                {draft.createdAt.toISOString()}
              </span>
              <p>{draftPreview(draft)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AdminDashboardPage() {
  const drafts = await prisma.ingestionDraft.findMany({
    orderBy: { createdAt: "desc" },
  });

  const byStatus = {
    PENDING_REVIEW: drafts.filter((d) => d.status === "PENDING_REVIEW"),
    ERROR: drafts.filter((d) => d.status === "ERROR"),
    APPROVED: drafts.filter((d) => d.status === "APPROVED"),
    REJECTED: drafts.filter((d) => d.status === "REJECTED"),
  };

  return (
    <main className="flex flex-col gap-8">
      <h1 className="font-display text-2xl">Corpus — brouillons</h1>
      <DraftSection title="À relire" drafts={byStatus.PENDING_REVIEW} />
      <DraftSection title="Erreurs" drafts={byStatus.ERROR} />
      <DraftSection title="Approuvés récemment" drafts={byStatus.APPROVED} />
      <DraftSection title="Rejetés récemment" drafts={byStatus.REJECTED} />
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify the full auth + render flow**

Run: `pnpm build`
Expected: build succeeds; `/admin` listed in the route output.

Run: `pnpm dev`, then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin
```
Expected: `401` (no credentials).

```bash
ADMIN_PW=$(grep ADMIN_PASSWORD .env.local | cut -d= -f2)
curl -s -o /dev/null -w "%{http_code}\n" -u "admin:$ADMIN_PW" http://localhost:3000/admin
```
Expected: `200`.

```bash
curl -s -u "admin:$ADMIN_PW" http://localhost:3000/admin | grep -o "brouillons\|À relire\|Aucun brouillon"
```
Expected: matches found (confirms the dashboard renders with all-empty sections, since no drafts exist yet).

```bash
curl -s -i -u "admin:$ADMIN_PW" http://localhost:3000/admin | grep -i "x-robots-tag"
```
Expected: a line containing `X-Robots-Tag: noindex`.

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.tsx
git commit -m "Add /admin dashboard listing drafts by status"
```

---

## Task 6: Exclude `/admin` from sitemap (verification, not new code)

**Files:**
- None expected to change — this task verifies `app/sitemap.ts` (built in a prior, already-merged plan) does not and cannot include `/admin`.

**Interfaces:**
- None — this is a verification-only task.

- [ ] **Step 1: Read `app/sitemap.ts` and confirm it only enumerates `/`, `/places`, and `/places/{slug}` for ACTIVE places**

Run: `cat app/sitemap.ts`
Expected: the file's returned array only ever constructs URLs from `SITE_URL`, `${SITE_URL}/places`, and `${SITE_URL}/places/${place.slug}` — no code path that could add `/admin`.

If this expectation holds (it should, since `/admin` didn't exist when `sitemap.ts` was written), no code change is needed — this task is confirmation only.

- [ ] **Step 2: Verify live**

Run: `pnpm dev`, then:

```bash
curl -s http://localhost:3000/sitemap.xml | grep -o "admin"
```
Expected: no output (no match — `/admin` does not appear in the sitemap).

- [ ] **Step 3: No commit needed for this task** (verification only, no file changes expected).

If Step 1 surprisingly finds a code path that could include `/admin` (it shouldn't), stop and report back — do not silently patch `sitemap.ts` without confirming the fix with the plan owner, since that file belongs to a different, already-merged plan.

---

## Self-Review Notes

**Spec coverage check** (against `docs/superpowers/specs/2026-07-22-admin-foundation-design.md`):
- `IngestionDraft`/`DraftStatus` schema + migration → Task 1. ✓
- `ADMIN_PASSWORD` env var → Task 2. ✓
- Basic Auth gate via `proxy.ts` (not the deprecated `middleware.ts`) → Task 3. ✓
- `app/admin/layout.tsx` (no `SiteFooter`, inherits tokens) → Task 4. ✓
- `app/admin/page.tsx` dashboard (4 status sections) → Task 5. ✓
- `noindex` verification → Task 5, Step 3. ✓
- `/admin` excluded from sitemap → Task 6 (verification-only, since the sitemap was built in a prior plan before `/admin` existed). ✓
- Out-of-scope items (`/admin/new`, extraction, review screen, sync-seed-files) → correctly absent from all tasks. ✓

**Type consistency check:** `IngestionDraft` type (Task 1) is imported unchanged in Task 5's `draftPreview`/`DraftSection` functions — no cross-task signature drift. `proxy.ts` (Task 3) and `app/admin/page.tsx` (Task 5) are independent of each other's internals (auth doesn't know about drafts; the page doesn't know about auth) — clean separation, matching the design doc's architecture.

**Known limitation carried from the design doc, not re-litigated here:** Task 6 is unusual in this plan (verification-only, no commit) because `sitemap.ts` is owned by an already-merged, separate plan. If Task 6 finds `/admin` DOES leak into the sitemap, that's a cross-plan coordination question for the plan owner, not something to fix unilaterally mid-task.
