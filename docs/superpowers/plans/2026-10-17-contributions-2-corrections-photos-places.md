# Contributions 2 — Corrections, Photos, New Places Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contributors can correct a tip, report an error on a place, add photos, and propose a new place; Alexandre reviews each type in `/admin/contributions`.

**Architecture:** Every form reuses part 1's pieces — `ContributionShell`, `IdentityFields`, `submitContribution` (write first, sign in at submit) and the `values` pattern that keeps typed input after an error. Photos are compressed in the browser and posted with the form in one request, stored under `contributions/{id}/` in the existing bucket, and become `PlacePhoto`s on approval. The admin queue gets one review component and one action set per type, all gated by the atomic `PENDING` claim already used for tips.

**Tech Stack:** Next.js 16.2 (App Router, `cacheComponents`), React 19, Prisma 7, Better Auth 1.7.7, Resend, Neon Object Storage (S3), `browser-image-compression` + `heic-to`, zod 4, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-10-17-community-contributions-design.md` (§3 form fields for Corriger / Signaler / Photos / Nouveau lieu, §2 "What approval produces" for CORRECTION / PLACE / PHOTOS, §5 place page « Corriger » + gallery link + « Lieu proposé par », §6 queue rows). Part 1 is merged; part 3 does the page rework, `/contribuer`, WhatsApp removal and `spec/` updates.

## Global Constraints

- **Read before coding:** `AGENTS.md`, then the relevant guide in `node_modules/next/dist/docs/` (at least `01-app/01-getting-started/07-mutating-data.md`, `08-caching.md`, `02-guides/forms.md`).
- **No new automated tests** (project rule). Existing tests stay green. Each task verifies with `pnpm lint`, `pnpm test`, `pnpm build`.
- All user-facing copy in French, exactly as quoted here. Sentence case. No « IA ».
- Contribution text is plain text only, never HTML.
- Every server action re-reads the session (`getSessionUser()`); admin actions call `assertAdmin()` first.
- Every form follows the tip-form pattern: shell + review notice + charter, `IdentityFields`, honeypot, `submitContribution`, return `values` on every error so typed text survives (files cannot be restored; the error says « Sélectionnez à nouveau vos photos. » for the photo form).
- Session-dependent UI inside `<Suspense>`; `/lieux` and `/lieux/[slug]` stay prerendered (◐ in build output).
- Limits (zod, server-side): correction text 10–1000; place name 2–120; place commune 2–80 (required); location hint ≤ 500 (optional); why-this-place 10–1000; photos 1–6 files, each ≤ 1 MB, total ≤ 4 MB, JPEG/PNG/WebP after browser conversion (HEIC → JPEG).
- Contributors may pick photos of any size or resolution (no input limit, HEIC included). The browser resizes before upload: any file over 0.6 MB is compressed to `maxSizeMB: 0.6`, `maxWidthOrHeight: 1600` (keeps one request under Vercel's 4.5 MB body limit). The server-side 1 MB / 4 MB checks apply to the resized files only, as a safety net against requests that bypass the form.
- Admin decisions are atomic: a conditional `updateMany({ where: { id, status: "PENDING", type } })` inside the transaction is the gate; emails after commit, failures logged; `updateTag("corpus")` when public content changed.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Tip retired or unpublished between page load and correction submit**: the submit returns « Ce conseil n'est plus en ligne. » instead of creating a correction on a dead claim. Owned by Task 2.
2. **A photo upload fails mid-submission**: no half contribution remains — uploaded objects and the contribution row are removed and the user sees « Une photo n'a pas pu être envoyée, réessayez. ». Owned by Task 4.
3. **Crafted requests bypassing the browser** (7 files, a 3 MB file, a PDF renamed .jpg): the server rejects them with a field error, nothing stored. Owned by Task 4.
4. **Proposed place whose name matches an existing slug**: « Créer le brouillon » derives a unique slug (`-2`, `-3`…) instead of failing. Owned by Task 5.
5. **Admin unticks every photo and clicks « Publier la sélection »**: nothing changes, the contribution stays PENDING (use « Refuser » to decline all). Owned by Task 6.

---

### Task 1: Part 1 follow-ups

**Files:**
- Modify: `src/contributions/submit.ts`, `src/contributions/service.ts`, `app/(public)/compte/actions.ts`

**Interfaces:**
- Produces: unchanged signatures.

- [ ] **Step 1: Throttled signed-out submit redirects.** In `submitContribution`, when `sendContributionMagicLink` throws `MagicLinkThrottledError` on the signed-out path, behave as sent: write the pending cookie (with `sentAt: Date.now()`) and `redirect("/connexion/verifier")` — a link for this email went out under 60 s ago and attachment works on the whole email. `MAGIC_LINK_THROTTLE_MESSAGE` stays for the resend action only.
- [ ] **Step 2: Stale avatar after rename.** In `updateAccount`, when the `corpus` tag is not invalidated, call `refresh()` from `next/cache` (see `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md`) so the header initial updates.
- [ ] **Step 3: Guard the purge.** Wrap the body of the stale-UNCONFIRMED purge in try/catch + `console.error`, so a storage outage never blocks a signed-out submit (photos ship in this plan).
- [ ] **Step 4: Attach guard.** In `attachUnconfirmedContributions`, the `updateMany` where clause also requires `status: "UNCONFIRMED"`, and admin notifications are sent only for rows actually updated.
- [ ] **Step 5: Verify** — `pnpm lint && pnpm test && pnpm build`, expected pass.
- [ ] **Step 6: Commit** — `git commit -m "fix(contributions): part 1 review follow-ups"`

---

### Task 2: Correction forms and place-page links

**Files:**
- Create: `src/components/contribute/CorrectionForm.tsx`
- Create: `app/(public)/lieux/[slug]/corriger/page.tsx`, `app/(public)/lieux/[slug]/corriger/[claimId]/page.tsx`, `app/(public)/lieux/[slug]/corriger/actions.ts`
- Modify: `src/contributions/schema.ts`, `src/components/ClaimList.tsx`, `app/(public)/lieux/[slug]/page.tsx`

**Interfaces:**
- Consumes: `submitContribution`, `FormState`, `ContributionShell`, `IdentityFields`, `SubmitButton`, `getPlaceBySlug`, `getSessionUser`.
- Produces:
  - `schema.ts`: `CORRECTION_KINDS: { value: CorrectionKind; label: string }[]` = OUTDATED « N'est plus vrai », WRONG « Inexact », MISSING_DETAIL « Il manque une précision »; `CorrectionInputSchema` (`correctionKind` ∈ kinds, `text` 10–1000 trimmed).
  - `submitCorrection(slug: string, claimId: string | null, prev: FormState, formData: FormData): Promise<FormState>`.
  - `ClaimList` gains `correctHref?: (claimId: string) => string`.

- [ ] **Step 1: Schema** per Interfaces.
- [ ] **Step 2: `CorrectionForm`** (client, same structure as `TipForm`: keyed fields re-applying `values`): optional quoted tip (« Le conseil actuel » + the claim text in a `<blockquote>`), kind radio group (no default; required), textarea `text` (maxLength 1000, counter) labelled « Qu'est-ce qui a changé ? », `IdentityFields`, submit « Envoyer pour relecture ».
- [ ] **Step 3: Pages** (`noindex`, `notFound()` unless the place is ACTIVE).
  - `/lieux/[slug]/corriger`: title « Signaler une erreur — {name} », H1 « Une erreur sur {name} ? », no quoted tip, `claimId = null`.
  - `/lieux/[slug]/corriger/[claimId]`: `notFound()` unless the claim is among `place.claims` or `place.parent?.claims` (both are public published claims); title « Corriger un conseil — {name} », H1 « Corriger un conseil », quotes the claim text.
  - Both need `generateStaticParams` like the tip page if the build requires it (return the place slugs; for `[claimId]` return `[]` is not allowed with cacheComponents — check the docs and read the claim inside Suspense if needed).
- [ ] **Step 4: `submitCorrection`**: validate `CorrectionInputSchema` (map `""` kind to `undefined`; errors → `fieldErrors` + `values`); re-check the ACTIVE place; when `claimId` is set, re-check in the DB that the claim is `PUBLISHED`, `isPublic` and belongs to the place or its parent, else return `{ error: "Ce conseil n'est plus en ligne.", values }`; call `submitContribution({ data: { type: "CORRECTION", placeId, claimId, correctionKind, text }, formData, formPath, next: \`/lieux/${slug}\` })` and wrap its result with `values`.
- [ ] **Step 5: Place-page links.** `ClaimList` renders a discreet « Corriger » link under each claim when `correctHref` is set (after the attribution line, small, `text-mediterranee`, underlined on hover). The place page passes `correctHref={(id) => \`/lieux/${slug}/corriger/${id}\`}` to both the place list and the parent list. In the sidebar links row (next to « Carte officielle ↗ » / « Google Maps ↗ »), add « Signaler une erreur » → `/lieux/${slug}/corriger` (part 3 moves it into the new sidebar card).
- [ ] **Step 6: Verify** — `pnpm lint && pnpm test && pnpm build`; `/lieux/[slug]` still ◐; dev smoke: both correction pages return 200, an unknown claim id 404s.
- [ ] **Step 7: Commit** — `git commit -m "feat(contributions): correction and error-report forms"`

---

### Task 3: New place form

**Files:**
- Create: `src/components/contribute/PlaceProposalForm.tsx`, `app/(public)/contribuer/nouveau-lieu/page.tsx`, `app/(public)/contribuer/nouveau-lieu/actions.ts`
- Modify: `src/contributions/schema.ts`, `app/(public)/lieux/page.tsx`

**Interfaces:**
- Produces: `PlaceProposalSchema` (`placeName` 2–120, `placeCommune` 2–80, `locationHint` ≤ 500 or empty → null, `text` 10–1000); `submitPlaceProposal(prev: FormState, formData: FormData): Promise<FormState>`.

- [ ] **Step 1: Schema** per Interfaces.
- [ ] **Step 2: Form** (client, tip-form pattern): « Nom du lieu », « Commune », « Comment le trouver ? » (hint « Un repère, un chemin, ou un lien Google Maps »), « Pourquoi il mérite sa place dans le guide ? » (counter, maxLength 1000), `IdentityFields`, « Envoyer pour relecture ».
- [ ] **Step 3: Page** `/contribuer/nouveau-lieu` (`noindex`; title « Proposer un lieu »; shell eyebrow « Nouveau lieu », H1 « Proposer un lieu »).
- [ ] **Step 4: Action**: validate; `submitContribution({ data: { type: "PLACE", placeId: null, placeName, placeCommune, locationHint, text }, formData, formPath: "/contribuer/nouveau-lieu", next: "/lieux" })`, wrapping errors with `values`. (Part 3 switches `next` to `/contribuer` when that page exists.)
- [ ] **Step 5: Banner on `/lieux`**: render `<ContributionBanner />` inside `<Suspense fallback={null}>` above the grid; `/lieux` stays ◐/static.
- [ ] **Step 6: Verify** — `pnpm lint && pnpm test && pnpm build`; dev smoke: page 200.
- [ ] **Step 7: Commit** — `git commit -m "feat(contributions): propose-a-place form"`

---

### Task 4: Photo contributions

**Files:**
- Move: `app/admin/places/compress-photo.ts` → `src/storage/compress-photo.ts` (update admin imports)
- Modify: `src/storage/place-photos.ts`, `src/storage/photo-types.ts`, `src/contributions/service.ts`, `src/contributions/submit.ts`, `src/contributions/schema.ts`, `app/(public)/lieux/[slug]/page.tsx`, `src/components/PlaceGallery.tsx` (only if the empty-panel copy lives there)
- Create: `src/components/contribute/PhotoForm.tsx`, `app/(public)/lieux/[slug]/photos/page.tsx`, `app/(public)/lieux/[slug]/photos/actions.ts`

**Interfaces:**
- Produces:
  - `compressPhoto(input: File, options?: { maxSizeMB?: number; maxWidthOrHeight?: number; maxBytes?: number }): Promise<File>` — defaults keep today's admin behaviour (1.5, 2400, `MAX_PHOTO_BYTES`).
  - `CONTRIBUTION_PHOTO_MAX_BYTES = 1024 * 1024`, `CONTRIBUTION_PHOTOS_TOTAL_MAX_BYTES = 4 * 1024 * 1024`, `CONTRIBUTION_PHOTOS_MAX = 6` in `photo-types.ts`.
  - `contributionPhotoKey(contributionId: string, type: PlacePhotoType): string` → `contributions/{contributionId}/{uuid}.{ext}`.
  - `type ContributionPhotoUpload = { body: Uint8Array; type: PlacePhotoType }`; `createPendingContribution` and `createUnconfirmedContribution` take an optional third parameter `photos?: ContributionPhotoUpload[]`; `submitContribution` input gains `photos?: ContributionPhotoUpload[]` passed through.
  - `submitPhotos(slug: string, prev: FormState, formData: FormData): Promise<FormState>`.

- [ ] **Step 1: Move and parametrize `compressPhoto`**; admin `PlacePhotoFields` keeps its behaviour.
- [ ] **Step 2: Storage + service.** After creating the contribution row, upload each photo with `putPlacePhoto(contributionPhotoKey(id, type), body, type)` and create `ContributionPhoto` rows (`order` = index). If any upload fails: delete the objects already uploaded, delete the contribution, and return `{ error: "Une photo n'a pas pu être envoyée, réessayez." }`. The admin notification is sent only after photos are stored.
- [ ] **Step 3: `PhotoForm`** (client): file input (`accept` JPEG, PNG, WebP + `HEIC_INPUT_TYPES`, `multiple`), thumbnails of the selection with « Retirer », max 6 (extra files → « 6 photos maximum. »); required consent checkbox « J'ai pris ces photos et j'accepte qu'elles soient publiées sur le guide avec mon nom. » (`name="photosConsent"`); `IdentityFields`. On submit: `preventDefault`, compress each file with `compressPhoto(file, { maxSizeMB: 0.6, maxWidthOrHeight: 1600, maxBytes: CONTRIBUTION_PHOTO_MAX_BYTES })` showing « Préparation des photos… », build a `FormData` from the form plus the compressed files under `photos`, then call the `useActionState` action inside `startTransition`. A file that fails to compress shows « {nom du fichier} : {raison} » and blocks sending. On a returned error, show it plus « Sélectionnez à nouveau vos photos. ».
- [ ] **Step 4: Page** `/lieux/[slug]/photos` (`noindex`, ACTIVE only; title « Ajouter des photos — {name} », H1 « Vos photos de {name} »).
- [ ] **Step 5: `submitPhotos`**: read `formData.getAll("photos")` as `File`s; server-side checks — 1–6 files (« Ajoutez entre 1 et 6 photos. »), each `isPlacePhotoType` (« Format non supporté (JPEG, PNG ou WebP). ») and ≤ 1 MB, total ≤ 4 MB (« Photos trop lourdes, réessayez avec moins de photos. »), consent « on » (« Merci de confirmer que vous avez pris ces photos. »); convert to `Uint8Array`; `submitContribution({ data: { type: "PHOTOS", placeId, photosConsentAt: new Date() }, photos, formData, formPath, next })`, wrapping errors with `values` (identity fields only).
- [ ] **Step 6: Gallery link.** Under the place gallery, « Ajouter vos photos » → `/lieux/${slug}/photos`. When the place has no photo at all, the empty panel reads « Pas encore de photo de ce lieu. Vous en avez ? » with the same link.
- [ ] **Step 7: Verify** — `pnpm lint && pnpm test && pnpm build`; dev smoke: page 200. Do not submit photos against the shared bucket.
- [ ] **Step 8: Commit** — `git commit -m "feat(contributions): photo contributions"`

---

### Task 5: Admin queue — corrections and new places

**Files:**
- Create: `src/corpus/slug.ts`, `app/admin/contributions/CorrectionReview.tsx`, `app/admin/contributions/PlaceReview.tsx`
- Modify: `app/admin/contributions/page.tsx`, `app/admin/contributions/actions.ts`, `app/admin/places/actions.ts`, `src/email/templates.ts`, `src/corpus/queries.ts`, `src/corpus/queries.test.ts`, `app/(public)/lieux/[slug]/page.tsx`

**Interfaces:**
- Produces:
  - `slugify(name: string): string` (moved from `app/admin/places/actions.ts`) and `uniquePlaceSlug(name: string): Promise<string>` (appends `-2`, `-3`… until free) in `src/corpus/slug.ts`.
  - Templates: `correctionAcceptedEmail(input: { placeName: string; placeUrl: string; updated: boolean; note: string | null }): EmailContent` — subject « Merci, la fiche {placeName} a été mise à jour » when `updated`, else « Merci, on en a tenu compte pour la fiche {placeName} »; `placeAcceptedEmail(input: { placeName: string; note: string | null }): EmailContent` — subject « Bonne idée : {placeName} va rejoindre le guide ».
  - Actions: `applyCorrection(contributionId: string, formData: FormData): Promise<void>` (edits the claim text), `retireCorrectedClaim(contributionId: string, formData: FormData): Promise<void>`, `acknowledgeCorrection(contributionId: string, formData: FormData): Promise<void>`, `createPlaceDraft(contributionId: string, formData: FormData): Promise<void>`. `rejectContribution` already handles every type.

- [ ] **Step 1: Slug helper** extracted; admin places actions import it.
- [ ] **Step 2: Templates** per Interfaces (body includes the place URL when given and the note when present).
- [ ] **Step 3: Page.** The queue renders by type: `TipReview` (existing), `CorrectionReview`, `PlaceReview`, and for PHOTOS a read-only placeholder until Task 6. Each card shows contributor (name, commune, email), date, place.
  - `CorrectionReview`: kind label, the contributor text; for a tip correction, the current claim text quoted and three forms — « Modifier le conseil » (textarea prefilled with the claim text, 10–500) → `applyCorrection`, « Retirer le conseil » → `retireCorrectedClaim`, « Noter sans changement » → `acknowledgeCorrection`; for a place correction, « Noter » → `acknowledgeCorrection` and the hint « À appliquer dans la fiche du lieu » linking `/admin/places/{placeId}`. Each form has the optional note field. Plus « Refuser ».
  - `PlaceReview`: name, commune, location hint, text; « Créer le brouillon » → `createPlaceDraft`; « Refuser ».
- [ ] **Step 4: Actions** (all call `assertAdmin()` first; atomic gate per Global Constraints).
  - `applyCorrection`: in the transaction, gate, then update the claim's `claimText` and `verifiedOn: now`; after commit `updateTag("corpus")`, email `correctionAcceptedEmail({ updated: true })`.
  - `retireCorrectedClaim`: gate, claim `status: RETIRED`; `updateTag("corpus")`; email `updated: true`.
  - `acknowledgeCorrection`: gate only; email `updated: false`.
  - `createPlaceDraft`: gate, then create a `DRAFT` place: `slug = await uniquePlaceSlug(placeName)` (compute before the transaction), `name`, `commune = placeCommune`, `departement: "13"`, `lat: 43.1748`, `lng: 5.6047`, `type: "SITE"`, `description = text` + (locationHint ? `\n\nComment le trouver : ${locationHint}` : ""), `proposedById = userId`; email `placeAcceptedEmail`; `redirect(\`/admin/places/${place.id}\`)` (outside try/catch).
- [ ] **Step 5: « Lieu proposé par ».** `getPlaceBySlug` includes `proposedBy: { select: { name: true } }` (update the include assertion in `queries.test.ts`); the place header meta adds « Lieu proposé par {name} » when set.
- [ ] **Step 6: Verify** — `pnpm lint && pnpm test && pnpm build`; dev smoke: `/admin/contributions` 200 with Basic Auth. Do not act on real rows.
- [ ] **Step 7: Commit** — `git commit -m "feat(admin): review corrections and place proposals"`

---

### Task 6: Admin queue — photos

**Files:**
- Create: `app/admin/contributions/PhotosReview.tsx`
- Modify: `app/admin/contributions/page.tsx`, `app/admin/contributions/actions.ts`, `src/email/templates.ts`

**Interfaces:**
- Produces: `photosPublishedEmail(input: { placeName: string; placeUrl: string; count: number; note: string | null }): EmailContent` — subject « Votre photo sur {placeName} est en ligne, merci ! » when `count === 1`, else « Vos photos sur {placeName} sont en ligne, merci ! »; `publishPhotos(contributionId: string, formData: FormData): Promise<void>`.

- [ ] **Step 1: `PhotosReview`**: thumbnails (`placePhotoUrl(key)`, plain `<img>` with dimensions or `next/image`), one checkbox per photo named `keep` with the photo id as value (all checked by default), optional note, « Publier la sélection » → `publishPhotos`; « Refuser » (existing action deletes every object).
- [ ] **Step 2: `publishPhotos`**: `assertAdmin()`; read kept ids; none → return without changes (Review Focus 5). Transaction: gate (`type: "PHOTOS"`), read the place's max `PlacePhoto.order`, create one `PlacePhoto` per kept photo (`key` reused, `credit = contribution user's name`, `order` = max + 1…), delete the unkept `ContributionPhoto` rows. After commit: delete the unkept objects (`deletePlacePhotos`), `updateTag("corpus")`, email `photosPublishedEmail`.
- [ ] **Step 3: Verify** — `pnpm lint && pnpm test && pnpm build`.
- [ ] **Step 4: Commit** — `git commit -m "feat(admin): review photo contributions"`

---

### Task 7: Verification and manual test steps

**Files:**
- Create: `docs/superpowers/plans/2026-10-17-contributions-2-manual-tests.md`

- [ ] **Step 1: Full check** — `pnpm lint && pnpm test && pnpm build`; `/lieux` and `/lieux/[slug]` still ◐.
- [ ] **Step 2: Manual test steps** (French, same format as part 1's doc; quote UI strings exactly as they appear in the code), each with expected result:
  1. Corriger a tip signed in → « En relecture » box shows « Correction »; admin « Modifier le conseil » → new text on the place page, email « Merci, la fiche … a été mise à jour ».
  2. Same with « Retirer le conseil » → tip gone; « Noter sans changement » → email « …on en a tenu compte… ».
  3. Open a correction page, retire that tip in admin, then submit → « Ce conseil n'est plus en ligne. ».
  4. « Signaler une erreur » from the sidebar → admin « Noter » with the link to the place's admin page.
  5. Propose a place signed out → magic link → `/lieux` with the banner; admin « Créer le brouillon » → lands on the draft in `/admin/places`, slug unique, description includes « Comment le trouver : … »; email « Bonne idée : … ». After activating it, the place page shows « Lieu proposé par … ».
  6. Add 2 photos including a HEIC from a phone → thumbnails in « En relecture »; admin keeps one → only that one in the gallery, credited with the name; email « Votre photo sur … ».
  7. 7 photos → « 6 photos maximum. »; a non-image file → compression error shown, nothing sent.
  8. Admin unticks all photos and publishes → nothing changes; « Refuser » → photos gone, rejection email.
  9. A throttled signed-out submit (send twice within a minute) → second goes straight to « Vérifiez votre boîte mail ».
  10. Rename on `/compte` without any published tip → header initial updates immediately.
- [ ] **Step 3: Commit** — `git commit -m "docs: manual test steps for contributions part 2"`
