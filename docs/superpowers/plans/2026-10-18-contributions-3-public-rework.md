# Contributions 3 — Public Pages Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every public page reads as « un guide écrit par les gens d'ici, relu par Alexandre », invites contributions where relevant with honest counts, and WhatsApp is gone.

**Architecture:** New cached community queries (tag `corpus`) feed honest counts and contributor content to the header/footer, landing, `/lieux`, place pages and a new `/contribuer` page. Page copy follows the spec's voice rules. Pages keep their current visual systems (landing/About/chrome: Fraunces + Figtree hex palette; places: token palette — see `spec/06-design.md`).

**Tech Stack:** Next.js 16.2 (App Router, `cacheComponents`), React 19, Prisma 7, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-10-17-community-contributions-design.md` — §1 (header, footer), §4 (copy voice, honest counts), §5 (every page subsection), §7 (removed items), "Spec documents to update". Parts 1–2 are merged.

## Global Constraints

- **Read before coding:** `AGENTS.md`, then the relevant guide in `node_modules/next/dist/docs/`.
- **No new automated tests** (project rule). Existing tests stay green; update tests only where behaviour intentionally changes (e.g. `src/seo/llms-txt.test.ts`, `src/corpus/queries.test.ts`). Each task verifies with `pnpm lint`, `pnpm test`, `pnpm build`; `/`, `/lieux`, `/lieux/[slug]` must stay ◐ (partial prerender) in the build output.
- **Copy is in the spec, verbatim.** Each task names the spec subsection whose quoted French copy it implements; use it exactly. Voice (spec §4): « le guide », « les gens d'ici », « on »; « je » only in Alexandre's About story, the review notice and emails; « relu(s) avant publication », never « vérifié(s) » for tips; no « IA », no WhatsApp anywhere.
- **Honest counts (spec §4):** « conseils » = PUBLISHED public claims of ACTIVE places; site-wide « contributeurs » = 1 (Alexandre) + distinct users with ≥ 1 APPROVED contribution, rendered only when ≥ 2; per place « contributeurs » = distinct authors of its PUBLISHED public claims (null author = Alexandre), rendered only when ≥ 2; « Derniers conseils partagés » only when ≥ 3 contributor tips exist; « Merci à » only when ≥ 3 contributors (users). Never padded. French plurals correct (« 1 conseil », « 2 conseils »).
- Contribution text plain text only. Session-dependent UI inside `<Suspense>`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Zero data** (place with no tips, site with no contributor yet): counts read « 0 conseil » / omit contributors; contributor-only sections are hidden, never empty boxes. Owned by Tasks 1, 4, 5, 6.
2. **Singular vs plural** in every count string (1 lieu / 1 conseil / 2 contributeurs). Owned by Task 1 (`countLabel` helper) and its consumers.
3. **A renamed contributor** whose only credit is an approved photo or a « Merci à » line: the new name shows after save (corpus invalidation). Owned by Task 1.
4. **Mobile**: the new sticky bar, header pill and `/contribuer` layout work at 375 px without horizontal scroll. Owned by Tasks 2, 3, 4.
5. **No WhatsApp left**: `git grep -i whatsapp -- app src .env.dist` returns nothing outside historical Prisma migrations. Owned by Task 7.

---

### Task 1: Community queries and count helpers

**Files:**
- Create: `src/corpus/community.ts`, `src/corpus/count-label.ts`
- Modify: `src/corpus/queries.ts`, `src/corpus/queries.test.ts`, `app/(public)/compte/actions.ts`

**Interfaces:**
- Produces:
  - `countLabel(n: number, singular: string, plural: string): string` → « 1 conseil », « 0 conseil », « 3 conseils » (French: 0 and 1 singular).
  - `getCommunityStats(): Promise<{ placeCount: number; tipCount: number; contributorCount: number }>` — `"use cache"`, `cacheTag("corpus")`, `cacheLife("corpus")`; definitions per Global Constraints (contributorCount includes Alexandre).
  - `getRecentContributorTips(limit: number): Promise<{ id: string; text: string; authorName: string; authorCommune: string | null; place: { slug: string; name: string } }[]>` — PUBLISHED public claims with a non-null author on ACTIVE places, newest first; cached `corpus`.
  - `getContributorTipCount(): Promise<number>` — same filter, count; cached `corpus`.
  - `getContributors(): Promise<{ name: string; commune: string | null }[]>` — users with ≥ 1 APPROVED contribution and a non-empty name, alphabetical; cached `corpus`.
  - `getActivePlaces()` additionally returns `_count: { claims }` restricted to PUBLISHED public claims (type `PlaceWithCover` gains `_count: { claims: number }`); update the include assertion in `queries.test.ts`.
  - `placeContributorCount(claims: { authorId: string | null }[]): number` in `community.ts` (distinct, null = Alexandre).

- [ ] **Step 1: Implement** the helpers and queries above.
- [ ] **Step 2: Invalidation.** `updateAccount` invalidates `corpus` when the user has any authored claim, any proposed place, or any APPROVED contribution (names appear in « Merci à », photo credits are fixed strings — fine); otherwise keeps `refresh()`.
- [ ] **Step 3: Verify** — `pnpm lint && pnpm test && pnpm build`.
- [ ] **Step 4: Commit** — `git commit -m "feat(community): honest counts and contributor queries"`

---

### Task 2: Header, mobile menu, footer

**Files:**
- Modify: `src/components/site/SiteHeader.tsx`, `src/components/site/MobileMenu.tsx`, `src/components/site/SiteFooter.tsx`, `src/components/landing/shared.ts`

**Interfaces:**
- Consumes: `getCommunityStats`, `countLabel`.
- Produces: `CONTRIBUTE_HREF = "/contribuer"`, `PROPOSE_PLACE_FORM_HREF = "/contribuer/nouveau-lieu"`, `SHARE_TIP_PICKER_HREF = "/contribuer#astuce"` in `shared.ts`; `STORY_HREF = "/a-propos"`.

- [ ] **Step 1: Header** per spec §1 "Header": order « Tous les lieux · Contribuer · À propos · Soutenir », « Contribuer » as a filled pill (primary `#0E4B5A`, white text) with active state on `/contribuer*`; keep the existing `AccountLink` hole. Mobile menu: same items, « Contribuer » first-class row.
- [ ] **Step 2: Footer** per spec §1 "Footer": lead « **Un guide écrit par les gens d'ici**, relu par Alexandre. » followed by the counts line from `getCommunityStats` (« {n} conseils · {k} contributeurs » with the honesty rules); links Contribuer · À propos · Confidentialité · Mentions légales · Soutenir sur Tipeee (`TIPEEE_HREF`); fire-risk line unchanged. Remove « Gratuit, sans pub, sans compte » and « L'histoire du projet » placeholder (STORY_HREF now points to `/a-propos` if still used).
- [ ] **Step 3: Verify** — lint, test, build (◐ preserved); dev smoke at 375 px width via curl is not possible — inspect classes for overflow (`flex-wrap`, `min-w-0`).
- [ ] **Step 4: Commit** — `git commit -m "feat(site): community header and footer"`

---

### Task 3: `/contribuer` page

**Files:**
- Create: `app/(landing)/contribuer/page.tsx`, `src/components/contribute/ContributePage.tsx` (sections), `src/components/contribute/PlacePicker.tsx`
- Modify: `src/components/contribute/Charter.tsx` (add an `open`/always-expanded variant), `app/(public)/contribuer/nouveau-lieu/actions.ts` (`next: "/contribuer"`), `app/sitemap.ts`

Note: `/contribuer/nouveau-lieu` lives in the `(public)` group; the new `/contribuer` page goes in `(landing)` (About-style visual system). Next allows sibling segments across groups as long as paths don't collide — verify the build.

**Interfaces:**
- Consumes: `getActivePlaces` (with `_count`), `getContributors`, `countLabel`, `Charter`, `ContributionBanner`.

- [ ] **Step 1: Page** per spec §5 "`/contribuer`" items 1–7, verbatim copy: H1 + lead; « Quatre façons d'aider » cards (Astuce → `#astuce`, Corriger (text only), Photos → `#astuce` picker's « Photos » links, Proposer un lieu → `/contribuer/nouveau-lieu`); place picker (`id="astuce"`, ACTIVE top-level places: name, commune, tip count, « À compléter » when 0, « Astuce » → `/lieux/{slug}/astuce` and « Photos » → `/lieux/{slug}/photos`, closing line « Le lieu n'est pas dans la liste ? Proposez-le »); « Comment c'est relu »; charter (`id="charte"`, expanded); « Merci à » (≥ 3 contributors); contributor FAQ (5 questions from the spec with short answers consistent with parts 1–2 behaviour: review delay, email never shown, pseudonym allowed, delete from `/compte`, a declined contribution gets an email with the reason when given). Metadata: title « Contribuer », description « Ajoutez une astuce, corrigez une info, partagez vos photos ou proposez un lieu. Tout est relu avant publication. », canonical `/contribuer`, indexed. Banner (`ContributionBanner` in Suspense) at the top.
- [ ] **Step 2:** new-place submissions now redirect to `/contribuer` (`next: "/contribuer"`). Add `/contribuer` to the sitemap.
- [ ] **Step 3: Verify** — lint, test, build (`/contribuer` ◐ or static), dev smoke 200.
- [ ] **Step 4: Commit** — `git commit -m "feat(contribuer): how-to-contribute page"`

---

### Task 4: Place page rework

**Files:**
- Create: `src/components/contribute/ContributeCard.tsx`, `src/components/contribute/ContributeBar.tsx`
- Modify: `app/(public)/lieux/[slug]/page.tsx`
- Delete: `src/components/WhatsAppCTA.tsx`

**Interfaces:**
- Consumes: `placeContributorCount`, `countLabel`.

- [ ] **Step 1: Header meta** per spec §5 "Place page" → header meta: add « {n} conseils » and, when ≥ 2, « {k} contributeurs » (counts over the place's own public claims), keeping « Lieu proposé par … », spot count and governing authority.
- [ ] **Step 2: Sidebar card** (`ContributeCard({ slug })`) replaces `WhatsAppCTA`: title « Vous connaissez ce lieu ? », text « Ajoutez une astuce, corrigez une info ou partagez vos photos. Tout est relu avant publication. », primary « Ajouter une astuce » (`/lieux/{slug}/astuce`), secondary « Ajouter des photos » (`/photos`) and « Signaler une erreur » (`/corriger`). The « Carte officielle ↗ » / « Google Maps ↗ » links stay below; remove the temporary standalone « Signaler une erreur » link from part 2.
- [ ] **Step 3: Mobile sticky bar** (`ContributeBar({ slug })`) replaces `WhatsAppBar`: « Vous connaissez ce lieu ? » + « Contribuer » → `/lieux/{slug}/astuce`; same sticky/safe-area behaviour as the old bar.
- [ ] **Step 4:** delete `src/components/WhatsAppCTA.tsx`.
- [ ] **Step 5: Verify** — lint, test, build (`/lieux/[slug]` ◐).
- [ ] **Step 6: Commit** — `git commit -m "feat(place): contribute card and bar replace WhatsApp"`

---

### Task 5: Places index

**Files:**
- Modify: `app/(public)/lieux/page.tsx`, `src/components/PlaceCard.tsx`

- [ ] **Step 1: Intro** per spec §5 "Places index": « {n} lieux · {m} conseils partagés par {k} contributeurs » (contributor part only when ≥ 2; otherwise « {n} lieux · {m} conseils »), the existing coverage line, « Un lieu manque ? Proposez-le → » (`/contribuer/nouveau-lieu`).
- [ ] **Step 2: `PlaceCard`**: tip count line (« {n} conseils ») and an « À compléter » pill when 0; remove the dead `hookClaim` null placeholder and its unused `CLAIM_TYPE_LABELS` if nothing else uses them.
- [ ] **Step 3: Grid end card**: a dashed-border « Proposer un lieu » card → `/contribuer/nouveau-lieu`, same size as place cards.
- [ ] **Step 4: Verify** — lint, test, build (`/lieux` ◐).
- [ ] **Step 5: Commit** — `git commit -m "feat(lieux): honest counts and propose-a-place card"`

---

### Task 6: Landing

**Files:**
- Modify: `src/components/landing/SearchHero.tsx`, `src/search/search-service.ts`, `src/components/landing/GuideSection.tsx`, `src/components/landing/HelpSection.tsx`, `app/(landing)/page.tsx`
- Create: `src/components/landing/RecentTipsSection.tsx`, `src/components/landing/HowItWorksSection.tsx`

- [ ] **Step 1: Hero** per spec §5 "Landing" item 1: eyebrow « Écrit par les gens d'ici », the new sub, and the quiet « Vous connaissez un coin ? Contribuez → » line under the search (→ `/contribuer`).
- [ ] **Step 2: Search states** per item 2: `EMPTY_INTRO` becomes « Le guide n'a pas encore de conseil fiable pour cette demande. »; the empty block shows « Vous connaissez un lieu qui irait ? Proposez-le → » (→ `/contribuer/nouveau-lieu`) and drops the non-functional email form; the error state keeps its link to `/lieux`; under results, « Précisez votre demande » focuses the search input (button, not `#`), and « dites-moi ce qui manque » becomes « Un lieu manque ? Proposez-le » (→ `/contribuer/nouveau-lieu`). Replace « Conseils d'Alexandre et des gens d'ici » with « Conseils des gens d'ici, relus avant publication ».
- [ ] **Step 3: GuideSection** per item 3: tip count on each card (`place._count.claims`), new subtitle.
- [ ] **Step 4: New sections** per items 4–5: `RecentTipsSection` (4 latest contributor tips, hidden unless `getContributorTipCount() >= 3`) and `HowItWorksSection` (three steps + « Contribuer » CTA). Order on the page: hero, guide, recent tips, how it works, help.
- [ ] **Step 5: HelpSection** per item 6: new text, CTAs « Proposer un lieu » → `/contribuer/nouveau-lieu`, « Partager une astuce » → `/contribuer#astuce`.
- [ ] **Step 6: Metadata** per item 7 (landing description). 
- [ ] **Step 7: Verify** — lint, test, build (`/` ◐).
- [ ] **Step 8: Commit** — `git commit -m "feat(landing): community copy, recent tips and how it works"`

---

### Task 7: About page, WhatsApp removal, SEO copy

**Files:**
- Modify: `src/components/landing/AboutContent.tsx`, `app/(landing)/a-propos/page.tsx`, `src/components/landing/shared.ts`, `.env.dist`, `src/seo/llms-txt.ts`, `src/seo/llms-txt.test.ts`, `app/layout.tsx`, `app/(public)/lieux/[slug]/opengraph-image.tsx`

- [ ] **Step 1: About** per spec §5 "About": lead, « Qui fait ce guide ? » story ending, the three cards (WhatsApp card replaced by « Une recherche par envie »), the six commitments, Soutenir block's « Autres façons d'aider » → `/contribuer`, FAQ changes (drop response-time question; free-guide answer without WhatsApp; contribution answer short + link to `/contribuer`), final band « Vous connaissez un coin ? » with « Contribuer » + « Voir le guide ». About metadata description: « Qui fait le Guide Nature de La Ciotat, comment il est relu, et comment y contribuer. »
- [ ] **Step 2: Remove WhatsApp**: delete `ASK_HREF`, `PROPOSE_PLACE_HREF`, `SHARE_TIP_HREF`, `whatsAppHref` and `NEXT_PUBLIC_WHATSAPP_NUMBER` reads from `shared.ts`; remove the variable from `.env.dist`.
- [ ] **Step 3: SEO copy**: `llms.txt` mission → community framing with « relus avant publication », contact section → « Pour proposer un lieu ou une astuce : /contribuer »; update `llms-txt.test.ts` expectations. Root layout default description → « Le guide nature de La Ciotat écrit par les gens d'ici : calanques, criques et sentiers, avec des conseils relus avant publication. ». OG image « Accès, conseils vérifiés » → « Accès, conseils des gens d'ici ».
- [ ] **Step 4: Verify** — `git grep -in whatsapp -- app src .env.dist` returns nothing; lint, test, build.
- [ ] **Step 5: Commit** — `git commit -m "feat(about): community About page; remove WhatsApp"`

---

### Task 8: Spec documents and manual tests

**Files:**
- Modify: `spec/00-scope.md`, `spec/01-data-model.md`, `spec/02-corpus-ops.md`, `spec/03-public-site.md`, `spec/04-landing-search.md`, `spec/05-admin.md`, `spec/07-seo.md`, `spec/08-infra.md`, `README.md`
- Create: `docs/superpowers/plans/2026-10-18-contributions-3-manual-tests.md`

- [ ] **Step 1: Spec docs** per the spec's "Spec documents to update" list: describe the product as now built (accounts, contributions, attribution, queue, new routes, CTAs, honest counts, Better Auth + Resend + env vars; remove WhatsApp and the « Legacy » Request section; contributions no longer "planned"; root description and `llms.txt` caveat resolved in `07-seo.md`; also note the in-action `assertAdmin()` checks in `05-admin.md` and the `/api/geo` caveat only if still true — check `proxy.ts`). Keep each file's structure; be factual and verify against the code.
- [ ] **Step 2: README**: mention contributor accounts and the new env vars briefly.
- [ ] **Step 3: Manual tests** (French, same format as parts 1–2): header pill + mobile menu; footer counts; `/contribuer` sections and picker links; place card/sidebar/mobile bar; `/lieux` intro, card counts and « À compléter », propose card; landing hero line, empty search state, recent tips hidden/visible rule, how-it-works; About; no WhatsApp anywhere; new-place submission lands on `/contribuer` with the banner.
- [ ] **Step 4: Verify** — lint, test, build.
- [ ] **Step 5: Commit** — `git commit -m "docs: spec and manual tests for the community rework"`
