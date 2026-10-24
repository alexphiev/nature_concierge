# 08 — Infra

## Services

| Concern | Choice |
|---|---|
| Domain | laciotatnature.fr |
| Hosting | Vercel |
| Database | Neon Postgres (EU, eu-central-1), Prisma 7 via `@prisma/adapter-pg` |
| Object storage | Neon Object Storage (S3-compatible), bucket `place-photos` (`public_read`), via `@aws-sdk/client-s3`; place photos under `places/`, contributor photos under `contributions/` |
| Claim extraction | Google Gemini (`@google/genai`), model from `GEMINI_MODEL` |
| Search ranking + claim quality score | TypeSafe Jev (`@typesafe-ai/sdk`) |
| Contributor sign-in | Better Auth (`better-auth`, Prisma adapter, magic-link plugin, 15-minute links); sessions and users in Neon |
| Transactional email | Resend (`resend`), French plain-text emails; `EMAIL_FROM` sender |
| Place photos fallback, Maps links, geocoding | Google Places API (New) + Geocoding API |
| Commune autocomplete | api-adresse.data.gouv.fr (free, no key) |
| Analytics | Vercel Web Analytics (`<Analytics />` in the root layout); no custom events |
| Search monitoring | Google Search Console, Bing Webmaster Tools (`07-seo.md`) |

Emails (`src/email`): magic link (two subjects: « Confirmez votre email pour
envoyer votre contribution » after a signed-out submit, « Votre lien de
connexion au Guide Nature de La Ciotat » from `/compte`); to `ADMIN_EMAIL`
« Nouvelle contribution à relire — {type} · {lieu} » when a contribution
becomes PENDING; to the contributor, on decision: « Votre astuce sur {lieu} est
en ligne, merci ! », « Votre photo sur {lieu} est en ligne, merci ! » (« Vos
photos… » for several), « Merci, la fiche {lieu} a été mise à jour » / « Merci,
on en a tenu compte pour la fiche {lieu} », « Bonne idée : {lieu} va rejoindre
le guide », « Votre contribution n'a pas été retenue ». Without
`RESEND_API_KEY`, outside production, emails are logged to the server console
instead of sent (the magic link is in the `pnpm dev` terminal). A send failure
on a decision never rolls the decision back; on a signed-out submit it keeps
the contribution and offers « Renvoyer le lien ».

## Environments

`local` and `production` share one Neon database; local dev connects with
`DATABASE_URL` in `.env.local` (gitignored). A Neon branch can be used for
isolated work. No staging.

## Environment variables

Template in `.env.dist`.

| Variable | Used by |
|---|---|
| `DATABASE_URL` | Prisma |
| `NEXT_PUBLIC_SITE_URL` | canonicals, sitemap, `llms.txt`, OG |
| `REVALIDATE_TOKEN` | `POST /api/revalidate` (Bearer) |
| `ADMIN_PASSWORD` | `/admin` Basic Auth (`proxy.ts`) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | claim extraction |
| `TYPESAFE_API_KEY` | Jev search and quality score |
| `GOOGLE_PLACES_API_KEY` | Places photos/details and Geocoding (server-only) |
| `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Neon Object Storage |
| `BETTER_AUTH_SECRET` | Better Auth session and token signing |
| `BETTER_AUTH_URL` | Better Auth base URL (the site URL) |
| `RESEND_API_KEY` | Resend; empty in dev logs emails to the console |
| `EMAIL_FROM` | Sender of every email |
| `ADMIN_EMAIL` | Receives « Nouvelle contribution à relire » |

## Checks

No CI pipeline. Before merging: `pnpm test`, `pnpm lint`, `pnpm build`
(type-checks). Production is deployed on Vercel. Migrations are applied with
`pnpm exec prisma migrate deploy`.

## Backups

Neon's automated backups and point-in-time restore. Uploaded photos live only
in the bucket; there is no separate copy.
