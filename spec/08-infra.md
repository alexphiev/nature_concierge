# 08 — Infra

## Services

| Concern | Choice |
|---|---|
| Domain | laciotatnature.fr |
| Hosting | Vercel |
| Database | Neon Postgres (EU, eu-central-1), Prisma 7 via `@prisma/adapter-pg` |
| Object storage | Neon Object Storage (S3-compatible), bucket `place-photos` (`public_read`), via `@aws-sdk/client-s3` |
| Claim extraction | Google Gemini (`@google/genai`), model from `GEMINI_MODEL` |
| Search ranking + claim quality score | TypeSafe Jev (`@typesafe-ai/sdk`) |
| Place photos fallback, Maps links, geocoding | Google Places API (New) + Geocoding API |
| Commune autocomplete | api-adresse.data.gouv.fr (free, no key) |
| Analytics | Vercel Web Analytics (`<Analytics />` in the root layout); no custom events |
| Search monitoring | Google Search Console, Bing Webmaster Tools (`07-seo.md`) |

Planned by the community contributions work: Better Auth (contributor
sessions, tables in Neon) and Resend (magic-link and decision emails).

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
| `SHOW_CONSTRUCTION_BANNER` | `false` hides the banner |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp links (removed by the contributions work) |

## Checks

No CI pipeline. Before merging: `pnpm test`, `pnpm lint`, `pnpm build`
(type-checks). Production is deployed on Vercel. Migrations are applied with
`pnpm exec prisma migrate deploy`.

## Backups

Neon's automated backups and point-in-time restore. Uploaded photos live only
in the bucket; there is no separate copy.
