# Contributions 4 — Polish and Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the follow-ups deferred by the part 1–3 reviews: protect the geocoding endpoints, make edge cases robust, give the admin visible feedback, and smooth a few contributor-facing rough edges.

**Architecture:** Small, independent changes in existing modules; no new data model. The geo endpoints move under `/admin` so the existing Basic Auth (sent preemptively by the browser for that path) covers them.

**Tech Stack:** Next.js 16.2 (App Router, `cacheComponents`), Prisma 7, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-10-17-community-contributions-design.md` (implemented); living docs in `spec/`. Items come from the review ledgers of parts 1–3.

## Global Constraints

- Read `AGENTS.md` and the relevant `node_modules/next/dist/docs/` guide before coding.
- No new automated tests; existing tests stay green (adjust only where behaviour intentionally changes). Verify each task with `pnpm lint && pnpm test && pnpm build`; `/`, `/lieux`, `/lieux/[slug]` stay ◐.
- French copy exactly as quoted; typographic apostrophes (’) as in existing code.
- Admin actions keep `assertAdmin()` first; `redirect()` never inside try/catch.
- Update the matching `spec/*.md` lines when behaviour described there changes.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Admin place form after the geo move**: commune autocomplete and coordinates still fill in when signed in via Basic Auth. Owned by Task 1.
2. **Two place drafts with the same name created at once**: the second gets the next free slug instead of a 500. Owned by Task 1.
3. **A user who already confirmed on another device reopens the inbox page**: they see « Votre contribution est déjà en relecture. », not « expiré ». Owned by Task 2.
4. **Admin submits an invalid edit or keeps zero photos**: a visible French message explains why nothing happened. Owned by Task 3.
5. **A fresh database with no public claims**: `pnpm build` still succeeds. Owned by Task 1.

---

### Task 1: Hardening

**Files:** `app/api/geo/**` → `app/admin/api/geo/**`, `app/admin/places/PlaceLocationFields.tsx`, `src/corpus/slug.ts`, `app/admin/contributions/actions.ts`, `src/storage/place-photos.ts`, `src/contributions/service.ts`, `app/(public)/lieux/[slug]/corriger/[claimId]/page.tsx` (and any other `generateStaticParams` that can return `[]`), `spec/05-admin.md`, `spec/08-infra.md`

- [ ] **Step 1: Geo endpoints under `/admin`.** Move `app/api/geo/communes/route.ts` and `app/api/geo/geocode/route.ts` to `app/admin/api/geo/…`; update the fetch URLs in `PlaceLocationFields.tsx`. `proxy.ts` (matcher `/admin/:path*`) now protects them and the browser sends the cached Basic credentials preemptively for paths under `/admin/`. Remove the `/api/geo` caveat from `spec/05-admin.md`.
- [ ] **Step 2: Slug race.** In `createPlaceDraft`, if the place insert fails with Prisma `P2002` on `slug`, recompute `uniquePlaceSlug` and retry once (the contribution gate is in the same transaction, so a failed attempt rolls back cleanly).
- [ ] **Step 3: Storage cleanup visibility.** `deletePlacePhotos` logs the per-key `Errors` returned by `DeleteObjects` (`console.error` with keys + codes); still never throws for partial failures. In the photo-upload failure cleanup in `service.ts`, wrap the `contribution.delete` in try/catch + log so the user still gets « Une photo n’a pas pu être envoyée, réessayez. ».
- [ ] **Step 4: Empty corpus build.** Every `generateStaticParams` that can return an empty list under `cacheComponents` returns at least one placeholder param that resolves to `notFound()` (check the Next docs for the recommended pattern and follow it).
- [ ] **Step 5: Verify + commit** — `git commit -m "fix: protect geo endpoints, harden slug, storage and build edge cases"`

---

### Task 2: Contributor-facing polish

**Files:** `app/(public)/connexion/verifier/page.tsx`, `src/components/ClaimList.tsx`, `src/components/contribute/PendingContributions.tsx`, `src/components/contribute/IdentityFields.tsx`, `src/components/contribute/TipForm.tsx`, `app/(landing)/page.tsx` / `src/components/landing/GuideSection.tsx`

- [ ] **Step 1: Already-confirmed state.** On `/connexion/verifier`, when the visitor is signed in and has no pending cookie (or the cookie's email has no UNCONFIRMED contribution left), show « Votre contribution est déjà en relecture. Vous recevrez un email dès qu’elle est en ligne. » instead of the expired/default copy, with a link « Retour au guide » → `/lieux`.
- [ ] **Step 2: Dates in Paris time.** Every `Intl.DateTimeFormat` used for contributor-visible dates (`ClaimList`, `PendingContributions`, and any other in `src/components/contribute/`) sets `timeZone: "Europe/Paris"`.
- [ ] **Step 3: Small markup fixes.** `ClaimList` renders no empty `<ul>` in the empty state; the honeypot wrapper uses visually-hidden clipping (`sr-only`-style: `absolute w-px h-px overflow-hidden [clip:rect(0,0,0,0)] whitespace-nowrap`) instead of `-left-[9999px]`, keeping `tabIndex={-1}`, `autoComplete="off"` and `aria-hidden`; `TipForm` shows a theme (`claimType`) field error under the chips when present.
- [ ] **Step 4: Landing place count.** The landing's « N lieux » count matches `/lieux` (top-level ACTIVE places, spots excluded).
- [ ] **Step 5: Verify + commit** — `git commit -m "fix: contributor-facing polish"`

---

### Task 3: Admin feedback

**Files:** `app/admin/contributions/actions.ts`, `app/admin/contributions/page.tsx`, `app/admin/contributions/ReviewParts.tsx`, `app/admin/contributions/TipReview.tsx`, `app/admin/contributions/CorrectionReview.tsx`, `app/admin/contributions/PhotosReview.tsx`

- [ ] **Step 1: Flash messages.** When an admin action makes no change for a reason the admin can fix, redirect to `/admin/contributions?erreur={code}#c-{contributionId}` (outside try/catch); the page shows a `role="alert"` banner at the top for known codes and each contribution card has `id="c-{id}"`. Codes and copy: `texte` « Le texte doit faire entre 10 et 500 caractères. », `theme` « Thème inconnu. », `photos` « Cochez au moins une photo, ou utilisez « Refuser ». », `conseil` « Ce conseil n’est plus en ligne. ». Already-decided contributions (lost race) stay silent.
- [ ] **Step 2: Note cap.** Review notes are trimmed and capped at 1000 characters (`maxLength` on the textarea + server slice).
- [ ] **Step 3: Labels.** Restore explicit accessible labels on the admin tip form fields (« Texte du conseil », « Thème », « Commentaire de publication », « Motif du refus ») via visible `<label>` or `aria-label`, keeping placeholders.
- [ ] **Step 4: Verify + commit** — `git commit -m "feat(admin): visible feedback on contribution review"`
