# 03 — Public Site (places, place pages, contributions, About)

All copy in French. Visual language in `06-design.md`, SEO in `07-seo.md`.
Design record of the community rework:
`docs/superpowers/specs/2026-10-17-community-contributions-design.md`.

## Routes

| Route | Page |
|---|---|
| `/` | Landing + search (`04-landing-search.md`) |
| `/lieux` | Places index |
| `/lieux/[slug]` | Place page (the SEO unit) |
| `/lieux/[slug]/photo?i=N` | Redirect to the Nth Google Places photo (key never exposed) |
| `/a-propos` | About |
| `/contribuer` | How to contribute, place picker, charter, FAQ |
| `/contribuer/nouveau-lieu` | Propose a new place (noindex) |
| `/lieux/[slug]/astuce` | Add a tip (noindex) |
| `/lieux/[slug]/corriger` | Report an error about the place (noindex) |
| `/lieux/[slug]/corriger/[claimId]` | Correct one tip (noindex) |
| `/lieux/[slug]/photos` | Add photos (noindex) |
| `/connexion/verifier` | « Vérifiez votre boîte mail » + resend (noindex) |
| `/connexion/confirmer` | Route handler, no UI: magic-link landing, redirects |
| `/compte` | Sign-in by email link, or account settings (noindex) |
| `/confidentialite`, `/mentions-legales` | Static legal pages |
| `/api/auth/[...all]` | Better Auth handler |
| `/places/*` | 308 → `/lieux/*` |

Route groups: `app/(landing)` (landing, About, `/contribuer`, legal pages) and
`app/(public)` (places, forms, account) share `SiteHeader`, `SiteFooter` and
`ConstructionBanner` (hidden when `SHOW_CONSTRUCTION_BANNER=false`).

## Rendering

`cacheComponents` is on. Place pages are prerendered for every ACTIVE place
(`generateStaticParams`); all corpus reads are `"use cache"` with the
`corpus` tag (`02-corpus-ops.md`), including the community counts
(`src/corpus/community.ts`). Session reads live only in small Suspense holes:
the header account avatar, the confirmation banner (`?contribution=envoyee`)
and the author's pending box on place pages. The landing's search shortcuts
are also dynamic. Form pages, `/compte` and `/connexion/*` are dynamic and
noindex.

## Places index `/lieux`

H1 « Les lieux », an intro of honest counts (« {n} lieux · {m} conseils
partagés par {k} contributeurs »; the contributor part only once k ≥ 2, the
tip part only when m > 0), the coverage line, « Un lieu manque ?
Proposez-le → », then a grid of `PlaceCard`s for ACTIVE places by
`demandRank`, ending with a dashed « Proposer un lieu » card
(`/contribuer/nouveau-lieu`). Only leaf places are listed: a place with an ACTIVE
spot is hidden (it's reachable through its spots). JSON-LD `ItemList`.

`PlaceCard`: cover photo (or hatch panel + type label), type, name, commune,
tip count, or an « À compléter » pill when the place has no public tip.

## Place page `/lieux/[slug]`

Top to bottom:

1. Breadcrumb (Les lieux / parent / place).
2. Header: type · commune (département), H1 name, meta (« {n} conseils »,
   « {k} contributeurs » once k ≥ 2, spot count, « Géré par
   {governingAuthority} », « Lieu proposé par {name} » when `proposedBy` is
   set), « Itinéraire Google Maps » button.
3. **Gallery** (`PlaceGallery`): one main photo + a grid of squares, with a
   full-screen lightbox and photo credits, and an « Ajouter vos photos » link
   (`/lieux/[slug]/photos`).
4. Main column:
   - « À propos »: `description` with « Lire la suite ».
   - Confirmation banner and pending box (below).
   - « Conseils des gens d'ici » (`ClaimList`): public claims grouped by
     `claimType` in a fixed order, each group with an icon and count; SAFETY
     and AVOID get a risk accent, ALTERNATIVE a sea accent. Each tip shows an
     attribution line « {name} · {commune} · {month year of verifiedOn} »
     (Alexandre for unattributed tips, « Un ancien contributeur » for deleted
     accounts) and a « Corriger » link (`/corriger/[claimId]`). The section
     always renders: with no tip it reads « Aucun conseil pour l'instant. Vous
     connaissez ce lieu ? Partagez la première astuce. »; an « Ajouter une
     astuce » button follows the list.
   - « Valable pour tout {parent} »: the parent's public claims, on spots (tips
     there also link to « Corriger »).
   - Spots (`SpotCard`s), for a parent place.
   - « À proximité »: the 4 nearest ACTIVE places within 25 km
     (`src/corpus/nearby.ts`).
   - « Images pratiques » (`PracticalImages`).
5. Sidebar (sticky on desktop; on mobile it holds only the links below):
   `ContributeCard` on desktop (« Vous connaissez ce lieu ? », « Ajouter une
   astuce », « Ajouter des photos », « Signaler une erreur »), « Carte
   officielle ↗ » (when `officialInfoUrl`) and « Google Maps ↗ » links,
   `AlternativeCallout` (« Si c'est fermé ou saturé → {place} » for
   ALTERNATIVE claims).
6. Mobile: sticky `ContributeBar` (« Vous connaissez ce lieu ? » +
   « Contribuer » → `/astuce`).

**Pending box** (`PendingContributions`): a signed-in contributor sees
« En relecture · visible par vous seul » listing their PENDING contributions
for this place and its spots (type, text or photo thumbnails, « Envoyé le
{date} »). Nobody else sees it.

**Confirmation banner** (`ContributionBanner`, on `?contribution=envoyee`):
« Merci ! Votre contribution est en relecture. Vous recevrez un email dès
qu'elle est en ligne. » Also shown on `/lieux` and `/contribuer`.

## Photos

Composition (`src/corpus/place-photos.ts`):

- Uploaded `PlacePhoto`s first, by `order`, served from Neon Object Storage
  through `next/image`.
- Then Google Places photos (`/lieux/[slug]/photo?i=k`) only until the gallery
  reaches 5 (`MIN_GALLERY_PHOTOS`); Google is not called when 5+ photos are
  uploaded.
- Cards use the first uploaded photo, else the first Google photo, else the
  hatch placeholder (never a stock image).
- Google details (photos + Maps link) are fetched server-side in
  `src/corpus/google-places.ts`, cached for weeks (`cacheLife("weeks")`;
  failures are cached for minutes only). The photo route uses
  `skipHttpRedirect=true` and redirects to Google's keyless `photoUri`, so
  `GOOGLE_PLACES_API_KEY` never reaches the browser. Google attributions are
  displayed as credits.

## About `/a-propos`

`AboutContent`: lead « …écrit par les gens d'ici, relu par Alexandre », « Qui
fait ce guide ? » (portrait placeholder, origin story, « Aujourd'hui, tout le
monde peut y contribuer »), what the guide offers (place pages, search by
wish, a guide written by several people → `/contribuer`), commitments (free,
an account only to contribute, every contribution reviewed, every tip shows
its author and date), Tipeee support block, FAQ, final CTA band
« Contribuer » / « Voir le guide ».

## Contributing

**`/contribuer`**: H1 « Le guide s'écrit à plusieurs »; « Quatre façons
d'aider » (share a tip, correct a tip via « Corriger » on each place page, add
photos, propose a place); the place picker (`id="astuce"`, top-level
ACTIVE places, each with commune, tip count (omitted when 0), « À compléter » pill and « Astuce »
/ « Photos » links, then « Le lieu n'est pas dans la liste ? Proposez-le »);
« Comment c'est relu » (three steps; public: display name and commune; private:
email); the charter (`id="charte"`); « Merci à » (contributor names, only
once there are ≥ 3); FAQ « Questions de contributeurs ».

**Forms** (`ContributionShell` around each): what the page is about, the
always-visible notice « Relu par Alexandre avant publication, en général sous
quelques jours. », a link to the charter, a hidden honeypot field (non-empty:
silently accepted and dropped).

- Tip: theme chips (Accès, Infos pratiques, Affluence, Pour qui, Activités,
  Faune & flore, Sécurité, À éviter, Astuce; default Astuce) and text 10–500.
- Correction (of a tip, or of the place): kind « N'est plus vrai » / « Inexact »
  / « Il manque une précision » and text 10–1000. The tip form 404s unless the
  claim is a public PUBLISHED claim of the place or its parent.
- Photos: 1–6 JPEG/PNG/WebP/HEIC, consent checkbox. HEIC is converted in the
  browser, then every photo is re-encoded in the browser to ≤ 0.6 MB and
  1600 px (EXIF dropped). The server re-checks: ≤ 1 MB per file, ≤ 4 MB total,
  type from magic bytes (JPEG, PNG, WebP), never from the declared MIME type.
  Objects go to `contributions/{contributionId}/{uuid}.{ext}`; any upload
  failure removes what was stored and the contribution.
- New place: name, commune, « Comment le trouver ? » (free text or Maps link),
  why it belongs in the guide.
- The four place-scoped forms 404 for non-ACTIVE places.

**Identity**: signed out, forms add a display name (pseudonym allowed), an
optional commune, an email (never shown) and a required checkbox accepting the
charter and privacy notice. Signed in, they show « Publié sous le nom … ·
modifier » (→ `/compte`) instead.

**Submit, signed in**: validated, capped at 10 PENDING per user, stored as
PENDING, `ADMIN_EMAIL` notified, then redirect to the place (or to
`/contribuer` for a new place) with `?contribution=envoyee`.

**Submit, signed out (write first, sign in at submit)**: the contribution is
stored UNCONFIRMED with `pendingEmail`/`pendingName`/`pendingCommune`
(photos uploaded at this point), a magic link is sent, and the visitor lands
on `/connexion/verifier` (« Dernière étape : cliquez sur le lien envoyé à
m•••@gmail.com… », « Renvoyer le lien », « Mauvaise adresse ? Recommencer »).
If the visitor has nothing left to confirm (no UNCONFIRMED contribution for
the pending-cookie email, or, without that cookie, a signed-in user with a
contribution submitted in the last 15 minutes), the page shows « Votre
contribution est déjà en relecture. Vous recevrez un email dès qu’elle est en
ligne. » with a link back to the guide, unless `?erreur=envoi`.
The draft survives the link opening in another browser. A pending cookie
(`nc_pending`, httpOnly, 24 h) remembers email, target and form path for the
resend page. Throttles: one link per minute per address (a second submit
inside the minute still saves the contribution but sends no new email), and
at most 30 UNCONFIRMED contributions site-wide per 10 minutes (« Trop de
demandes en ce moment… »). Clicking the link signs the user in; a Better Auth
session hook attaches every UNCONFIRMED contribution of that verified email on
**any** sign-in (cross-device, `/compte`), and `/connexion/confirmer`
redirects to the target with `?contribution=envoyee` (a safe same-site path
only) as a fallback if the hook failed. Matching on a verified email is the
security boundary.

**`/compte`**: signed out, an email field (« Recevoir le lien »); signed in,
display name and commune (« Enregistrer »), « Mes contributions » (private
list, newest first: type, place, short excerpt or photo thumbnails, date, and a
status badge « En relecture » / « Publiée » (« Retenue » for a proposed place,
« Prise en compte » for a correction) / « Non retenue » with Alexandre's
message; empty state with a « Contribuer » button), « Se déconnecter », and « Supprimer
mon compte » (confirmation checkbox, « Supprimer définitivement »; published
tips stay as « Un ancien contributeur »). The Better Auth `/update-user`
endpoint is disabled so names always go through the 2–40 character
validation.

**Legal**: `/confidentialite` (data collected, purposes, processors, retention,
rights) and `/mentions-legales` (`LegalPage`), contact `contact@laciotatnature.fr`.

## Shared chrome

- `SiteHeader`: logo + « Guide Nature de La Ciotat », « Tous les lieux »,
  « Contribuer » (filled pill on desktop, highlighted when on `/contribuer*`),
  « À propos », « Soutenir » (Tipeee), an initial avatar linking to `/compte`
  when signed in, or a « Se connecter » link (desktop only) when signed out;
  `MobileMenu` on small screens (same items plus « Mon compte »).
- `SiteFooter`: « Un guide écrit par les gens d'ici, relu par Alexandre. »
  with live counts (« {n} conseils · {k} contributeurs »; contributors only
  once k ≥ 2), a Tipeee button, links Contribuer · À propos · Confidentialité
  · Mentions légales, and the fire-risk line linking to the official access
  map.
- Links in `src/components/landing/shared.ts`: `ACCESS_MAP_HREF` is the
  préfecture's daily massif access map (`risque-prevention-incendie.fr/13`);
  `TIPEEE_HREF` is still a `#` placeholder (`STORY_HREF` points to
  `/a-propos`).
- No WhatsApp anywhere on the site.

## Honest counts

All from the DB (`src/corpus/community.ts`, cached under `corpus`), never
padded. « Conseils » = PUBLISHED public claims of ACTIVE places.
« Contributeurs » site-wide = Alexandre + distinct users with ≥ 1 APPROVED
contribution; per place = distinct authors of its public claims (Alexandre
counts as one). A contributor count is shown only when ≥ 2. Sections that
depend on contributor content show only above a threshold: landing
« Derniers conseils partagés » at ≥ 3 contributor tips, `/contribuer`
« Merci à » at ≥ 3 contributors.

## Accessibility & performance floor

Visible keyboard focus, color never the only signal, `prefers-reduced-motion`
respected, images with dimensions (no layout shift), mobile-first at 375px,
safe-area insets on notched phones, LCP < 2.5s on 4G.
