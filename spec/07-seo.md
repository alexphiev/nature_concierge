# 07 — SEO & AI-SEO

What's in the code, what's left to do outside it, and known caveats.

## Implemented

- **Rendering**: place pages are prerendered static pages (Cache Components);
  everything a crawler needs is in the server HTML. Corpus data is cached
  under the `corpus` tag and invalidated by admin mutations and
  `POST /api/revalidate`.
- **URLs**: French routes `/lieux` and `/lieux/[slug]`, permanent redirects
  from `/places/*`.
- **Metadata**: `metadataBase`, canonical on every public page, title
  template « %s · Guide Nature de La Ciotat ». Place titles
  `{Name} ({commune}) : ouvert aujourd'hui ? Accès, parking` (~60 chars);
  description from the place description, then the first claim, then a
  fallback. OpenGraph `site_name`, `locale`, `url`; Twitter large card;
  per-place OG image (`app/(public)/lieux/[slug]/opengraph-image.tsx`) and a
  site OG image.
- **Structured data**: place pages `TouristAttraction` + `BreadcrumbList` +
  `FAQPage` (from claims grouped by type, fixed question templates); `/lieux`
  `ItemList`; `/` `WebSite` + `Organization`.
- **Indexed community pages**: `/contribuer`, `/confidentialite` and
  `/mentions-legales` (static, canonical, in the sitemap). `/a-propos` has
  metadata but is not in the sitemap. Everything account- or form-related is
  `noindex`: `/contribuer/nouveau-lieu`, `/lieux/[slug]/astuce`, `/corriger`,
  `/corriger/[claimId]`, `/photos`, `/compte`, `/connexion/verifier`, and
  `/admin/*` (also `X-Robots-Tag: noindex` from `proxy.ts`).
- **Crawling**: `sitemap.xml` (landing, `/lieux`, `/contribuer`,
  `/mentions-legales`, `/confidentialite`, ACTIVE places with `lastmod` =
  latest public claim update, else place update); `robots.txt` disallows
  `/admin` and `/api`, AI crawlers allowed.
- **AI-SEO**: `/llms.txt` generated from ACTIVE places (spots nested under
  their parent), with the community framing (« conseils écrits par les gens
  d'ici et relus avant publication ») and a contact line pointing to
  `/contribuer`; « À proximité » internal links (4 nearest within 25 km); clean
  semantic HTML (one `<h1>`, claims as standalone sentences). Tip attribution
  is visible text on the page, not in JSON-LD.

## To do outside the code

1. Make sure `NEXT_PUBLIC_SITE_URL` is set in prod (canonicals, sitemap,
   `llms.txt` otherwise point to localhost).
2. Google Search Console: verify the domain, submit `/sitemap.xml`.
3. Bing Webmaster Tools: import from Search Console. Bing feeds ChatGPT
   search and Copilot, so it matters for AI-SEO.
4. Content depth: ~150–300 words of original text per place (description +
   3–5 public claims). Thin pages rank poorly and are rarely cited.
5. Local backlinks: tourism offices, campsites, local Reddit/Facebook groups,
   hiking and diving clubs.
6. After 2–3 weeks, rewrite titles and claims to match real queries from
   Search Console (« calanque X ouverte », « parking X », « X avec enfants »).
7. Validate structured data (Rich Results Test, schema.org validator) after
   each schema change; check share previews (WhatsApp, Facebook Sharing
   Debugger).

## Known caveats

- **FAQPage**: Google shows FAQ rich results only for government and health
  sites since 2023. Kept because Bing and AI parsers still read it.
- **No `image` in JSON-LD**: Google's photo terms require visible author
  attribution. Add our uploaded photos there when wanted.
- **Out-of-band writes** (seed script, local admin against the shared DB)
  reach prod within an hour (`corpus` cacheLife) or immediately via
  `POST /api/revalidate`.
- Resolved: the root `description` and the `llms.txt` mission text use the
  community framing (« écrit par les gens d'ici… relus avant publication »),
  no longer the concierge one.

## Ideas for later (not committed to)

- A plain-markdown version of each place page (`/lieux/{slug}.md`) linked
  from `llms.txt`.
- Hub pages by commune or type (« Calanques de La Ciotat »).
