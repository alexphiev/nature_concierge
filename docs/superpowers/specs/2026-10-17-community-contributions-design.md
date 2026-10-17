# Community Contributions — "un guide écrit par les gens d'ici"

## Purpose

Today the Guide Nature de La Ciotat reads as one person's notebook: the
footer, About page and FAQ say « un guide tenu par Alexandre… sans compte à
créer », tips have no author or date, and every « proposer / partager »
CTA opens WhatsApp. Some place pages (e.g. Calanque de Figuerolles) have zero
tips and nothing invites anyone to add one.

The guide becomes visibly **built by locals and curated by Alexandre**:

1. Anyone can read everything, anonymously, as today.
2. Anyone who wants to contribute creates an account (email magic link only)
   and can add a tip, correct or flag a tip / place info, add photos, or
   propose a new place.
3. Every contribution is reviewed by Alexandre before publication, and the UI
   says so wherever a contribution is made, so nobody is surprised that their
   input doesn't appear immediately.
4. Published contributions are credited by display name + commune.
5. WhatsApp is removed from the site entirely.

Scope: all public pages, contributor accounts, the contribution data model and
flows, decision emails, and a **minimal** admin queue to approve/reject. No
other admin page changes.

`spec/00-scope.md` already reflects this direction (accounts only for
contributors); the `spec/` files describe the site as built and are updated
when this ships (see "Spec documents to update").

## Decisions

| Topic | Decision |
|---|---|
| Contribution types | Tip, correction (of a tip or of the place itself), photos, new place |
| Sign-in | Email magic link only (no password, no OAuth) |
| Auth library | Better Auth, magic-link plugin, Prisma adapter; tables in our Neon DB |
| Email provider | Resend |
| When to sign in | Write first, sign in at submit |
| Public credit | Display name (pseudonym allowed) + optional commune |
| Contributor feedback | Decision email + inline "en relecture" box on the place page (author only). No "mes contributions" page |
| Review promise | « Relu avant publication » — no "vérifié sur place" marks |
| WhatsApp | Removed everywhere |
| Moderation | Minimal `/admin/contributions` queue, Alexandre is the only reviewer |
| Tests | No new automated tests (project rule); existing tests stay green; manual test steps |

## 1. Routes

### Reworked public pages

`/`, `/lieux`, `/lieux/[slug]`, `/a-propos`, plus `SiteHeader`, `SiteFooter`,
`MobileMenu`, `llms.txt`, page metadata.

### New public pages

| Route | Purpose | Indexed |
|---|---|---|
| `/contribuer` | How to contribute, review promise, charter, contributor FAQ, place picker | yes |
| `/contribuer/nouveau-lieu` | Propose a new place | no |
| `/lieux/[slug]/astuce` | Add a tip to this place | no |
| `/lieux/[slug]/corriger` | Report an error about the place itself (description, name, access…) | no |
| `/lieux/[slug]/corriger/[claimId]` | Correct / flag one tip | no |
| `/lieux/[slug]/photos` | Add photos to this place | no |
| `/connexion/verifier` | "Check your inbox" + resend, after a signed-out submit or an expired link | no |
| `/compte` | Signed in: display name, commune, sign out, delete account. Signed out: email field to receive a sign-in link | no |
| `/confidentialite` | Privacy notice (what's collected, why, retention, deletion) | yes |
| `/mentions-legales` | Legal notice | yes |
| `/connexion/confirmer` | Route handler (no UI): magic-link landing, attaches drafts, redirects (§3) | — |
| `/api/auth/[...all]` | Better Auth handler | — |

Form pages are dedicated routes (not modals): server component page + one
client form component each. They work without client-side navigation, behave
well on mobile, and keep the back button meaningful. The four place-scoped
forms 404 for non-ACTIVE places; `[claimId]` 404s unless the claim is a
PUBLISHED public claim of that place (or of its parent).

### Header

`Tous les lieux · Contribuer · À propos · Soutenir`. « Contribuer » is visually
highlighted (filled pill). When signed in, a small initial avatar links to
`/compte`; this is a Suspense hole reading the session so the header shell
stays static. Same items in `MobileMenu`.

### Footer

- Lead: « **Un guide écrit par les gens d'ici**, relu par Alexandre. »
  followed by live counts « {n} conseils · {k} contributeurs » (see Honest
  counts).
- Links: Contribuer · À propos · Confidentialité · Mentions légales ·
  Soutenir sur Tipeee.
- Fire-risk line unchanged.

## 2. Data model

### Auth (Better Auth)

Better Auth's Prisma schema adds `User`, `Session`, `Account`, `Verification`
(magic-link tokens live in `Verification`; `Account` is required by Better Auth
even with a single provider). Extra user field via `additionalFields`:

- `User.name` — public display name, required at first submit.
- `User.commune String?` — optional, free text, shown next to the name.

`/admin` keeps its Basic Auth; contributor accounts never grant admin access.

### Contribution

One table for all four types, typed nullable columns (no JSON payload) so the
queue can query and render them directly.

```prisma
model Contribution {
  id     String             @id @default(cuid())
  type   ContributionType
  status ContributionStatus @default(UNCONFIRMED)

  userId String?            // null while UNCONFIRMED
  user   User?              @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Signed-out submit: held until the magic link is clicked.
  pendingEmail   String?
  pendingName    String?
  pendingCommune String?

  placeId String?           // TIP, CORRECTION, PHOTOS
  place   Place?            @relation(fields: [placeId], references: [id])
  claimId String?           // CORRECTION of a tip; null = correction of the place itself
  claim   Claim?            @relation(fields: [claimId], references: [id])

  text           String?          // tip / what changed / why this place
  claimType      ClaimType?       // TIP: theme picked by the contributor
  correctionKind CorrectionKind?  // CORRECTION
  placeName      String?          // PLACE
  placeCommune   String?          // PLACE
  locationHint   String?          // PLACE: free text or a Google Maps link
  photos          ContributionPhoto[] // PHOTOS
  photosConsentAt DateTime?           // PHOTOS: consent checkbox timestamp

  reviewNote String?        // optional, quoted in the decision email
  reviewedAt DateTime?
  createdAt  DateTime @default(now())

  @@index([status, createdAt])
  @@index([userId, placeId, status])
  @@index([pendingEmail, status])
}

model ContributionPhoto {
  id             String       @id @default(cuid())
  contributionId String
  contribution   Contribution @relation(fields: [contributionId], references: [id], onDelete: Cascade)
  key            String       // object key in the place-photos bucket
  order          Int          @default(0)
}

enum ContributionType   { TIP CORRECTION PLACE PHOTOS }
enum ContributionStatus { UNCONFIRMED PENDING APPROVED REJECTED }
enum CorrectionKind     { OUTDATED WRONG MISSING_DETAIL }
```

Field limits (zod, server-side): tip text 10–500 chars; correction text
10–1000; place name 2–120; commune 2–80; location hint ≤ 500; why-this-place
10–1000; display name 2–40; photos 1–6 per contribution.

### Attribution on published content

```prisma
model Claim {
  // ...existing fields...
  authorId      String?   // → User; null = Alexandre's own tip
  author        User?     @relation(fields: [authorId], references: [id], onDelete: SetNull)
  authorDeleted Boolean   @default(false)
}

model Place {
  // ...existing fields...
  proposedById String?    // → User
  proposedBy   User?      @relation(fields: [proposedById], references: [id], onDelete: SetNull)
}
```

- `authorId = null && !authorDeleted` → credited « Alexandre · La Ciotat »
  from a constant (`src/site.ts`). No backfill of existing claims, no change
  to the corpus seed pipeline.
- `authorDeleted = true` → « Un ancien contributeur ».
- Name/commune edits on `/compte` propagate to tips automatically (live join).
- Photo credit stays the existing `PlacePhoto.credit` string, set to the
  display name at approval time (does not follow later renames).

### What approval produces

| Type | On approve |
|---|---|
| TIP | Creates a `Source` (`type: "contribution"`, `urlOrRef: contribution.id`, `dateCollected: contribution.createdAt`) and a `Claim`: `status PUBLISHED`, `isPublic true`, `verification LOCAL_TESTIMONY`, `verdict GO`, default `decayClass`, `verifiedOn = now`, `authorId = contribution.userId`, text/theme as edited in the queue |
| CORRECTION | Nothing automatic. The reviewer picks: edit the tip text (updates the Claim), retire the tip (`status RETIRED`), or accept without change. Place-level corrections are applied by hand in `/admin/places` |
| PLACE | Creates a `DRAFT` `Place` (name, commune, unique slug derived from the name, `description = text`, `proposedById`, placeholder `lat/lng/type/departement` that the reviewer must fix) and links to `/admin/places/[id]` to complete and activate |
| PHOTOS | Creates one `PlacePhoto` per selected photo (`key` reused as-is, `credit = user.name`, appended after existing order). Unselected photos' objects are deleted |

On reject: status `REJECTED`, note stored, PHOTOS objects deleted.

### Account deletion (`/compte`)

In one transaction: set `authorDeleted = true` on the user's claims (the FK
`SetNull` then clears `authorId`), delete the user (cascades sessions,
accounts, all their contributions and `ContributionPhoto` rows), then delete
the storage objects of their non-approved photo contributions. Approved photos
stay (their `PlacePhoto` rows and objects are untouched). `Place.proposedById` is cleared
(credit line simply disappears).

## 3. Contribution flows

### Shared form shell

Every form shows, above the fields:

- what it's about (place name and type, or « Nouveau lieu »);
- the **review notice**, always visible: « Relu par Alexandre avant
  publication, en général sous quelques jours. Vous recevrez un email quand
  c'est en ligne. »;
- a link to the charter (`/contribuer#charte`).

Plus a hidden honeypot field (non-empty → silently accept and drop).

### Form fields

- **Astuce** (`/lieux/[slug]/astuce`): theme chips (single choice) mapping to
  `ClaimType` — Accès (ACCESS), Infos pratiques (PRACTICAL), Affluence
  (CROWDING), Pour qui (SUITABILITY), Activités (ACTIVITY), Faune & flore
  (NATURE), Sécurité (SAFETY), À éviter (AVOID), Astuce (TIP, default); text
  with hint « Une info concrète : l'heure à viser, où se garer, ce qu'on
  aurait aimé savoir. »
- **Corriger un conseil** (`/corriger/[claimId]`): the original tip quoted;
  kind radio « N'est plus vrai » (OUTDATED) / « Inexact » (WRONG) / « Il manque
  une précision » (MISSING_DETAIL); required text « Qu'est-ce qui a changé ? ».
- **Signaler une erreur sur le lieu** (`/corriger`): same kinds, required text;
  no quoted tip.
- **Photos** (`/photos`): 1–6 files, JPEG/PNG/WebP/HEIC. Reuses the admin
  pipeline: HEIC → JPEG in the browser and compression of large photos
  (`app/admin/places/compress-photo.ts` moves to `src/storage/` and both
  admin and public forms import it). Required consent checkbox « J'ai pris
  ces photos et j'accepte qu'elles soient publiées sur le guide avec mon
  nom. » Upload goes to the existing `place-photos` bucket under
  `contributions/{contributionId}/{uuid}.{ext}` via the existing storage
  module; server-side type/size validation identical to admin uploads.
- **Nouveau lieu** (`/contribuer/nouveau-lieu`): name; commune (free text);
  « Comment le trouver ? » (free text or a Google Maps link); « Pourquoi il
  mérite sa place dans le guide ? ».

### Signed-out fields

When there is no session, the form also shows « Votre nom affiché »
(pseudonym OK), « Votre commune (facultatif) », « Votre email (jamais
affiché) », and a required checkbox accepting the charter and privacy notice.
When signed in, these are replaced by « Publié sous le nom **Marie ·
Ceyreste** · modifier » (→ `/compte`).

### Submit — signed in

Server action validates, re-checks the session, enforces the cap (≤ 10
`PENDING` per user, else a clear error), stores the contribution as
`PENDING`, emails `ADMIN_EMAIL`, then redirects:

- place-scoped → `/lieux/[slug]?contribution=envoyee` (confirmation banner
  « Merci ! Votre contribution est en relecture. Vous recevrez un email dès
  qu'elle est en ligne. » + the pending box);
- new place → `/contribuer?contribution=envoyee` (same banner).

### Submit — signed out (write first, sign in at submit)

1. Store the contribution as `UNCONFIRMED` with `pendingEmail` (normalized
   lowercase), `pendingName`, `pendingCommune` (photos are uploaded and keyed
   at this point too).
2. Trigger Better Auth magic-link sign-in for that email, with
   `callbackURL = /connexion/confirmer?next={redirect target}`.
3. Redirect to `/connexion/verifier?email={masked}`: « Dernière étape :
   cliquez sur le lien envoyé à m•••@gmail.com. Votre contribution partira
   en relecture aussitôt. » + « Renvoyer le lien » + « Mauvaise adresse ?
   Recommencer ».
4. Clicking the link signs the user in (Better Auth creates the user on
   first verification). `/connexion/confirmer` (route handler, no UI):
   - if the user has no `name` yet, set `name`/`commune` from the most recent
     matching contribution's `pendingName`/`pendingCommune`;
   - attach every `UNCONFIRMED` contribution whose `pendingEmail` equals the
     verified email: set `userId`, clear `pending*`, status → `PENDING`;
   - email `ADMIN_EMAIL` once per attached contribution;
   - redirect to `next` (validated as a same-site path) with
     `?contribution=envoyee`.

Holding the draft server-side means it survives the link opening in another
browser (the usual case with mobile mail apps). Matching on a verified email
is the security boundary: an attacker typing someone else's email cannot
attach anything without access to that inbox.

`UNCONFIRMED` contributions are invisible to the queue. Rows older than 7 days
are purged (with their photo objects) opportunistically at the start of each
signed-out submit — no cron.

### Inline pending box (place page)

A per-user Suspense hole in the « Conseils des gens d'ici » section. If the
session user has `PENDING` contributions for this place (or its spots), render
« En relecture · visible par vous seul » listing each item: type, text (or
photo thumbnails), « Envoyé le {date} ». Nobody else sees anything; the
cached page shell is unaffected.

### Emails (Resend, French, plain and sober)

| Trigger | To | Subject |
|---|---|---|
| Signed-out submit / resend | contributor | « Confirmez votre email pour envoyer votre contribution » |
| Sign-in from `/compte` | contributor | « Votre lien de connexion au Guide Nature de La Ciotat » |
| Contribution becomes `PENDING` | `ADMIN_EMAIL` | « Nouvelle contribution à relire — {type} · {lieu} » |
| TIP / PHOTOS approved | contributor | « Votre {astuce/photo} sur {lieu} est en ligne, merci ! » + link + optional note |
| CORRECTION approved | contributor | « Merci, la fiche {lieu} a été mise à jour » (or « …on en a tenu compte ») + note |
| PLACE approved | contributor | « Bonne idée : {lieu} va rejoindre le guide » + note |
| Rejected | contributor | « Votre contribution n'a pas été retenue » + note (or a default kind sentence) |

Magic links expire after 15 minutes (Better Auth default is fine). Better
Auth's built-in rate limiting covers magic-link sends.

## 4. Copy voice

- The site speaks as « le guide », « les gens d'ici », « on ». « Je »
  (Alexandre) stays only where Alexandre speaks as the reviewer: the About
  story, the review notice, emails.
- Review is « relu », not « vérifié »: every « conseils vérifiés » becomes
  « conseils relus avant publication » (landing metadata, `llms.txt`, About).
  Official-source and freshness wording for fire access stays as is.
- « sans compte à créer » → « Un compte seulement pour contribuer ».
- No WhatsApp mention anywhere.
- Existing copy rules from `spec/04-landing-search.md` still apply: sentence case, plain verbs,
  no « IA », no « plateforme ».

### Honest counts

All counts come from the DB and are never padded.

- « conseils » = PUBLISHED public claims on ACTIVE places.
- « contributeurs » (site-wide) = Alexandre + distinct users with ≥ 1
  APPROVED contribution. Per place = distinct authors of its PUBLISHED
  public claims (null author counts as Alexandre). The contributor count is only rendered once it is ≥ 2;
  before that, show the tip count alone.
- Sections that depend on contributor content (landing « Derniers conseils
  partagés », `/contribuer` « Merci à ») render only once there are ≥ 3
  contributor tips / contributors respectively.

## 5. Page-by-page

### Place page `/lieux/[slug]`

- **Header meta**: add « {n} conseils · {k} contributeurs » (counts for this
  place, same honesty rules) and, when `proposedBy` is set, « Lieu proposé par
  {name} ».
- **Gallery**: « Ajouter vos photos » link under it. Empty panel copy: « Pas
  encore de photo de ce lieu. Vous en avez ? » with the same link.
- **« Conseils des gens d'ici »** (renamed from « Conseils du guide »;
  parent block keeps « Valable pour tout {parent} »):
  - each tip gets an attribution line under its text: « {name} · {commune} ·
    {month year of verifiedOn} » (commune omitted when null);
  - each tip gets a discreet « Corriger » link → `/corriger/[claimId]`;
  - after the list, « Ajouter une astuce » button;
  - **empty state** (no public claims): « Aucun conseil pour l'instant. Vous
    connaissez ce lieu ? Partagez la première astuce. » with a prominent
    button. The section always renders now (today it disappears when empty).
- **Pending box** + confirmation banner (§3).
- **Sidebar card** (replaces `WhatsAppCTA`): title « Vous connaissez ce
  lieu ? », text « Ajoutez une astuce, corrigez une info ou partagez vos
  photos. Tout est relu avant publication. », primary « Ajouter une
  astuce », secondary « Ajouter des photos » and « Signaler une erreur »
  (→ `/corriger`). Official map + Google Maps links stay below.
- **Mobile sticky bar** (replaces `WhatsAppBar`): « Vous connaissez ce
  lieu ? » + « Contribuer » → `/astuce`.
- Unchanged: breadcrumb, Google Maps itinerary, À propos, spots, nearby,
  practical images, `AlternativeCallout`, JSON-LD, metadata.

### Places index `/lieux`

- Intro: « {n} lieux · {m} conseils partagés par {k} contributeurs » (honest
  counts), the existing coverage line, and « Un lieu manque ? Proposez-le → ».
- `PlaceCard`: tip count; « À compléter » pill when the place has zero public
  tips.
- Grid ends with a dashed « Proposer un lieu » card → `/contribuer/nouveau-lieu`.

### Landing `/`

1. **Hero**: keep `SearchHero`. Eyebrow « Écrit par les gens d'ici ». Sub:
   « Décrivez votre sortie, le guide vous répond avec les conseils de ceux
   qui y vont. » Quiet line under the search: « Vous connaissez un coin ?
   Contribuez → » (`/contribuer`).
2. **Search empty/error state**: « Le guide n'a pas encore de conseil fiable
   pour cette demande. Vous connaissez un lieu qui irait ? Proposez-le → ».
   (Replaces the « Je n'ai pas encore… » intro in `search-service.ts`.) The
   non-functional « Me prévenir » email form in the empty state is removed.
   Under results, « Précisez votre demande » focuses the search input and
   « dites-moi ce qui manque » becomes « Un lieu manque ? Proposez-le » →
   `/contribuer/nouveau-lieu` (both are `#` today).
3. **« Tous les lieux du guide »**: cards show tip count; sub « Chaque fiche
   rassemble les conseils des gens d'ici : accès, parking, horaires, vent,
   avec qui y aller. »
4. **New « Derniers conseils partagés »**: 4 most recent contributor tips
   (text, « {name} · {commune} », place link). Hidden until ≥ 3 contributor
   tips exist.
5. **New « Comment ça marche »**: ① Vous partagez — une astuce, une
   correction, un lieu, des photos. ② Alexandre relit, sous quelques jours.
   ③ C'est en ligne, avec votre nom. CTA « Contribuer ».
6. **`HelpSection`**: keeps « Un coin ou une astuce qui manque ? »; text
   « Chaque conseil du guide vient de quelqu'un d'ici. Partagez le vôtre :
   il sera relu avant publication. »; CTAs « Proposer un lieu » →
   `/contribuer/nouveau-lieu`, « Partager une astuce » → `/contribuer#astuce`.
7. Metadata description: « Décrivez votre sortie, le guide vous dit où
   aller. Avec les conseils des gens d'ici, relus avant publication. »

### About `/a-propos`

- Lead: « Un guide gratuit des calanques, criques et sentiers de La Ciotat
  et de ses environs, écrit par les gens d'ici, relu par Alexandre. »
- « Qui tient ce guide ? » → « Qui fait ce guide ? »: keep the notebook
  origin story, end with « Aujourd'hui, tout le monde peut y contribuer. Je
  relis chaque contribution avant de la publier. »
- « Ce que propose le guide » cards: Des fiches lieux utiles · Une recherche
  par envie (« Décrivez votre sortie, le guide vous propose les lieux et les
  conseils qui collent. ») · Un guide écrit à plusieurs (→ `/contribuer`).
- Commitments: « Gratuit, sans publicité. Un compte seulement pour
  contribuer. » · « Aucun lieu ne paie pour apparaître. » · « Chaque
  contribution est relue avant publication. » · « Chaque conseil affiche son
  auteur et sa date. » · « Quand on ne sait pas, on le dit. » · « Pour les
  fermetures de massifs, on renvoie toujours vers la source officielle. »
- Soutenir block unchanged except « Autres façons d'aider » links →
  `/contribuer`.
- FAQ: drop « En combien de temps répondez-vous ? »; « Le guide est-il
  gratuit ? » loses its WhatsApp mention; « Comment proposer un lieu ou
  corriger une info ? » → short answer + link to `/contribuer`. Keep coverage,
  fire access, « Êtes-vous guide professionnel ? ».
- Final band: « Vous connaissez un coin ? » / « Le guide s'écrit avec les
  gens d'ici. » → « Contribuer » + « Voir le guide ».

### `/contribuer`

1. H1 « Le guide s'écrit à plusieurs »; lead: « Chaque conseil vient de
   quelqu'un qui connaît le lieu. Ajoutez le vôtre : Alexandre relit tout
   avant publication. »
2. **Quatre façons d'aider** (cards): Partager une astuce (`#astuce` place
   picker) · Corriger une info (« Sur chaque fiche, cliquez Corriger sous le
   conseil concerné. ») · Ajouter des photos (place picker) · Proposer un
   lieu (button).
3. **Place picker** (`id="astuce"`): list of ACTIVE places (name, commune,
   tip count, « À compléter » pill) each linking to `/lieux/[slug]/astuce`,
   with a « Photos » secondary link; ends with « Le lieu n'est pas dans la
   liste ? Proposez-le ». Plain list, no client search.
4. **Comment c'est relu**: the three steps, « en général sous quelques
   jours », the email notice, and what's public (nom affiché, commune) vs
   private (email, never shown).
5. **Charte** (`id="charte"`): accepted — first-hand, concrete, kind, useful
   to someone going there; declined — promotion or advertising, personal data
   about others, encouraging off-trail access or bivouac in the Parc
   national, entering private property, photos you didn't take, anything
   contradicting official fire-access rules.
6. **Merci à** — contributor names (« Marie · Ceyreste »), rendered only when
   ≥ 3 contributors.
7. **FAQ contributeurs**: Pourquoi ma contribution n'apparaît pas tout de
   suite ? · Mon email est-il affiché ? · Puis-je utiliser un pseudo ? ·
   Comment supprimer mon compte ? · Que devient ma contribution si elle n'est
   pas retenue ?

### `/compte`

Signed in: edit display name and commune (same limits as the form), « Se
déconnecter », « Supprimer mon compte » (confirmation step; explains that
published tips stay, credited « Un ancien contributeur »). Signed out: email
field → magic link → back to `/compte`.

### `/confidentialite`, `/mentions-legales`

Short static pages. Privacy: data collected (email, display name, commune,
contributions), purpose (sign-in, credit, decision emails), processors (Neon,
Resend, Vercel), retention (until account deletion; unconfirmed drafts 7
days), rights and how to exercise them (`/compte` or contact email). Legal
notice: publisher, host, contact.

### `llms.txt`

Mission text updated to the community framing and « relus avant
publication »; Contact section → « Pour proposer un lieu ou une astuce :
/contribuer ».

## 6. Minimal admin queue — `/admin/contributions`

Behind existing Basic Auth. `AdminNav` gets « Contributions ({n}) » with the
`PENDING` count.

- One page listing `PENDING` contributions, oldest first. Each item shows
  type, place (or proposed name + commune + location hint), contributor (name,
  commune, email), date, text, photo thumbnails; corrections quote the
  current tip text.
- Actions per type:

| Type | Approve | Reject |
|---|---|---|
| TIP | Editable text + theme, « Publier » | « Refuser » + optional note |
| CORRECTION (tip) | « Modifier le conseil » (inline text edit, saves the Claim) · « Retirer le conseil » · « Noter sans changement » | « Refuser » + note |
| CORRECTION (place) | « Noter » (reviewer applies it in `/admin/places`) | « Refuser » + note |
| PLACE | « Créer le brouillon » → creates DRAFT Place, links to `/admin/places/[id]` | « Refuser » + note |
| PHOTOS | Checkbox per photo, « Publier la sélection » | « Refuser » (deletes all) |

- Every decision: sets `status`, `reviewNote`, `reviewedAt`; sends the
  decision email; `revalidateTag("corpus", "max")` when public content
  changed. Email failure does not roll back the decision (logged).
- No search, filters, pagination or history view in this pass.

## 7. Cross-cutting

- **Caching**: public pages stay cached (`cacheComponents`). Session reads
  live only in small Suspense holes (header avatar, pending box, form
  signed-in/out variant, confirmation banner). Form pages and `/compte` are
  dynamic and `noindex`.
- **Security**: every contribution/account server action re-reads the
  session server-side; zod validation on all input; contributions are
  rendered as plain text only (never HTML); redirect targets validated as
  same-site paths; photo type/size validated server-side; honeypot; ≤ 10
  `PENDING` per user; Better Auth rate limiting on magic-link sends.
- **Privacy**: email used only for sign-in and notifications, never shown;
  no new analytics or tracking; account deletion is real deletion (§2).
- **Errors**: email send failure on submit keeps the contribution and shows
  « Renvoyer le lien »; photo upload failure keeps the form state and shows
  which file failed; expired/used link → `/connexion/verifier` with resend;
  claim retired between page load and correction submit → friendly error.
- **New env vars** (added to `.env.dist`): `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`.
- **Removed**: `src/components/WhatsAppCTA.tsx` (`WhatsAppCTA`,
  `WhatsAppBar`), `ASK_HREF` / `PROPOSE_PLACE_HREF` / `SHARE_TIP_HREF` in
  `src/components/landing/shared.ts`, and `NEXT_PUBLIC_WHATSAPP_NUMBER`
  (code and `.env.dist`).
- **Dropped tables**: the unused concierge log — `Request`,
  `RequestClaimUsed`, `RequestClaimCreated` and the `Channel` / `Outcome`
  enums — in one migration, plus `REQUEST_TYPES` in
  `src/corpus/taxonomy.ts` if nothing else uses it.
- **Testing**: no new automated tests. Existing tests stay green (update any
  that assert WhatsApp or old copy, e.g. `llms-txt.test.ts`). The plan ends
  with written manual test steps for each flow: tip signed-in, tip signed-out
  (same browser and link opened elsewhere), correction of tip and of place,
  photos incl. HEIC, new place, approve/reject each type, decision emails,
  account edit and deletion, empty states and honest-count thresholds.

## Spec documents to update (last task of the implementation)

- `spec/00-scope.md`: « Current state » and « Next » sections.
- `spec/01-data-model.md`: auth tables, `Contribution`, attribution fields;
  remove the « Legacy » section.
- `spec/02-corpus-ops.md`: contributions as an entry path (no longer
  "planned").
- `spec/03-public-site.md`, `spec/04-landing-search.md`: pages as reworked
  (new routes, CTAs, attribution, no WhatsApp).
- `spec/05-admin.md`: `/admin/contributions`.
- `spec/07-seo.md`: new indexed pages, root description and `llms.txt` caveat
  resolved.
- `spec/08-infra.md`: Better Auth, Resend, new env vars, WhatsApp var
  removed.

## Out of scope

- « Mes contributions » page, contributor profiles, leaderboards, badges.
- Votes, likes, comments, replies.
- Google / social sign-in, passwords.
- Editing or withdrawing a contribution after submit.
- Auto-publishing or trusted-contributor bypass of review.
- Admin queue search, filters, history; any other admin page change beyond
  the `AdminNav` entry.
- Notification preferences, newsletters.
- Map pin picker for new places.
