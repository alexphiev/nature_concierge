# Task 5 Report: `PlaceCard` redesign — "Spécimen de terrain" + status bug fix

## Status: DONE

Commit: `21046c647cd12dc25708f81e75ac36ccaa978af5`
"Redesign PlaceCard to Specimen de terrain layout; fix hardcoded null status bug"

## What was done

1. **`src/components/PlaceCard.tsx`** — rewritten exactly per the brief's Step 2 code.
   - `PlaceCard` now takes `{ place, status, photo }` instead of just `{ place }`.
   - The previous hardcoded `<StatusChip value={null} />` bug is fixed: status is now a real prop (`ResolvedStatus` from `src/corpus/queries.ts`), rendered by a new local `StatusPill` component that maps `status.isOpen` / `status.restricted` to the correct label ("Fermé" / "Ouvert — restreint" / "Ouvert") and color class, with a distinct dashed "Non vérifié" fallback when `status` is `null`.
   - New photo panel: `aspect-[4/3]` container, `<img src="/places/{slug}/photo" />` when `photo` is present, gradient overlay for text legibility, and a diagonal-hatch `repeating-linear-gradient` fallback background (using `color-mix(in srgb, var(--pin) 6%, transparent)`) when there's no photo.
   - Floating translucent status pill (`backdrop-blur-sm` + alpha-mixed background) positioned top-right over the photo, plus a type-label pill bottom-left.
   - Footer with place name, commune/département, and hover lift (`-translate-y-0.5`) + border color shift (`hover:border-mediterranee`) + shadow on the whole card, focus-visible outline preserved.
   - `hookClaim` is declared exactly as the brief specifies: `const hookClaim = null as {claimType: string; claimText: string} | null;` with the brief's explanatory comment kept verbatim. The `{hookClaim && (...)}` block is present unchanged, so it never renders. **I did not write a query, add a Prisma call, or otherwise attempt to populate `hookClaim`.** This remains explicitly out of scope per the brief and needs a deliberate follow-up task to decide the query shape (one public/published claim per place, batched across a grid).

2. **`app/(public)/places/page.tsx`** — rewritten exactly per the brief's Step 1 code.
   - Fetches `getActivePlaces()`, then for each place runs `Promise.all([resolvePlaceStatus(place.id), getGooglePlaceDetails(place.googlePlaceId)])` in parallel (avoiding a status→photo waterfall within a place), and all places' fetches are themselves wrapped in an outer `Promise.all` (avoiding a place-by-place waterfall across the grid).
   - Passes `status` and `photo` down to `PlaceCard` as props; `PlaceCard` itself remains fully synchronous/presentational.
   - Grid gap widened from `gap-4` to `gap-6` (24px) to match the approved mockup's `.grid-a { gap: 24px }`.

## Pre-implementation checks

- Confirmed `ResolvedStatus`'s shape in `src/corpus/queries.ts` (`{ zoneValue, displayValue, isOpen, restricted, detail, confirmedAt, zoneLabel, provider } | null`) and `GooglePlacePhoto` in `src/corpus/google-places.ts` match what the brief's `PlaceCard` code assumes. Neither module was modified.
- Confirmed `Place.departement` and `Place.googlePlaceId` exist on the Prisma schema (`prisma/schema.prisma`).
- Confirmed the CSS custom properties / Tailwind theme tokens used (`--pin`, `--calcaire-deep`, `--mediterranee`, `--statut-inconnu`, plus `statut-vert`/`statut-orange`/`statut-rouge`) already exist in `app/globals.css` — no new theme tokens were needed.
- `grep`'d the whole repo for `PlaceCard` usages: only `app/(public)/places/page.tsx` consumes it, so no other call site needed updating.

## Test file check (Step 3)

Ran `find src/components -iname "PlaceCard.test.*"` before making changes — no existing test file. Per the brief and the project's established pattern (zone-status-model plan's precedent for `StatusBlock`/`StatusChip`: presentational components with no existing tests do not get new test infrastructure added just because their implementation changed), **no new test file was created**.

## Verification

- `pnpm exec tsc --noEmit` — clean, no errors, project-wide.
- `pnpm exec vitest run` — 10 test files, 85 tests, all passing.
- `git status` / `git diff --stat` before commit showed only the two intended files changed (`app/(public)/places/page.tsx`, `src/components/PlaceCard.tsx`); nothing else was touched or left staged.

## Explicit confirmation: hookClaim was NOT implemented

Per the brief's explicit instruction and the task instructions given to me, I did **not**:
- write a new query for hook claims,
- add a Prisma call to fetch a claim,
- remove or alter the `{hookClaim && (...)}` guard block.

`hookClaim` is left exactly as `null` (typed as `{ claimType: string; claimText: string } | null`), so that block never renders on any card. This is flagged here, as instructed, as a possible follow-up task rather than something I implemented: fetching "one representative public, published claim per place" efficiently across a whole grid (avoiding N+1 queries) is a real query-shape decision that should be made explicitly in its own task, not guessed at here.

## Manual test steps (no browser automation was run — project owner tests UI manually)

Navigate to `/places` in a dev server and check:

1. **Photo rendering**: For places with a resolvable Google Place (valid `googlePlaceId` and a photo available), the card should show a real photo filling the 4:3 panel, with a subtle dark gradient at the bottom for text contrast. For places with no `googlePlaceId` or no photo returned, the panel should show the `calcaire-deep` background with a subtle diagonal hatch texture (faint, olive/pin-tinted diagonal lines) instead of a blank box.
2. **Status pill correctness** — for a place with:
   - No `ZonePlace`/`StatusLog` at all → dashed-border grey "Non vérifié" pill.
   - A `StatusLog` where `isOpen: true, restricted: false` → green pill, "Ouvert".
   - A `StatusLog` where `isOpen: true, restricted: true` → orange pill, "Ouvert — restreint".
   - A `StatusLog` where `isOpen: false` → red pill, "Fermé".
   - This is the actual bug fix: previously every card always showed "Non vérifié" regardless of real data (hardcoded `<StatusChip value={null} />`). Verify against a place you know has an active `StatusLog` for today (`forDate` = today) that the pill now reflects real status, not always "Non vérifié".
3. **Type label pill**: bottom-left over the photo, showing the correct French label (Calanque/Plage/Massif/Sentier/Sommet/Site) for each place's `type`.
4. **Hook claim**: confirm the divider/claim line under the commune/département text never appears on any card (expected — `hookClaim` is hardcoded `null`).
5. **Hover/focus behavior**: hovering a card should lift it slightly (`-translate-y-0.5`), shift the border to the Méditerranée teal color, and add a shadow. Tab-focusing a card (keyboard nav) should show a visible 2px teal outline offset from the card edge.
6. **Grid spacing**: gap between cards should look slightly wider than before (24px vs previous 16px) — 1 column on mobile, 2 on `sm`, 3 on `lg`.
7. **No console/network errors**: confirm the `/places/{slug}/photo` route (Task 3, already merged) actually serves an image for places with photos, and that missing photos don't throw — they should just fall through to no `<img>` tag being rendered (the `photo &&` guard).

## Concerns

- None blocking. `pnpm exec tsc --noEmit` and `pnpm exec vitest run` (85/85) are both clean, and the diff touches only the two files specified in the brief.
- The Tailwind LSP/linter flagged two "canonical class" suggestions (`aspect-[4/3]` → `aspect-4/3`, `bg-gradient-to-t` → `bg-linear-to-t`) — both are purely stylistic, the brief's specified classes still work correctly in Tailwind v4, so I left them exactly as written in the brief rather than substituting the linter's preferred spelling.
- Reiterating per the task instructions: the `hookClaim` gap is a deliberate, unresolved scope boundary from the brief, not an oversight. Flagging it as a follow-up decision point, not something I attempted to resolve.
