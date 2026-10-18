# 02 — Corpus Ops (how knowledge enters the system)

The corpus (places, claims, sources, photos) lives in Postgres. Git is not the
system of record for it.

## Entry paths

1. **Admin** (primary): places and photos are created and edited in
   `/admin/places`; claims are captured from pasted text or photos in
   `/admin/ingest`, drafted by Gemini and approved one by one in
   `/admin/review/[draftId]`. See `05-admin.md`.
2. **Seed files** (secondary, legacy): `src/corpus/places/*.ts`, one typed
   file per place (`definePlace`, place + sources + claims), validated by zod
   and upserted by `pnpm corpus:seed`. Only `port-d-alon.ts` exists today.
   Seeding is idempotent by slug, never deletes, and sets places ACTIVE.
3. **Contributions**: tips, corrections, photos and new places from
   contributors (accounts by email magic link), reviewed one by one in
   `/admin/contributions`. An approved tip becomes a PUBLISHED public `Claim`
   (`verification` LOCAL_TESTIMONY, `verdict` GO, `decayClass` SEASONAL, no
   conditions) with a `Source` of type `contribution` and the contributor as
   `authorId`; an approved new place becomes a DRAFT `Place` to complete in
   `/admin/places`. Nothing is published without Alexandre's review. See
   `05-admin.md`.

## Quality bar

A claim earns its row only if it couldn't be written from a desk:

- Falsifiably specific (an hour, a number, a named spot)?
- Conditional (its truth changes with circumstances)?
- Had an acquisition cost (visit, conversation, cross-check)?
- Could it have been written without knowing the place? → reject it.

High-value claim kinds: micro-logistics, failure modes, conditional
suitability, negative verdicts, cross-place alternatives, temporal windows,
institutional decoding.

The bar is enforced three times: in the extraction prompt (the model
under-extracts rather than pads), on screen next to every draft in the review
page, and by the **quality score**: a Jev question (`CLAIM_IS_USEFUL` in
`src/search/jev/questions.ts`) rating usefulness 0–10, computed for every
extracted draft claim (a Jev failure leaves it unscored, never blocks) and
stored on `Claim.qualityScore` at approval.

## Validation rules (seed files and approval)

1. `conditions` non-empty unless `decayClass = PERMANENT`.
2. `verdict = ALTERNATIVE` ⇒ a resolvable alternative place.
3. Taxonomy values ∈ `src/corpus/taxonomy.ts`.
4. `departement` ∈ {"13", "83"}; slugs unique.
5. `FIELD_VERIFIED` only for claims from a personal visit.
6. `verifiedOn` ≤ today.

## Commands

| Command | Does |
|---|---|
| `pnpm corpus:check` | Validate seed files (no DB) |
| `pnpm corpus:seed` | Validate, then upsert seed files into Postgres |
| `pnpm corpus:stats` | Coverage report: claims per place, verification mix, re-verification backlog |
| `pnpm corpus:score` | Score claims and pending draft claims that have no quality score yet (never overwrites; prints divergences) |
| `pnpm search:seed` | Upsert the landing's search shortcuts |

## Cache refresh

Public corpus queries are cached under the `corpus` tag (`cacheLife`
"corpus": revalidate hourly). Admin mutations call `updateTag("corpus")`.
Writes made outside the deployed app (seed script, local admin against the
shared DB) reach prod within an hour, or immediately with:

```bash
curl -X POST -H "Authorization: Bearer $REVALIDATE_TOKEN" $NEXT_PUBLIC_SITE_URL/api/revalidate
```
