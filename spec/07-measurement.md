# 07 — Measurement

## Principles

Privacy-clean, EEA-hosted, no cookie banner needed, no personal data beyond what
the concierge log already holds (userRef pseudonyms). Measurement serves exactly
two questions: **do strangers find the pages?** and **do pages produce
conversations?** Anything not answering those is vanity.

## Stack

- **Plausible (EU) or Umami self-hosted** — pick in 08-infra, 10-minute decision.
- **Google Search Console** — property verified at launch day, sitemap submitted.
- **Postgres** — the Request table is the primary instrument; site analytics are
  the funnel's top only.

## Events (exhaustive list — do not add more without editing this file)

| event | props | fires |
|-------|-------|-------|
| `whatsapp_click` | `source` ("landing" or place slug) | any WhatsApp CTA |
| `official_source_click` | `slug` | status block outbound link |
| `alternative_click` | `from_slug`, `to_slug` | dispersal link followed |
| `qr_visit` | `src` ("camping", "ot", …) | landing with ?src= |

Page views come free from the analytics tool. `whatsapp_click` per slug is the
page-level conversion metric.

## Search Console review (weekly, part of the Sunday ritual)

- Impressions/clicks per place page; which query patterns surface
  ("ouvert", "parking", "affluence", place name alone).
- Pages with impressions but no clicks ⇒ title/description iteration candidates.
- Zero-impression pages after 3 weeks ⇒ demandRank was wrong or SEO issue; check
  indexing first, demand second.

## Funnel definition (what "working" looks like)

impressions → place page view → `whatsapp_click` → Request row (channel=WHATSAPP,
note the slug in requestText/prefill) → outcome ∈ {RETURNED_NEW_REQUEST,
REFERRED_SOMEONE}.

The join between analytics and Requests is manual and approximate (prefill
mentions the place); do not build attribution plumbing for this. 25 requests is
a number you can eyeball.

## `/admin/metrics` dashboard (replaces a CLI script — read-only, in `/admin`)

Two sections on one page, inside the same `/admin` tool as ingestion, the
daily status page, and request logging (per `10-corpus-ingestion.md`,
`04-signal-ops.md`, `06-concierge-ops.md`):

**Corpus coverage** — published claims per ACTIVE place vs. `demandRank`
(surfaces thin coverage on high-demand places first), verification mix
(field-verified / official / testimony / heuristic proportions), and the
re-verification backlog (SEASONAL claims with `verifiedOn` > ~1 year old).

**Concierge metrics** — requests by channel, return rate, median
`timeSpentMin` (rolling 10), reuse rate (avg `claimsUsed` per request), gap
rate (% of requests with `claimsCreated` > 0), and the pre-committed
thresholds from `00-scope.md` shown against current values so progress toward
the end-of-August decision is visible at a glance, not buried in a script's
stdout.

**Site traffic** — top pages by `whatsapp_click` (from Plausible/Umami, per
`03-public-site.md` and `05-landing.md`) and the Search Console impressions
trend for place-page query patterns, so a page with impressions but no clicks
is visible as a title/description iteration candidate.

Read-only page, computed live from the DB (no separate scheduled job, no
export step) — this is purely a viewing convenience, so there's no write-safety
concern like the ones we're careful about elsewhere in `/admin`.
