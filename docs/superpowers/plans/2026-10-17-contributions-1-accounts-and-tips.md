# Contributions 1 — Accounts and Tips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A visitor can add a tip to a place (signing in by magic link at submit if needed), sees it « en relecture » on the place page, Alexandre publishes or declines it from `/admin/contributions`, and published tips show their author.

**Architecture:** Better Auth (magic-link plugin, Prisma adapter) stores users and sessions in our Neon DB; Resend sends emails. A generic `src/contributions/` module owns contribution creation, the signed-out draft → magic link → attach flow, and pending lookups; the tip form is its first consumer (plan 2 adds corrections, photos and new places on the same module). Public pages stay cached; session reads live only in small Suspense holes.

**Tech Stack:** Next.js 16.2 (App Router, `cacheComponents`), React 19, Prisma 7 (`prisma/generated/client`), better-auth 1.7.7, resend 6.32.0, zod 4, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-10-17-community-contributions-design.md` (this plan covers its §1 routes for tips/account/legal, §2 in full, §3 for tips, the tip-related parts of §5 place page, §6 for TIP). Plan 2: corrections, photos, new places. Plan 3: page rework, `/contribuer`, WhatsApp removal, `spec/` updates.

## Global Constraints

- **Read before coding:** `AGENTS.md` — this Next.js differs from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code (at least `01-app/01-getting-started/07-mutating-data.md`, `08-caching.md`, `15-route-handlers.md`, `02-guides/forms.md`, `02-guides/authentication.md`).
- **No new automated tests** (project rule). Existing tests must stay green; adjust an existing test only where behaviour intentionally changes. Each task verifies with `pnpm lint`, `pnpm test`, and `pnpm build` where noted.
- Versions pinned exactly: `better-auth@1.7.7`, `resend@6.32.0`.
- All user-facing copy in French, exactly as given in this plan when quoted. Sentence case. The word « IA » never appears.
- Contribution text is rendered as plain text only, never HTML.
- Every server action and route handler re-reads the session server-side (`getSessionUser()`); never trust form fields for identity.
- Redirect targets coming from query strings or cookies go through `safeNextPath()`.
- No email address or other personal data in URLs.
- Session-dependent UI must sit inside a `<Suspense>` boundary so cached page shells stay static.
- Comments only for non-obvious logic (user rule).
- Field limits (zod, server-side): tip text 10–500 chars; display name 2–40; commune 2–80 (optional); email valid; ≤ 10 contributions awaiting review per user (or per pending email); `UNCONFIRMED` rows expire after 7 days; magic links expire after 15 minutes (`expiresIn: 900`).
- Contributor tips are created with `conditions: []`, `audience: []`, `verdict: GO`, `verification: LOCAL_TESTIMONY`, `decayClass: SEASONAL`, `isPublic: true`, `status: PUBLISHED`. The corpus rule "conditions required unless PERMANENT" applies to admin capture and seed files, not to contributor tips.

## Review Focus

1. **Magic link opened in another browser** (mobile mail app): the contribution must still attach — attachment keys on the verified email, not on a cookie. Manual test step in Task 9.
2. **Expired or reused link** (`?error=INVALID_TOKEN` / expired): user lands on `/connexion/verifier?erreur=lien` with a working « Renvoyer le lien » when the pending cookie exists, and a path forward when it doesn't. Owned by Task 4.
3. **Open redirect via `next`**: `/connexion/confirmer?next=//evil.com` or `next=https://…` must redirect to `/`. Owned by Task 3 (`safeNextPath`), exercised in Task 9 manual steps.
4. **Signed-in user with an empty name** (account created from `/compte` without a name): the tip form must ask for a display name before submitting, and the tip must never be published as « · ». Owned by Task 5.
5. **Email provider down at submit**: the contribution is kept (UNCONFIRMED), the user reaches `/connexion/verifier?erreur=envoi` with a resend button; nothing is lost. Owned by Tasks 3–4.

---

### Task 1: Data model and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_community_contributions/migration.sql` (generated)
- Modify: `src/corpus/taxonomy.ts` (remove `REQUEST_TYPES`, `RequestTypeSchema`)

**Interfaces:**
- Produces: Prisma models `User`, `Session`, `Account`, `Verification`, `Contribution`, `ContributionPhoto`; enums `ContributionType { TIP CORRECTION PLACE PHOTOS }`, `ContributionStatus { UNCONFIRMED PENDING APPROVED REJECTED }`, `CorrectionKind { OUTDATED WRONG MISSING_DETAIL }`; fields `Claim.authorId`, `Claim.author`, `Claim.authorDeleted`, `Place.proposedById`, `Place.proposedBy`. Removes `Request`, `RequestClaimUsed`, `RequestClaimCreated`, `Channel`, `Outcome`.

- [ ] **Step 1: Add the Better Auth models** (Better Auth generates its own string ids, so no `@default` on `id`):

```prisma
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  commune       String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @default(now()) @updatedAt

  sessions       Session[]
  accounts       Account[]
  contributions  Contribution[]
  claims         Claim[]  @relation("ClaimAuthor")
  proposedPlaces Place[]  @relation("PlaceProposer")

  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @default(now()) @updatedAt

  @@index([identifier])
  @@map("verification")
}
```

- [ ] **Step 2: Add `Contribution`, `ContributionPhoto` and the three enums exactly as in spec §2 "Contribution"**, with these relation details: `user User? @relation(fields: [userId], references: [id], onDelete: Cascade)`; `place Place? @relation(fields: [placeId], references: [id])`; `claim Claim? @relation(fields: [claimId], references: [id])`. Add back-relations `contributions Contribution[]` on `Place` and `Claim`.

- [ ] **Step 3: Add attribution fields.** On `Claim`: `authorId String?`, `author User? @relation("ClaimAuthor", fields: [authorId], references: [id], onDelete: SetNull)`, `authorDeleted Boolean @default(false)`. On `Place`: `proposedById String?`, `proposedBy User? @relation("PlaceProposer", fields: [proposedById], references: [id], onDelete: SetNull)`.

- [ ] **Step 4: Remove the concierge log.** Delete models `Request`, `RequestClaimUsed`, `RequestClaimCreated`, enums `Channel`, `Outcome`, the `requestsUsedIn` / `requestsCreatedBy` relations on `Claim`, and the "Concierge log" comment. In `src/corpus/taxonomy.ts` delete `REQUEST_TYPES` and `RequestTypeSchema`.

- [ ] **Step 5: Create the migration without applying it**

Run: `pnpm exec prisma migrate dev --create-only --name community_contributions`
Expected: a new folder under `prisma/migrations/` whose SQL creates `user`, `session`, `account`, `verification`, `Contribution`, `ContributionPhoto`, the three enums, adds the `Claim`/`Place` columns + FKs, and drops `Request`, `RequestClaimUsed`, `RequestClaimCreated`, `Channel`, `Outcome`. No other drops. If the shadow database is unavailable, write the SQL with `prisma migrate diff` (schema of `HEAD~` vs current) into the folder by hand.

- [ ] **Step 6: STOP — controller checkpoint.** `DATABASE_URL` is the shared production database. The implementer does not apply the migration; report the SQL to the controller, who asks the user before running `pnpm exec prisma migrate deploy`.

- [ ] **Step 7: Generate the client and verify**

Run: `pnpm exec prisma generate && pnpm lint && pnpm test`
Expected: all pass (no code references the removed models).

- [ ] **Step 8: Commit**

```bash
git add prisma src/corpus/taxonomy.ts
git commit -m "feat(contributions): data model for accounts, contributions and attribution"
```

---

### Task 2: Auth and email foundation

**Files:**
- Create: `src/auth/auth.ts`, `src/auth/session.ts`, `src/auth/auth-client.ts`
- Create: `app/api/auth/[...all]/route.ts`
- Create: `src/email/send.ts`, `src/email/templates.ts`
- Modify: `package.json` (deps), `.env.dist`

**Interfaces:**
- Produces:
  - `auth` (Better Auth instance) from `src/auth/auth.ts`.
  - `type SessionUser = { id: string; name: string; email: string; commune: string | null }` and `getSessionUser(): Promise<SessionUser | null>` from `src/auth/session.ts` (wraps `auth.api.getSession({ headers: await headers() })`).
  - `authClient` from `src/auth/auth-client.ts` (`createAuthClient` from `better-auth/react` with `magicLinkClient()`).
  - `sendEmail(message: { to: string; subject: string; text: string }): Promise<void>` from `src/email/send.ts` — throws on provider failure.
  - From `src/email/templates.ts`: `type EmailContent = { subject: string; text: string }`; `magicLinkEmail(url: string): EmailContent`; `adminNewContributionEmail(input: { typeLabel: string; placeName: string }): EmailContent`; `tipPublishedEmail(input: { placeName: string; placeUrl: string; note: string | null }): EmailContent`; `contributionRejectedEmail(input: { note: string | null }): EmailContent`.

- [ ] **Step 1: Install**

Run: `pnpm add better-auth@1.7.7 resend@6.32.0`

- [ ] **Step 2: Implement `src/auth/auth.ts`**: `betterAuth({ database: prismaAdapter(prisma, { provider: "postgresql" }), user: { additionalFields: { commune: { type: "string", required: false, input: false } } }, plugins: [magicLink({ expiresIn: 900, sendMagicLink: async ({ email, url }) => sendEmail({ to: email, ...magicLinkEmail(url) }) }), nextCookies()] })`. `prisma` from `src/corpus/db.ts`. `nextCookies()` must be last. Base URL and secret come from `BETTER_AUTH_URL` / `BETTER_AUTH_SECRET`.

- [ ] **Step 3: Route handler** `app/api/auth/[...all]/route.ts`: `export const { GET, POST } = toNextJsHandler(auth);` (`better-auth/next-js`). `robots.ts` already disallows `/api`.

- [ ] **Step 4: Implement `sendEmail`**: lazy `new Resend(process.env.RESEND_API_KEY)`, `from: process.env.EMAIL_FROM`. When `RESEND_API_KEY` is unset and `NODE_ENV !== "production"`, `console.info` the subject + text (so magic links are usable in dev) and return. Throw when Resend returns an `error`.

- [ ] **Step 5: Implement the templates** (plain text, sober, signed « Alexandre — Guide Nature de La Ciotat »). Subjects verbatim:
  - `magicLinkEmail`: parse the `callbackURL` query param of `url`; if it starts with `/connexion/confirmer` → « Confirmez votre email pour envoyer votre contribution », else « Votre lien de connexion au Guide Nature de La Ciotat ». Body contains the URL and « Ce lien expire dans 15 minutes. »
  - `adminNewContributionEmail`: « Nouvelle contribution à relire — {typeLabel} · {placeName} », body links to `${NEXT_PUBLIC_SITE_URL}/admin/contributions`.
  - `tipPublishedEmail`: « Votre astuce sur {placeName} est en ligne, merci ! », body has `placeUrl` and the note when present.
  - `contributionRejectedEmail`: « Votre contribution n'a pas été retenue », body quotes the note, or when null: « Elle ne correspondait pas tout à fait à la charte du guide. Merci d'avoir pris le temps de l'écrire. »

- [ ] **Step 6: Env template.** Append to `.env.dist`: `BETTER_AUTH_SECRET=<openssl rand -base64 32>`, `BETTER_AUTH_URL=http://localhost:3000`, `RESEND_API_KEY=<re_...; leave empty in dev to log emails to the console>`, `EMAIL_FROM=Guide Nature de La Ciotat <contact@laciotatnature.fr>`, `ADMIN_EMAIL=<where new contributions are announced>`.

- [ ] **Step 7: Verify**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: pass. Then with `pnpm dev`: `curl -s -X POST localhost:3000/api/auth/sign-in/magic-link -H 'content-type: application/json' -d '{"email":"you@example.com","callbackURL":"/"}'` returns `{"status":true}` and the console logs « Votre lien de connexion… » with a URL (requires Task 1's migration applied).

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml .env.dist src/auth src/email "app/api/auth"
git commit -m "feat(auth): Better Auth magic link and Resend email foundation"
```

---

### Task 3: Contributions core module

**Files:**
- Create: `src/contributions/schema.ts`, `src/contributions/paths.ts`, `src/contributions/pending-cookie.ts`, `src/contributions/service.ts`, `src/contributions/submit.ts`

**Interfaces:**
- Consumes: `getSessionUser`, `auth`, `sendEmail`, `magicLinkEmail`, `adminNewContributionEmail` (Task 2).
- Produces:
  - `schema.ts`: `TIP_THEMES: { value: ClaimType; label: string }[]` (order and labels: Accès ACCESS, Infos pratiques PRACTICAL, Affluence CROWDING, Pour qui SUITABILITY, Activités ACTIVITY, Faune & flore NATURE, Sécurité SAFETY, À éviter AVOID, Astuce TIP); `TipInputSchema` (`claimType` ∈ TIP_THEMES values, default TIP; `text` 10–500 trimmed); `DisplayNameSchema` (2–40 trimmed); `IdentitySchema` (`name` = DisplayNameSchema, `commune` optional 2–80 or empty → null, `email` lowercased valid email, `consent` must be "on"); `CONTRIBUTION_TYPE_LABELS: Record<ContributionType, string>` (TIP « Astuce », CORRECTION « Correction », PLACE « Nouveau lieu », PHOTOS « Photos »).
  - `paths.ts`: `safeNextPath(next: string | null | undefined): string` — returns `next` only if it starts with `/` and not `//` or `/\`, else `/`; `withSentFlag(path: string): string` — appends `contribution=envoyee` with `?` or `&`.
  - `pending-cookie.ts`: `type PendingCookie = { email: string; next: string; formPath: string; sentAt: number }`; `readPendingCookie(): Promise<PendingCookie | null>`; `writePendingCookie(value: PendingCookie): Promise<void>` (httpOnly, sameSite lax, secure in production, path `/`, maxAge 1 day, name `nc_pending`); `clearPendingCookie(): Promise<void>`.
  - `service.ts`: `type ContributionData = Pick<Prisma.ContributionUncheckedCreateInput, "type" | "placeId" | "claimId" | "text" | "claimType" | "correctionKind" | "placeName" | "placeCommune" | "locationHint" | "photosConsentAt">`; `MAX_AWAITING_REVIEW = 10`; `createPendingContribution(userId: string, data: ContributionData): Promise<{ id: string } | { error: string }>`; `createUnconfirmedContribution(identity: { email: string; name: string; commune: string | null }, data: ContributionData): Promise<{ id: string } | { error: string }>`; `attachUnconfirmedContributions(user: SessionUser): Promise<number>`; `type PendingItem = { id: string; type: ContributionType; text: string | null; createdAt: Date; photoKeys: string[] }`; `getPendingContributions(userId: string, placeIds: string[]): Promise<PendingItem[]>`.
  - `submit.ts`: `type FormState = { error?: string; fieldErrors?: Record<string, string> }`; `submitContribution(input: { data: ContributionData; formData: FormData; formPath: string; next: string }): Promise<FormState>` — redirects on success, returns `FormState` on validation/cap errors.

- [ ] **Step 1: `schema.ts` and `paths.ts`** per the interfaces above.

- [ ] **Step 2: `pending-cookie.ts`** using `cookies()` from `next/headers`; parse defensively (invalid JSON → `null`).

- [ ] **Step 3: `service.ts`.**
  - `createPendingContribution`: count the user's `PENDING` rows; `>= MAX_AWAITING_REVIEW` → `{ error: "Vous avez déjà 10 contributions en relecture. Merci de patienter un peu." }`. Create with `status: PENDING`. Then `notifyAdmin(contribution)` — sends `adminNewContributionEmail` to `ADMIN_EMAIL` with the place name (or `placeName` for PLACE); email failures are logged, never thrown.
  - `createUnconfirmedContribution`: first delete `UNCONFIRMED` rows older than 7 days (with their `ContributionPhoto` objects via `deletePlacePhotos` from `src/storage/place-photos.ts`); then the same cap counted on `UNCONFIRMED` rows with that `pendingEmail`; create with `status: UNCONFIRMED`, `pendingEmail`, `pendingName`, `pendingCommune`, `userId: null`.
  - `attachUnconfirmedContributions(user)`: in one transaction, find `UNCONFIRMED` rows with `pendingEmail = user.email`; if `user.commune` is null and the most recent row has `pendingCommune`, update the user's `commune`; update rows → `userId = user.id`, `status = PENDING`, `pending* = null`. After the transaction, `notifyAdmin` each. Return the count.
  - `getPendingContributions`: `PENDING` rows of `userId` whose `placeId` ∈ `placeIds`, newest first, with photo keys ordered.

- [ ] **Step 4: `submit.ts` — the shared submit flow.**
  1. Honeypot: if `formData.get("website")` is non-empty → `redirect(withSentFlag(next))` without saving.
  2. `user = await getSessionUser()`.
  3. Signed in with a non-empty name → `createPendingContribution(user.id, data)`; on success `redirect(withSentFlag(next))`.
  4. Signed in with an empty name → validate `DisplayNameSchema` from `formData.get("name")`, update the user's `name` (and `commune` if provided), then step 3.
  5. Signed out → validate `IdentitySchema`; `createUnconfirmedContribution`; then `auth.api.signInMagicLink({ body: { email, name, callbackURL: \`/connexion/confirmer?next=${encodeURIComponent(next)}\`, errorCallbackURL: "/connexion/verifier?erreur=lien" }, headers: await headers() })`; `writePendingCookie({ email, next, formPath, sentAt: Date.now() })`; `redirect("/connexion/verifier")`, or `redirect("/connexion/verifier?erreur=envoi")` if the magic-link call threw (the contribution is kept).
  Field errors are returned keyed by field name with French messages (e.g. `name`: « Choisissez un nom de 2 à 40 caractères. », `email`: « Cette adresse email ne semble pas valide. », `consent`: « Merci d'accepter la charte et la politique de confidentialité. »). `redirect()` must be called outside any try/catch.

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm test`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/contributions
git commit -m "feat(contributions): core module for creating, confirming and listing contributions"
```

---

### Task 4: Sign-in-at-submit pages

**Files:**
- Create: `app/(public)/connexion/verifier/page.tsx`, `app/(public)/connexion/verifier/actions.ts`
- Create: `app/(public)/connexion/confirmer/route.ts`

**Interfaces:**
- Consumes: `readPendingCookie`, `writePendingCookie`, `clearPendingCookie`, `safeNextPath`, `withSentFlag`, `attachUnconfirmedContributions`, `getSessionUser`, `auth`.
- Produces: `resendContributionLink(): Promise<{ error?: string; sent?: boolean }>` server action.

- [ ] **Step 1: `/connexion/verifier` page** (`noindex`, title « Vérifiez votre boîte mail »). Reads the pending cookie and `searchParams.erreur` inside a Suspense boundary.
  - Default: « Dernière étape : cliquez sur le lien envoyé à {masked}. Votre contribution partira en relecture aussitôt. » where masked = first character + « ••• » + « @ » + domain.
  - `erreur=lien`: « Ce lien a expiré ou a déjà servi. Demandez-en un nouveau. »
  - `erreur=envoi`: « L'email n'a pas pu partir. Votre contribution est bien gardée : réessayez. »
  - With a cookie: « Renvoyer le lien » button (form → `resendContributionLink`) and « Mauvaise adresse ? Recommencer » linking to `cookie.formPath`. Without a cookie: a link « Recevoir un lien de connexion » → `/compte`.
- [ ] **Step 2: `resendContributionLink`**: read the cookie (none → error « Session expirée, recommencez depuis le formulaire. »); refuse if `Date.now() - sentAt < 60_000` (« Patientez une minute avant de redemander un lien. »); call `auth.api.signInMagicLink` with the same `callbackURL`/`errorCallbackURL` as Task 3 using `cookie.next`; rewrite the cookie with a new `sentAt`; return `{ sent: true }` (page shows « Nouveau lien envoyé. »).
- [ ] **Step 3: `/connexion/confirmer` route handler (GET)**: `user = await getSessionUser()`; none → redirect `/connexion/verifier?erreur=lien`. Otherwise `attachUnconfirmedContributions(user)`, `clearPendingCookie()`, redirect to `withSentFlag(safeNextPath(searchParams.get("next")))`.
- [ ] **Step 4: Verify** — `pnpm lint && pnpm test && pnpm build`, expected pass.
- [ ] **Step 5: Commit** — `git commit -m "feat(contributions): magic link confirmation and check-your-inbox pages"`

---

### Task 5: Tip form

**Files:**
- Create: `src/components/contribute/ContributionShell.tsx`, `src/components/contribute/Charter.tsx`, `src/components/contribute/IdentityFields.tsx`, `src/components/contribute/TipForm.tsx`
- Create: `app/(public)/lieux/[slug]/astuce/page.tsx`, `app/(public)/lieux/[slug]/astuce/actions.ts`

**Interfaces:**
- Consumes: `submitContribution`, `FormState`, `TipInputSchema`, `TIP_THEMES`, `getSessionUser`, `getPlaceBySlug`.
- Produces (reused by plan 2 forms):
  - `ContributionShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode })` — eyebrow (e.g. « Calanque · La Ciotat »), H1, the review notice, the `Charter` disclosure, then children.
  - `Charter()` — `<details>` titled « Ce qui est publié : la charte » with the spec §5 `/contribuer` charter (accepted / declined lists). Plan 3 reuses it on `/contribuer`.
  - `IdentityFields({ user, fieldErrors }: { user: SessionUser | null; fieldErrors?: Record<string, string> })` — signed out: name, commune, email, consent; signed in with empty name: name + commune; signed in with a name: « Publié sous le nom **{name} · {commune}** · modifier » (→ `/compte`, commune part omitted when null).
  - `submitTip(slug: string, prev: FormState, formData: FormData): Promise<FormState>`.

- [ ] **Step 1: Shell + charter + identity fields.** Review notice verbatim: « Relu par Alexandre avant publication, en général sous quelques jours. Vous recevrez un email quand c'est en ligne. » Identity labels verbatim: « Votre nom affiché » (hint « Un prénom ou un pseudo »), « Votre commune (facultatif) », « Votre email (jamais affiché) », checkbox « J'accepte la charte et la politique de confidentialité » with « politique de confidentialité » linking to `/confidentialite`. Include the hidden honeypot `<input name="website" tabIndex={-1} autoComplete="off">` in a visually hidden wrapper.
- [ ] **Step 2: Page** `/lieux/[slug]/astuce`: `notFound()` unless the place is ACTIVE (`getPlaceBySlug`); metadata `robots: { index: false }`, title « Ajouter une astuce — {name} ». Renders `ContributionShell` (eyebrow `{type label} · {commune}`, title « Une astuce sur {name} ») and, inside `<Suspense>`, a server component that reads `getSessionUser()` and renders `TipForm`.
- [ ] **Step 3: `TipForm`** (client, `useActionState(submitTip.bind(null, slug), {})`): theme chips as a radio group from `TIP_THEMES` (default « Astuce »), textarea `text` (maxLength 500, live counter) with hint « Une info concrète : l'heure à viser, où se garer, ce qu'on aurait aimé savoir. », `IdentityFields`, submit « Envoyer pour relecture » via the existing `SubmitButton` pattern (copy it to `src/components/contribute/` or move `app/admin/SubmitButton.tsx` to `src/components/SubmitButton.tsx` and update its imports). Field errors render under their field; `state.error` above the button. Style with the place-page tokens (`06-design.md`).
- [ ] **Step 4: `submitTip`**: validate `TipInputSchema` (errors → `fieldErrors`); look up the ACTIVE place by slug (missing → `{ error: "Ce lieu n'est plus disponible." }`); call `submitContribution({ data: { type: "TIP", placeId, text, claimType }, formData, formPath: \`/lieux/${slug}/astuce\`, next: \`/lieux/${slug}\` })`.
- [ ] **Step 5: Verify** — `pnpm lint && pnpm test && pnpm build`, expected pass.
- [ ] **Step 6: Commit** — `git commit -m "feat(contributions): add-a-tip form with sign-in at submit"`

---

### Task 6: Place page — attribution, CTA, pending box, banner

**Files:**
- Modify: `src/corpus/queries.ts`, `src/corpus/queries.test.ts`, `src/components/ClaimList.tsx`, `src/site.ts`, `app/(public)/lieux/[slug]/page.tsx`
- Create: `src/components/contribute/PendingContributions.tsx`, `src/components/contribute/ContributionBanner.tsx`

**Interfaces:**
- Consumes: `getSessionUser`, `getPendingContributions`, `CONTRIBUTION_TYPE_LABELS`, `placePhotoUrl`.
- Produces: `GUIDE_AUTHOR = { name: "Alexandre", commune: "La Ciotat" }` in `src/site.ts`; `PublicClaim` now includes `author: { name: string; commune: string | null } | null`; `ClaimList({ claims, title, addTipHref }: { claims: PublicClaim[]; title?: string; addTipHref?: string })`; `PendingContributions({ placeIds }: { placeIds: string[] })`; `ContributionBanner()`.

- [ ] **Step 1: Queries.** In `publicClaimsInclude` add `author: { select: { name: true, commune: true } }`; update the `PublicClaim` type; update the include-shape assertions in `queries.test.ts` accordingly.
- [ ] **Step 2: `ClaimList`.** Default title becomes « Conseils des gens d'ici ». Under each claim text, a small meta line: author → `« {name} · {commune} · {month year} »` (commune omitted when null); `author` null and `authorDeleted` false → `GUIDE_AUTHOR`; `authorDeleted` → « Un ancien contributeur ». Month-year from `verifiedOn` with `Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" })`. When `addTipHref` is set: the section always renders; after the list a « Ajouter une astuce » link-button to `addTipHref`; with zero claims, the empty state « Aucun conseil pour l'instant. Vous connaissez ce lieu ? Partagez la première astuce. » with the button made prominent. Without `addTipHref` (the parent list) keep returning `null` when empty.
- [ ] **Step 3: `PendingContributions`** (async server component): `getSessionUser()`; none → `null`; `getPendingContributions(user.id, placeIds)`; none → `null`; else a box titled « En relecture · visible par vous seul » listing each item: `CONTRIBUTION_TYPE_LABELS[type]`, text (plain), photo thumbnails (`placePhotoUrl(key)`) when any, « Envoyé le {d MMMM yyyy} ».
- [ ] **Step 4: `ContributionBanner`** (client): when `useSearchParams().get("contribution") === "envoyee"`, render a dismissible `role="status"` banner « Merci ! Votre contribution est en relecture. Vous recevrez un email dès qu'elle est en ligne. »
- [ ] **Step 5: Wire the place page.** Main `ClaimList` gets `addTipHref={\`/lieux/${slug}/astuce\`}`. Above the claims list, inside `<Suspense fallback={null}>`: `<ContributionBanner />` and `<PendingContributions placeIds={[place.id, ...place.children.map((c) => c.id)]} />`. The page must stay prerendered (check the build output still lists `/lieux/[slug]` as prerendered/partial).
- [ ] **Step 6: Verify** — `pnpm lint && pnpm test && pnpm build`, expected pass.
- [ ] **Step 7: Commit** — `git commit -m "feat(place): tip attribution, add-a-tip CTA and pending contributions box"`

---

### Task 7: Account page, header avatar, legal pages

**Files:**
- Create: `app/(public)/compte/page.tsx`, `app/(public)/compte/actions.ts`, `app/(public)/compte/SignInForm.tsx`
- Create: `src/components/site/AccountLink.tsx`
- Modify: `src/components/site/SiteHeader.tsx`, `src/site.ts`
- Create: `app/(landing)/confidentialite/page.tsx`, `app/(landing)/mentions-legales/page.tsx`
- Modify: `app/sitemap.ts`

**Interfaces:**
- Consumes: `getSessionUser`, `authClient`, `auth`, `DisplayNameSchema`, `deletePlacePhotos`.
- Produces: server actions `updateAccount(prev: FormState, formData: FormData): Promise<FormState>`, `signOutAction(): Promise<void>`, `deleteAccount(prev: FormState, formData: FormData): Promise<FormState>`; `CONTACT_EMAIL` in `src/site.ts`.

- [ ] **Step 1: `/compte`** (`noindex`, title « Mon compte»), session read inside Suspense.
  - Signed out: `SignInForm` (client) — email field, button « Recevoir le lien », calls `authClient.signIn.magicLink({ email, callbackURL: "/compte" })` (goes through `/api/auth`, so Better Auth's rate limit applies); success « Lien envoyé, vérifiez votre boîte mail. »; error « Le lien n'a pas pu être envoyé. Réessayez dans un instant. »
  - Signed in: form name + commune (« Enregistrer », success « Modifications enregistrées. »), « Se déconnecter », and « Supprimer mon compte » section: « Vos conseils publiés restent en ligne, signés « Un ancien contributeur ». Vos contributions en attente sont supprimées. », required checkbox « Je confirme la suppression », button « Supprimer définitivement ».
- [ ] **Step 2: Actions.** `updateAccount`: validate (`DisplayNameSchema`, commune optional 2–80), update `User`, `updateTag("corpus")` (names show on cached place pages). `signOutAction`: `auth.api.signOut({ headers: await headers() })`, `redirect("/")`. `deleteAccount`: require the checkbox; collect `ContributionPhoto.key`s of the user's non-APPROVED contributions; `auth.api.signOut`; one transaction: `claim.updateMany({ where: { authorId }, data: { authorDeleted: true } })` then `user.delete` (cascades sessions, accounts, contributions); then `deletePlacePhotos(keys)`; `updateTag("corpus")`; `redirect("/")`.
- [ ] **Step 3: `AccountLink`** (async server component): signed in → a round initial (first letter of the name, or « ? ») linking to `/compte` with `aria-label="Mon compte"`; signed out → `null`. Render it in `SiteHeader`'s nav inside `<Suspense fallback={null}>`.
- [ ] **Step 4: Legal pages** (indexed, short, plain prose in the About page style). `CONTACT_EMAIL` constant in `src/site.ts` (value supplied by the user at plan review).
  - `/mentions-legales`: site personnel édité à titre non professionnel (LCEN art. 6-III-2), contact `CONTACT_EMAIL`, hébergeur Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis; photos credited on each page.
  - `/confidentialite`: data collected (email, display name, commune, contributions), purposes (sign-in, credit on published contributions, decision emails), processors (Neon — database, Resend — emails, Vercel — hosting and cookieless audience measurement), retention (until account deletion; unconfirmed drafts 7 days), rights and how to exercise them (`/compte` or `CONTACT_EMAIL`), email never shown publicly.
  - Add both URLs to `app/sitemap.ts`.
- [ ] **Step 5: Verify** — `pnpm lint && pnpm test && pnpm build`, expected pass.
- [ ] **Step 6: Commit** — `git commit -m "feat(account): account page, header avatar, legal pages"`

---

### Task 8: Admin queue for tips

**Files:**
- Create: `app/admin/contributions/page.tsx`, `app/admin/contributions/actions.ts`
- Modify: `app/admin/AdminNav.tsx`, `app/admin/layout.tsx`

**Interfaces:**
- Consumes: `TIP_THEMES`, `CONTRIBUTION_TYPE_LABELS`, `sendEmail`, `tipPublishedEmail`, `contributionRejectedEmail`, `SITE_URL`.
- Produces: `publishTip(contributionId: string, formData: FormData): Promise<void>`, `rejectContribution(contributionId: string, formData: FormData): Promise<void>`; `AdminNav({ pendingCount }: { pendingCount: number })`.

- [ ] **Step 1: Nav.** `layout.tsx` counts `PENDING` contributions and passes it; `AdminNav` adds the tab `{ href: "/admin/contributions", label: \`Contributions (${pendingCount})\` }` after « Lieux ».
- [ ] **Step 2: Page.** `PENDING` contributions, oldest first, with user (name, commune, email), place (name, slug) and type. For TIP: a form with a textarea `text` (prefilled) and a theme select (`TIP_THEMES`, prefilled), « Publier » → `publishTip`; a second form with an optional `note` textarea, « Refuser » → `rejectContribution`. Other types: render read-only with « Bientôt » (plan 2). Empty: « Aucune contribution à relire. »
- [ ] **Step 3: `publishTip`.** Guard: contribution exists, `type === "TIP"`, `status === "PENDING"` (else return silently — double click). Validate `text` 10–500 and theme. One transaction: create `Source` `{ type: "contribution", urlOrRef: contribution.id, dateCollected: contribution.createdAt, reliability: 2 }`; create `Claim` with the Global Constraints defaults, `claimText`, `claimType`, `placeId`, `sourceId`, `verifiedOn: new Date()`, `authorId: contribution.userId`; update the contribution `status: APPROVED`, `reviewedAt: now`, `reviewNote` (from an optional `note` field). Then `updateTag("corpus")`; send `tipPublishedEmail` (place URL `${SITE_URL}/lieux/${slug}`) to the user's email, logging failures without rollback; `revalidatePath("/admin/contributions")`.
- [ ] **Step 4: `rejectContribution`.** Guard `status === "PENDING"`. Set `REJECTED`, `reviewNote` (trimmed or null), `reviewedAt`; delete its `ContributionPhoto` objects (none for tips yet, but implement generally); send `contributionRejectedEmail`; `revalidatePath("/admin/contributions")`.
- [ ] **Step 5: Verify** — `pnpm lint && pnpm test && pnpm build`, expected pass.
- [ ] **Step 6: Commit** — `git commit -m "feat(admin): contributions queue for tips"`

---

### Task 9: End-to-end verification and manual test steps

**Files:**
- Create: `docs/superpowers/plans/2026-10-17-contributions-1-manual-tests.md`

- [ ] **Step 1: Full check** — `pnpm lint && pnpm test && pnpm build`; expected: all pass, `/lieux/[slug]` still prerendered.
- [ ] **Step 2: Write the manual test steps** for the user (no browser automation — project rule), each with expected result:
  1. Signed out: add a tip on a place → `/connexion/verifier` shows the masked email; console/inbox has « Confirmez votre email… »; click the link → place page with the banner and the « En relecture » box; admin receives « Nouvelle contribution à relire — Astuce · {lieu} ».
  2. Same, but open the link in a private window → contribution still attached, banner shown there.
  3. Click an already-used link → `/connexion/verifier?erreur=lien`, resend works, a second resend within 60 s is refused.
  4. `/connexion/confirmer?next=//example.com` while signed in → lands on `/?contribution=envoyee`.
  5. Signed in: add a tip → straight to the place page with banner; identity shows « Publié sous le nom … ».
  6. Account created from `/compte` (no name) → tip form asks for a name.
  7. Submit with honeypot filled (devtools) → redirect, no row created.
  8. 11th pending tip → cap message.
  9. Admin: edit text + theme, publish → tip visible on the place page with « {name} · {commune} · {mois année} », author gets « Votre astuce sur … est en ligne, merci ! »; reject with a note → email quotes the note.
  10. Existing tips show « Alexandre · La Ciotat »; place with no tips shows the empty state.
  11. `/compte`: rename → place page shows the new name; sign out; delete account → published tip shows « Un ancien contributeur », pending ones gone.
  12. `/mentions-legales` and `/confidentialite` render and are in `sitemap.xml`.
- [ ] **Step 3: Commit** — `git commit -m "docs: manual test steps for contributions plan 1"`

## Prerequisites for the user (before Task 2's manual check and before production)

- Approve applying the migration to the shared Neon database (Task 1 checkpoint).
- `.env.local`: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`, `EMAIL_FROM`; `RESEND_API_KEY` optional in dev (emails print to the console).
- Production: Resend account with `laciotatnature.fr` verified (SPF/DKIM records), all five variables set on Vercel.
