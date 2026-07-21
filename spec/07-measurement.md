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

## Weekly metrics query (`pnpm metrics:weekly`)

Prints: requests by channel · return rate · median timeSpentMin (rolling 10) ·
reuse rate · gap rate · top pages by whatsapp_click · SC impressions trend.
Output pasted into a dated `journal/` md file — the decision record for end of
August.
