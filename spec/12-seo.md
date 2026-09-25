# 12 — SEO & AI-SEO

What's already in the code, what's left to do outside the code, and the
known caveats. Rendering and page structure are in `03-public-site.md`;
Search Console tracking is in `07-measurement.md`.

## Already implemented (branch `feat/static-place-pages-seo`)

- **Rendering:** place pages are prerendered static shells (Cache Components).
  Only the fire status is rendered per request, streamed in the same HTML
  response. Corpus data is cached under the `corpus` tag and invalidated by
  admin mutations and by `POST /api/revalidate`.
- **URLs:** French routes `/lieux` and `/lieux/[slug]`, with permanent (308)
  redirects from `/places/*`.
- **Metadata:**
  - `metadataBase`, a canonical on every public page, titles of about 60 characters:
    `{Name} ({commune}) : ouvert aujourd'hui ? Accès, parking`.
  - The description comes from the place description, then the first claim, then a fallback.
  - OpenGraph `site_name`, `locale` and `url`, plus Twitter large card.
- **Structured data:**
  - Place pages: `TouristAttraction`, `BreadcrumbList`, and a `FAQPage` built
    from claims grouped by type, with fixed question templates.
  - `/lieux`: `ItemList`.
  - `/`: `WebSite` and `Organization`.
- **Never in snippets:** the daily status is kept out of meta descriptions,
  JSON-LD and OG images. Search engines and share previews cache these for
  days, so a status there would go stale.
- **Crawling:**
  - `sitemap.xml` with `lastmod` = the latest of claim updates and status confirmations.
  - `robots.txt` disallows `/admin` and `/api`.
  - AI crawlers are allowed.
- **AI-SEO:**
  - `/llms.txt` is generated from active places (spots nested under their parent).
  - "À proximité" section: the 4 closest places within 25 km.
  - Per-place OG image, with no status on it.

## To do outside the code

1. **Set `NEXT_PUBLIC_SITE_URL` in prod.** Without it, canonicals, the
   sitemap and `llms.txt` all point to localhost. This comes before
   everything else.
2. **Google Search Console:** verify the domain property and submit
   `/sitemap.xml`.
3. **Bing Webmaster Tools:** import from Search Console and submit the
   sitemap. Bing's index feeds ChatGPT search and Copilot, so this matters
   as much as Google for AI-SEO.
4. **Content depth:** aim for about 150–300 words of original text per
   place (description plus 3–5 public claims). Pages with only a line or
   two rank poorly and are rarely cited by AI.
5. **Backlinks:** local sources count most, such as commune tourism
   offices, campsites (the CAMPING_QR channel), local Reddit and Facebook
   groups, and hiking or diving clubs. One relevant local link is worth
   more than any on-page tweak.
6. **Iterate on real queries:** after 2–3 weeks, check Search Console →
   Performance → Queries. Rewrite titles and claims to match the phrasing
   people actually use ("calanque X ouverte", "parking X", "X avec
   enfants"…).
7. **Validate structured data:** run a few place URLs through Google's Rich
   Results Test and the schema.org validator after each schema change.
8. **Share previews:** paste a place URL into WhatsApp or Facebook (Sharing
   Debugger) to check the OG image and title.

## Known caveats

- **AI crawlers and streamed status:** Next only fully blocks the render
  for bots matching its built-in list. GPTBot, ClaudeBot and PerplexityBot
  get the static shell, with a "Statut du jour…" placeholder where the
  status goes and the real status in a hidden block at the end of the HTML.
  The status is still in the server HTML, just not in its visual position.
- **FAQPage:** Google has only shown FAQ rich results for government and
  health sites since 2023. We keep the markup because Bing and AI parsers
  still read it.
- **No Google Places photo in JSON-LD:** Google's photo terms require a
  visible author attribution, which structured-data consumers don't show.
  Use our own photos if we ever want an `image` there.
- **Out-of-band corpus writes:** the seed script and a local admin against
  the shared DB don't reach prod's cache on their own. They need a
  redeploy, `POST /api/revalidate`, or the hourly `corpus` cacheLife
  safety net (if merged).
- **Zone lookup:** `findZonePlace` doesn't filter to FIRE_ACCESS zones.
  Fix it before adding water or air zones, or a place could show a wrong
  "Ouvert".

## Ideas for later (not committed to)

- A per-place page in plain markdown (e.g. `/lieux/{slug}.md`) for LLM
  ingestion, linked from `llms.txt`.
- Our own photos per place, to replace Google Places photos in the gallery,
  OG images and JSON-LD `image`.
- Hub pages by commune or type ("Calanques de La Ciotat"), for internal
  linking and head-term queries.
