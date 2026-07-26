# Public Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/places` and `/places/[slug]` per the approved "Spécimen de terrain" mockups, fix the `PlaceCard` status bug, and add Google Places photo/Maps-link integration via a manually-entered `googlePlaceId`.

**Architecture:** A new `src/corpus/google-places.ts` module wraps the Google Places API (New) Place Details endpoint with a single cached lookup function. A thin route handler (`app/places/[slug]/photo/route.ts`) redirects to Google's photo media URL so image bytes never pass through this app's server and the API key stays server-only. `PlaceCard` and the detail page hero call the same cached lookup server-side and branch synchronously between `<img>` and a quiet fallback panel — no client components anywhere in this plan. All visual changes are pure component/Tailwind rewrites of existing files; no rendering-logic changes to `resolvePlaceStatus` or the ZAPEF cascade.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Vitest (`vi.hoisted()` Prisma-mock convention), Google Places API (New).

## Global Constraints

- Design source of truth: `docs/superpowers/specs/2026-07-26-public-site-redesign.md` and the two approved mockup files (already deleted from the scratchpad by the time of implementation — this plan inlines every visual detail needed, do not attempt to re-fetch the mockup URLs).
- Color tokens, fonts, and spacing come from the **existing** `app/globals.css` custom properties (`--calcaire`, `--calcaire-deep`, `--encre`, `--mediterranee`, `--pin`, `--sable`, `--statut-vert`, `--statut-orange`, `--statut-rouge`, `--statut-inconnu`) and Tailwind's `@theme inline` mapping already in place — do not introduce new colors or override existing tokens. Use Tailwind utility classes (`bg-calcaire-deep`, `text-mediterranee`, etc.), not inline CSS custom properties, to match this codebase's existing style (see current `PlaceCard.tsx`/`StatusBlock.tsx` for the convention).
- **No stock imagery, no placeholder images.** When no Google photo is available, render a quiet `bg-calcaire-deep` panel with a diagonal hatch texture and the place type label — never a placeholder stock image (spec 09's explicit rule, unchanged).
- **Never cache Google's photo `name`/reference beyond the 7-day `fetch` revalidate window.** Do not store it on `Place`, do not write it to any file, do not hold it in a module-level variable across requests — it is re-derived from a fresh Place Details call every time the cache window expires. Only `googlePlaceId` is ever persisted.
- **Server components only for `/places` and `/places/[slug]`.** No `"use client"` directive anywhere in this plan's files — the photo-exists-or-not decision happens server-side, before rendering, via `await getGooglePlaceDetails(...)`.
- **`GOOGLE_PLACES_API_KEY` never reaches the browser.** It is read only inside `src/corpus/google-places.ts` (a server-only module, no `"use client"` anywhere in its import chain) and inside the route handler that builds the redirect URL.
- Status must remain color-independent: every status pill/stamp pairs color with a text label and (where already established) a dot/icon — never color alone. This is unchanged from the existing `StatusChip`/`StatusBlock` behavior; the redesign must preserve it, not just carry over the color.
- `resolvePlaceStatus`, `ResolvedStatus`, the ZAPEF cascade, and `Dateline` are **not modified** by this plan — only how their output is *rendered* changes.
- `await connection()` must remain the first call before any Prisma query in both `app/(public)/places/page.tsx` and `app/(public)/places/[slug]/page.tsx` — wait, check: the current place pages do NOT call `connection()` today (verify in Task 4/5 — the index page currently has no `connection()` call, and the detail page uses ISR `revalidate = 900` instead). Do not add `connection()` to these two pages as part of this plan; that would change their existing static-generation/ISR strategy, which is out of scope. This constraint exists to flag the difference from `/admin/*` pages, not to introduce a new call.
- All user-facing copy stays in French, matching every existing string in these files.

---

### Task 1: Schema — add `Place.googlePlaceId`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via the project's established non-interactive procedure (`prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` → hand-placed timestamped migration folder → `prisma migrate deploy` — see any recent prior plan's Task 1 report for the exact commands; this sandboxed environment blocks `migrate dev`'s interactive TTY confirmation)

**Interfaces:**
- Consumes: nothing new.
- Produces: `Place.googlePlaceId: String | null` on the Prisma client, consumed by Task 2 (admin form), Task 3 (`google-places.ts`), Task 6/7 (public pages).

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Add one field to the `Place` model, alongside the existing `zapef` field (same section, similar simple optional-scalar shape):

```prisma
model Place {
  // ...existing fields unchanged...
  zapef              Boolean     @default(false)
  googlePlaceId      String?
  // ...rest unchanged...
}
```

- [ ] **Step 2: Run the migration**

Follow this project's established non-interactive procedure (verify the exact compound-key/table names are unaffected — this is a single nullable-column addition to an existing table, so no `NOT NULL`-without-default hazard like Task 1 of the ingestion-blocks plan; a plain `ALTER TABLE "Place" ADD COLUMN "googlePlaceId" TEXT;` is expected and safe against existing rows).

```bash
pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
# inspect output, strip any stray env-loader banner line, hand-place into
# prisma/migrations/<timestamp>_add_place_google_place_id/migration.sql
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status   # expect "up to date"
pnpm exec prisma generate
grep -n "googlePlaceId" prisma/generated/models/Place.ts   # expect matches
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Add Place.googlePlaceId for Google Places photo/Maps-link lookup"
```

---

### Task 2: `/admin/places` — add the `googlePlaceId` field

**Files:**
- Modify: `app/admin/places/PlaceForm.tsx`
- Modify: `app/admin/places/actions.ts`
- Modify: `app/admin/places/actions.test.ts`

**Interfaces:**
- Consumes: `Place.googlePlaceId` (Task 1).
- Produces: nothing new exported — `createPlace`/`updatePlace` now also persist this field.

- [ ] **Step 1: Add the field to `PlaceForm.tsx`**

Insert after the "URL info officielle" field (same position as it appears in the mockup context — a plain optional text input, same `inputClass` as every other field in this form):

```tsx
      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">
          Identifiant Google Places (optionnel)
        </span>
        <input
          type="text"
          name="googlePlaceId"
          defaultValue={place?.googlePlaceId ?? ""}
          placeholder="ChIJ..."
          className={inputClass}
        />
      </label>
```

- [ ] **Step 2: Write the failing test for the actions change**

Add to `app/admin/places/actions.test.ts` (extend the existing `baseFormData()` helper and the existing `createPlace`/`updatePlace` test cases — follow the file's established `vi.hoisted()` pattern):

```ts
it("persists googlePlaceId when provided", async () => {
  const formData = baseFormData();
  formData.set("googlePlaceId", "ChIJexample123");

  await createPlace(formData);

  expect(createPlaceMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ googlePlaceId: "ChIJexample123" }),
    }),
  );
});

it("stores null googlePlaceId when left blank", async () => {
  const formData = baseFormData(); // does not set googlePlaceId

  await createPlace(formData);

  expect(createPlaceMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ googlePlaceId: null }),
    }),
  );
});
```

- [ ] **Step 3: Run tests, confirm failure**

```bash
pnpm exec vitest run app/admin/places/actions.test.ts
```

- [ ] **Step 4: Update `readPlaceFields` and both write calls in `actions.ts`**

In `readPlaceFields`, add one line alongside the other optional-string fields:

```ts
    officialInfoUrl: String(formData.get("officialInfoUrl") ?? "") || null,
    googlePlaceId: String(formData.get("googlePlaceId") ?? "") || null,
```

In both `createPlace`'s and `updatePlace`'s `data: { ... }` objects, add `googlePlaceId: fields.googlePlaceId,` alongside the other fields (same position as in `readPlaceFields`, right after `officialInfoUrl`).

- [ ] **Step 5: Run tests, confirm pass**

```bash
pnpm exec vitest run app/admin/places/actions.test.ts
```

- [ ] **Step 6: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add app/admin/places
git commit -m "Add googlePlaceId field to /admin/places form"
```

---

### Task 3: `src/corpus/google-places.ts` — Place Details lookup

**Files:**
- Create: `src/corpus/google-places.ts`
- Test: `src/corpus/google-places.test.ts`

**Interfaces:**
- Consumes: `GOOGLE_PLACES_API_KEY` env var, `fetch` (global, mocked in tests via `vi.hoisted()`).
- Produces:
  ```ts
  export type GooglePlacePhoto = {
    mediaUrl: string;
    attribution: string | null;
  };

  export type GooglePlaceDetails = {
    photo: GooglePlacePhoto | null;
    googleMapsUri: string | null;
  };

  export async function getGooglePlaceDetails(
    googlePlaceId: string | null,
  ): Promise<GooglePlaceDetails | null>;
  ```
  Consumed by Task 4 (photo route) and Tasks 6/7 (public pages).

- [ ] **Step 1: Write the failing tests**

`src/corpus/google-places.test.ts`, using `vi.hoisted()` to mock the global `fetch` (follow this codebase's established hoisted-mock convention — see `src/corpus/ingestion.test.ts`'s pattern from prior plans, or `app/admin/statut/actions.test.ts`, for how a global is mocked in this style):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.stubGlobal("fetch", fetchMock);

import { getGooglePlaceDetails } from "./google-places";

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key-123");
});

describe("getGooglePlaceDetails", () => {
  it("returns null immediately when googlePlaceId is null, without calling fetch", async () => {
    const result = await getGooglePlaceDetails(null);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls Place Details (New) with the correct URL, headers, and cache revalidate window", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ photos: [], googleMapsUri: "https://maps.google.com/?cid=123" }),
    });

    await getGooglePlaceDetails("ChIJexample123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/ChIJexample123",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Goog-Api-Key": "test-key-123",
          "X-Goog-FieldMask": "photos,googleMapsUri",
        }),
        next: { revalidate: 604800 },
      }),
    );
  });

  it("returns googleMapsUri and a null photo when photos is empty", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ photos: [], googleMapsUri: "https://maps.google.com/?cid=123" }),
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result).toEqual({ photo: null, googleMapsUri: "https://maps.google.com/?cid=123" });
  });

  it("builds the correct mediaUrl and attribution from the first photo", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        photos: [
          {
            name: "places/ChIJexample123/photos/abc123",
            widthPx: 4032,
            heightPx: 3024,
            authorAttributions: [{ displayName: "Jean D." }],
          },
        ],
        googleMapsUri: "https://maps.google.com/?cid=123",
      }),
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result?.photo).toEqual({
      mediaUrl:
        "https://places.googleapis.com/v1/places/ChIJexample123/photos/abc123/media?key=test-key-123&maxWidthPx=1200",
      attribution: "Jean D.",
    });
  });

  it("returns null attribution when authorAttributions is empty", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        photos: [
          {
            name: "places/ChIJexample123/photos/abc123",
            authorAttributions: [],
          },
        ],
        googleMapsUri: null,
      }),
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result?.photo?.attribution).toBeNull();
  });

  it("returns null when the fetch response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result).toBeNull();
  });

  it("returns null when fetch itself throws (network error)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

```bash
pnpm exec vitest run src/corpus/google-places.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/corpus/google-places.ts`**

```ts
export type GooglePlacePhoto = {
  mediaUrl: string;
  attribution: string | null;
};

export type GooglePlaceDetails = {
  photo: GooglePlacePhoto | null;
  googleMapsUri: string | null;
};

type PlaceDetailsResponse = {
  photos?: {
    name: string;
    authorAttributions?: { displayName?: string }[];
  }[];
  googleMapsUri?: string;
};

export async function getGooglePlaceDetails(
  googlePlaceId: string | null,
): Promise<GooglePlaceDetails | null> {
  if (!googlePlaceId) return null;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? "";

  let response: Response;
  try {
    response = await fetch(
      `https://places.googleapis.com/v1/places/${googlePlaceId}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "photos,googleMapsUri",
        },
        next: { revalidate: 604800 },
      },
    );
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const data = (await response.json()) as PlaceDetailsResponse;
  const firstPhoto = data.photos?.[0];

  const photo: GooglePlacePhoto | null = firstPhoto
    ? {
        mediaUrl: `https://places.googleapis.com/v1/${firstPhoto.name}/media?key=${apiKey}&maxWidthPx=1200`,
        attribution: firstPhoto.authorAttributions?.[0]?.displayName ?? null,
      }
    : null;

  return {
    photo,
    googleMapsUri: data.googleMapsUri ?? null,
  };
}
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pnpm exec vitest run src/corpus/google-places.test.ts
```

- [ ] **Step 5: Add `GOOGLE_PLACES_API_KEY` to `.env.dist`**

Confirm whether this line already exists (it may have been added during an earlier design-discussion pass in this session — check before duplicating):

```bash
grep -n "GOOGLE_PLACES_API_KEY" .env.dist
```

If absent, append: `GOOGLE_PLACES_API_KEY=<your-google-places-api-key>` (matching the existing placeholder style of `GEMINI_API_KEY` in the same file).

- [ ] **Step 6: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/corpus/google-places.ts src/corpus/google-places.test.ts .env.dist
git commit -m "Add getGooglePlaceDetails: cached Google Places Photo + Maps-link lookup"
```

---

### Task 4: `app/places/[slug]/photo/route.ts` — photo redirect route

**Files:**
- Create: `app/places/[slug]/photo/route.ts`
- Test: `app/places/[slug]/photo/route.test.ts`

**Interfaces:**
- Consumes: `getGooglePlaceDetails` (Task 3), `getPlaceBySlug` (existing, from `src/corpus/queries.ts` — reuse to resolve slug → `googlePlaceId`; do not add a new query function for this single lookup).
- Produces: `GET` handler at `/places/[slug]/photo`, consumed by the `<img src>` in Tasks 6/7.

Note: this route lives at `app/places/[slug]/photo/route.ts`, a **sibling** of the existing `app/(public)/places/[slug]/page.tsx` — route groups like `(public)` don't affect the URL, so `/places/[slug]/photo` and `/places/[slug]` (served from inside the `(public)` group) resolve to the same URL segment tree without conflict. Do not place this file inside the `(public)` route group; Route Handlers and the group's shared layout/footer are unrelated concerns and the photo route should not render the public layout.

- [ ] **Step 1: Write the failing tests**

`app/places/[slug]/photo/route.test.ts`, `vi.hoisted()` convention mocking `getPlaceBySlug` and `getGooglePlaceDetails`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { getPlaceBySlugMock, getGooglePlaceDetailsMock } = vi.hoisted(() => ({
  getPlaceBySlugMock: vi.fn(),
  getGooglePlaceDetailsMock: vi.fn(),
}));

vi.mock("@/src/corpus/queries", () => ({
  getPlaceBySlug: getPlaceBySlugMock,
}));

vi.mock("@/src/corpus/google-places", () => ({
  getGooglePlaceDetails: getGooglePlaceDetailsMock,
}));

import { GET } from "./route";

beforeEach(() => {
  getPlaceBySlugMock.mockReset();
  getGooglePlaceDetailsMock.mockReset();
});

function makeContext(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("GET /places/[slug]/photo", () => {
  it("redirects to the photo mediaUrl when a photo exists", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: "ChIJexample" });
    getGooglePlaceDetailsMock.mockResolvedValue({
      photo: { mediaUrl: "https://places.googleapis.com/v1/places/ChIJexample/photos/abc/media?key=x&maxWidthPx=1200", attribution: null },
      googleMapsUri: null,
    });

    const response = await GET(new Request("http://localhost/places/port-d-alon/photo"), makeContext("port-d-alon"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://places.googleapis.com/v1/places/ChIJexample/photos/abc/media?key=x&maxWidthPx=1200",
    );
  });

  it("returns 404 when the place has no photo", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: "ChIJexample" });
    getGooglePlaceDetailsMock.mockResolvedValue({ photo: null, googleMapsUri: null });

    const response = await GET(new Request("http://localhost/places/port-d-alon/photo"), makeContext("port-d-alon"));

    expect(response.status).toBe(404);
  });

  it("returns 404 when the place doesn't exist", async () => {
    getPlaceBySlugMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/places/does-not-exist/photo"), makeContext("does-not-exist"));

    expect(response.status).toBe(404);
    expect(getGooglePlaceDetailsMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the place has no googlePlaceId", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: null });
    getGooglePlaceDetailsMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/places/port-d-alon/photo"), makeContext("port-d-alon"));

    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

```bash
pnpm exec vitest run "app/places/[slug]/photo/route.test.ts"
```

- [ ] **Step 3: Implement the route**

```ts
import { getPlaceBySlug } from "@/src/corpus/queries";
import { getGooglePlaceDetails } from "@/src/corpus/google-places";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) {
    return new Response(null, { status: 404 });
  }

  const details = await getGooglePlaceDetails(place.googlePlaceId);

  if (!details?.photo) {
    return new Response(null, { status: 404 });
  }

  return Response.redirect(details.photo.mediaUrl, 307);
}
```

Note: `getPlaceBySlug` currently filters `status: "ACTIVE"` (see `src/corpus/queries.ts`) — this means the photo route will correctly 404 for a non-ACTIVE place too, matching the fact that `/places/[slug]` itself 404s for the same places (`notFound()` in the page). This is intentional consistency, not a gap — verify this behavior holds rather than "fixing" it to bypass the ACTIVE filter.

- [ ] **Step 4: Run tests, confirm pass**

```bash
pnpm exec vitest run "app/places/[slug]/photo/route.test.ts"
```

- [ ] **Step 5: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/places
git commit -m "Add /places/[slug]/photo redirect route"
```

---

### Task 5: `PlaceCard` redesign — "Spécimen de terrain" + status bug fix

**Files:**
- Modify: `src/components/PlaceCard.tsx`
- Modify: `app/(public)/places/page.tsx`

**Interfaces:**
- Consumes: `getGooglePlaceDetails` (Task 3), `resolvePlaceStatus` (existing).
- Produces: `PlaceCard` now takes an additional required prop; the index page passes it.

`PlaceCard` currently takes only `{ place }`. Since it now needs each place's resolved status and Google photo details — both async, both requiring a DB/network call — and a grid of cards each independently awaiting two calls would be slow and easy to get wrong (e.g. an accidental waterfall), **the index page fetches both in parallel for all places first**, then passes the results down as plain props. `PlaceCard` itself stays a simple, fully synchronous presentational component.

- [ ] **Step 1: Rewrite `app/(public)/places/page.tsx`**

```tsx
import type { Metadata } from "next";
import { getActivePlaces, resolvePlaceStatus } from "@/src/corpus/queries";
import { getGooglePlaceDetails } from "@/src/corpus/google-places";
import { PlaceCard } from "@/src/components/PlaceCard";

export const metadata: Metadata = {
  title: "Les lieux — Nature Concierge",
  description:
    "Calanques, plages, massifs et sentiers entre Marseille et Bandol, avec leur statut du jour.",
};

export default async function PlacesIndexPage() {
  const places = await getActivePlaces();

  const cards = await Promise.all(
    places.map(async (place) => {
      const [status, googleDetails] = await Promise.all([
        resolvePlaceStatus(place.id),
        getGooglePlaceDetails(place.googlePlaceId),
      ]);
      return { place, status, photo: googleDetails?.photo ?? null };
    }),
  );

  return (
    <main className="mx-auto flex max-w-[1040px] flex-col gap-6 px-4 py-12">
      <p className="text-sm text-encre/70">
        Couverture actuelle : littoral Marseille–Bandol et Sainte-Baume.
        D&apos;autres lieux arrivent.
      </p>
      <h1 className="font-display text-3xl">Les lieux</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ place, status, photo }) => (
          <PlaceCard key={place.id} place={place} status={status} photo={photo} />
        ))}
      </div>
    </main>
  );
}
```

(The mockup's `.grid-a` used `gap: 24px` — `gap-6` in Tailwind's default scale is `1.5rem` = 24px, matching exactly; the prior implementation used `gap-4`, this is a deliberate widening to match the approved mockup.)

- [ ] **Step 2: Rewrite `src/components/PlaceCard.tsx`**

Translate the mockup's `.specimen-card` structure exactly. Note: the mockup used a floating status pill with `backdrop-filter: blur` and `color-mix()` — Tailwind v4 supports arbitrary values for both; use them directly rather than approximating with a solid opaque background, to preserve the intended translucent-over-photo look.

```tsx
import Link from "next/link";
import type { Place } from "../../prisma/generated/client";
import type { ResolvedStatus } from "../corpus/queries";
import type { GooglePlacePhoto } from "../corpus/google-places";

const TYPE_LABELS: Record<Place["type"], string> = {
  CALANQUE: "Calanque",
  PLAGE: "Plage",
  MASSIF: "Massif",
  SENTIER: "Sentier",
  SOMMET: "Sommet",
  SITE: "Site",
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  ACCESS: "Accès",
  CROWDING: "Affluence",
  SUITABILITY: "Pour qui",
  TIP: "Astuce",
  AVOID: "À éviter",
  ALTERNATIVE: "Alternative",
  DECODING: "Décryptage",
};

function StatusPill({ status }: { status: ResolvedStatus }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-statut-inconnu/60 bg-calcaire/85 px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-wide text-statut-inconnu backdrop-blur-sm">
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        Non vérifié
      </span>
    );
  }

  const colorClass = !status.isOpen
    ? "text-statut-rouge bg-statut-rouge/15"
    : status.restricted
      ? "text-statut-orange bg-statut-orange/15"
      : "text-statut-vert bg-statut-vert/15";

  const label = !status.isOpen
    ? "Fermé"
    : status.restricted
      ? "Ouvert — restreint"
      : "Ouvert";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-wide backdrop-blur-sm ${colorClass}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function PlaceCard({
  place,
  status,
  photo,
}: {
  place: Place;
  status: ResolvedStatus;
  photo: GooglePlacePhoto | null;
}) {
  const hookClaim = null as
    | { claimType: string; claimText: string }
    | null; // see note below — Task 5 does not add a hook-claim query; left null for now.

  return (
    <Link
      href={`/places/${place.slug}`}
      className="block overflow-hidden rounded-[14px] border border-sable/45 bg-calcaire transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-mediterranee hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
    >
      <div
        className="relative flex aspect-[4/3] items-end bg-calcaire-deep p-3.5"
        style={
          !photo
            ? {
                backgroundImage:
                  "repeating-linear-gradient(135deg, transparent, transparent 12px, color-mix(in srgb, var(--pin) 6%, transparent) 12px, color-mix(in srgb, var(--pin) 6%, transparent) 13px)",
              }
            : undefined
        }
      >
        {photo && (
          <img
            src={`/places/${place.slug}/photo`}
            alt=""
            width={800}
            height={600}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {photo && (
          <div className="absolute inset-0 bg-gradient-to-t from-encre/30 to-transparent to-55%" />
        )}
        <span className="relative rounded-full border border-sable/50 bg-calcaire/90 px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide text-pin">
          {TYPE_LABELS[place.type]}
        </span>
        <div className="absolute top-3 right-3">
          <StatusPill status={status} />
        </div>
      </div>

      <div className="p-4.5">
        <h2 className="font-display text-xl leading-tight">{place.name}</h2>
        <p className="mt-1 text-sm text-encre/70">
          {place.commune} · {place.departement}
        </p>
        {hookClaim && (
          <p className="mt-3 flex gap-2 border-t border-sable/35 pt-3 text-sm text-encre/80">
            <span className="shrink-0 pt-0.5 font-mono text-[0.65rem] uppercase tracking-wide text-pin">
              {CLAIM_TYPE_LABELS[hookClaim.claimType]}
            </span>
            {hookClaim.claimText}
          </p>
        )}
      </div>
    </Link>
  );
}
```

**Note on `hookClaim`**: the mockup shows one representative claim under a divider on each card. Fetching this correctly (one public, published claim per place, alongside status and photo, across a whole grid) is a real query-shape decision — not just "add a field" — and the plan's Global Constraints don't currently define it. Leave `hookClaim` as `null` (divider/claim line simply doesn't render, matching the component's existing `{hookClaim && (...)}` guard) for this task. If a hook-claim query is wanted, it should be a follow-up task decided explicitly rather than guessed here — flag this in your task report rather than inventing a query shape.

- [ ] **Step 3: Write/update `src/components/PlaceCard.test.tsx`** (new — this component has no existing test file; check first)

```bash
find src/components -iname "PlaceCard.test.*"
```

If absent, this is a presentational component consuming plain props (no I/O) — per this project's established pattern of not adding new test infrastructure for untested presentational components (see the zone-status-model plan's Task 4 precedent for `StatusBlock`/`StatusChip`), **do not add a new test file**. If a test file already exists, update it to match the new prop shape and keep it passing.

- [ ] **Step 4: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 5: Run full suite**

```bash
pnpm exec vitest run
```

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/places/page.tsx" src/components/PlaceCard.tsx
git commit -m "Redesign PlaceCard to Specimen de terrain layout; fix hardcoded null status bug"
```

---

### Task 6: `/places/[slug]` detail page — hero, relevé, sidebar redesign

**Files:**
- Modify: `app/(public)/places/[slug]/page.tsx`
- Modify: `src/components/StatusBlock.tsx`
- Modify: `src/components/ClaimList.tsx`
- Modify: `src/components/ClaimItem.tsx`
- Modify: `src/components/WhatsAppCTA.tsx`
- Modify: `src/components/AlternativeCallout.tsx`

**Interfaces:**
- Consumes: `getGooglePlaceDetails` (Task 3), everything else existing/unchanged (`resolvePlaceStatus`, `getPlaceBySlug`, `Dateline`).
- Produces: no new exports — all five components keep their existing prop signatures except `StatusBlock` and `ClaimList`, which need one addition each (see below).

- [ ] **Step 1: Rewrite `app/(public)/places/[slug]/page.tsx`**

Keep `generateStaticParams`, `generateMetadata`, `jsonLd`, and the `revalidate = 900` export exactly as they are — this task changes only the returned JSX structure and adds the Google Places fetch.

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getActivePlaces,
  getPlaceBySlug,
  resolvePlaceStatus,
} from "@/src/corpus/queries";
import { getGooglePlaceDetails } from "@/src/corpus/google-places";
import { StatusBlock } from "@/src/components/StatusBlock";
import { ClaimList } from "@/src/components/ClaimList";
import { WhatsAppCTA } from "@/src/components/WhatsAppCTA";
import { AlternativeCallout } from "@/src/components/AlternativeCallout";

export const revalidate = 900;

// ...generateStaticParams and generateMetadata unchanged...

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) notFound();

  const [status, googleDetails] = await Promise.all([
    resolvePlaceStatus(place.id),
    getGooglePlaceDetails(place.googlePlaceId),
  ]);

  // ...jsonLd unchanged...

  return (
    <main className="mx-auto max-w-[1100px] px-4 pt-7 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="font-mono text-xs tracking-wide text-encre/60">
        <Link href="/places" className="underline decoration-dotted underline-offset-2">
          ← Les lieux
        </Link>
      </p>

      <div className="mt-5 grid grid-cols-1 items-end gap-10 md:grid-cols-[1.15fr_0.85fr]">
        <div
          className="relative flex aspect-[16/10] items-end overflow-hidden rounded-2xl border border-sable/40 bg-calcaire-deep p-5"
          style={
            !googleDetails?.photo
              ? {
                  backgroundImage:
                    "repeating-linear-gradient(135deg, transparent, transparent 14px, color-mix(in srgb, var(--pin) 7%, transparent) 14px, color-mix(in srgb, var(--pin) 7%, transparent) 15px)",
                }
              : undefined
          }
        >
          {googleDetails?.photo && (
            <>
              <img
                src={`/places/${place.slug}/photo`}
                alt=""
                width={1200}
                height={750}
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-encre/35 to-transparent to-60%" />
              {googleDetails.photo.attribution && (
                <span className="absolute right-3 bottom-3 rounded bg-encre/50 px-2 py-0.5 font-mono text-[0.65rem] text-calcaire">
                  Photo : {googleDetails.photo.attribution}
                </span>
              )}
            </>
          )}
          {!googleDetails?.photo && (
            <span className="relative font-mono text-xs tracking-wide text-calcaire/90 uppercase">
              {place.type} · photo à venir
            </span>
          )}
        </div>

        <div className="pb-1">
          <p className="mb-2.5 flex items-center gap-2 font-mono text-xs tracking-wide text-pin uppercase before:size-1.25 before:rounded-full before:bg-pin before:content-['']">
            {place.commune} · {place.departement}
          </p>
          <h1 className="font-display text-4xl leading-[1.05] text-balance">
            {place.name}
          </h1>
          {place.description && (
            <p className="mt-2.5 max-w-[52ch] text-encre/80">{place.description}</p>
          )}
        </div>
      </div>

      <div className="mt-9">
        <StatusBlock
          status={status}
          officialInfoUrl={place.officialInfoUrl}
          googleMapsUri={googleDetails?.googleMapsUri ?? null}
        />
      </div>

      <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-[1fr_320px]">
        <ClaimList claims={place.claims} />

        <aside>
          <WhatsAppCTA placeName={place.name} />
          <AlternativeCallout claims={place.claims} />
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Rewrite `StatusBlock.tsx`** — add the `googleMapsUri` prop, restructure to the relevé panel

```tsx
import { Dateline } from "./Dateline";
import type { ResolvedStatus } from "../corpus/queries";

const ACTIVE_FIRE_CAVEAT =
  "En cas de fumée ou de consignes des secours sur place, suivez-les même si la carte indique autre chose.";

export function StatusBlock({
  status,
  officialInfoUrl,
  googleMapsUri,
}: {
  status: ResolvedStatus;
  officialInfoUrl: string | null;
  googleMapsUri?: string | null;
}) {
  if (!status) {
    return (
      <section
        aria-label="Statut du jour"
        className="rounded-xl border border-dashed border-statut-inconnu bg-calcaire-deep p-5"
      >
        <p className="font-mono text-statut-inconnu">
          Données non vérifiées aujourd&apos;hui — consultez la carte
          officielle{" "}
          {officialInfoUrl && (
            <a href={officialInfoUrl} className="underline">
              ↗
            </a>
          )}
        </p>
      </section>
    );
  }

  const colorClass = !status.isOpen
    ? "text-statut-rouge border-l-statut-rouge"
    : status.restricted || status.displayValue === "orange" || status.displayValue === "jaune"
      ? "text-statut-orange border-l-statut-orange"
      : "text-statut-vert border-l-statut-vert";

  const showCaveat = ["orange", "rouge", "extreme"].includes(status.displayValue);

  const verdict = !status.isOpen
    ? "Fermé"
    : status.restricted
      ? "Ouvert — accès restreint"
      : "Ouvert";

  return (
    <section
      aria-label="Statut du jour"
      className={`grid grid-cols-1 items-center gap-5 rounded-xl border border-sable/45 border-l-[3px] bg-calcaire-deep p-5 sm:grid-cols-[auto_1fr_auto] sm:gap-6 ${colorClass}`}
    >
      <div className="border-b border-sable/30 pb-3 text-center font-mono sm:border-r sm:border-b-0 sm:pr-6 sm:pb-0">
        <span className="block text-[0.7rem] font-semibold tracking-wide uppercase">
          {verdict}
        </span>
        <span className="mt-0.5 block text-2xl font-semibold uppercase">
          {status.displayValue}
        </span>
      </div>

      <div>
        {status.detail && <p className="text-[0.95rem] text-encre">{status.detail}</p>}
        {showCaveat && (
          <p className="mt-2 text-sm text-encre/70 italic">{ACTIVE_FIRE_CAVEAT}</p>
        )}
      </div>

      <div className="font-mono text-xs whitespace-nowrap text-encre/60">
        <Dateline checkedAt={status.confirmedAt} />
        <br />
        Source officielle : {status.provider}
        {officialInfoUrl && (
          <>
            {" "}
            <a href={officialInfoUrl} className="text-mediterranee underline">
              ↗
            </a>
          </>
        )}
        {googleMapsUri && (
          <>
            <br />
            <a href={googleMapsUri} className="text-mediterranee underline">
              Voir sur Google Maps ↗
            </a>
          </>
        )}
      </div>
    </section>
  );
}
```

**Note**: the mockup's `.releve-stamp` showed only the level word ("Rouge"), not the raw `status.displayValue` twice — but the existing component's contract already distinguishes `verdict` (open/closed wording) from `status.displayValue` (the raw zone level like "rouge"/"extreme"), and both must stay visible per this plan's Global Constraint on color-independence and per the existing zone-status-model plan's explicit fix for exactly this (a prior final-review finding added the `verdict` line specifically so status isn't color-only — do not remove or merge it with `displayValue`, they answer different questions: "is it open" vs. "what's the official level").

- [ ] **Step 3: Rewrite `ClaimList.tsx`** — group by `claimType`, quiet divider label

```tsx
import type { Claim } from "../../prisma/generated/client";

const THEME_LABELS: Record<Claim["claimType"], string> = {
  ACCESS: "Accès",
  CROWDING: "Affluence",
  SUITABILITY: "Pour qui",
  TIP: "Astuce",
  AVOID: "À éviter",
  ALTERNATIVE: "Alternative",
  DECODING: "Décryptage",
};

export function ClaimList({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) return null;

  const grouped = new Map<Claim["claimType"], Claim[]>();
  for (const claim of claims) {
    const bucket = grouped.get(claim.claimType) ?? [];
    bucket.push(claim);
    grouped.set(claim.claimType, bucket);
  }

  return (
    <section aria-label="Le conseil du guide">
      <h2 className="font-display text-2xl">Le conseil du guide</h2>
      <div className="mt-5 flex flex-col gap-6">
        {Array.from(grouped.entries()).map(([claimType, themeClaims]) => (
          <div key={claimType}>
            <p className="mb-2.5 flex items-center gap-2 font-mono text-[0.7rem] tracking-wide text-pin uppercase after:h-px after:flex-1 after:bg-sable/35 after:content-['']">
              {THEME_LABELS[claimType]}
            </p>
            <div className="flex flex-col gap-3">
              {themeClaims.map((claim) => (
                <ClaimItemBare key={claim.id} claim={claim} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClaimItemBare({ claim }: { claim: Claim }) {
  return (
    <p className="border-l-2 border-sable/35 pl-4 leading-relaxed">
      {claim.claimText}
    </p>
  );
}
```

**Note**: this inlines a bare claim renderer (`ClaimItemBare`) instead of using the existing `ClaimItem` component, because the redesign's grouped-by-theme layout puts the theme label once per *group* (as a section header), not once per *claim* the way `ClaimItem`'s inline pill currently does — the two components solve visually different layouts, not the same layout restyled. Given this, Step 4 below deletes `ClaimItem.tsx` rather than leaving an now-orphaned, unused component — check first whether anything else imports it.

- [ ] **Step 4: Check for other consumers of `ClaimItem`, then delete it if unused**

```bash
grep -rln "ClaimItem" app src --include="*.tsx" --include="*.ts" | grep -v node_modules
```

If the only matches are `ClaimList.tsx`'s own (now-removed) import and the component file itself, delete `src/components/ClaimItem.tsx`. If anything else imports it, stop and report rather than deleting — leave it and note the finding in your report instead.

- [ ] **Step 5: Rewrite `WhatsAppCTA.tsx`** — sticky sidebar card

```tsx
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

if (!WHATSAPP_NUMBER) {
  console.warn(
    "WhatsAppCTA: NEXT_PUBLIC_WHATSAPP_NUMBER is not set — the WhatsApp link will be broken.",
  );
}

export function WhatsAppCTA({ placeName }: { placeName: string }) {
  const message = `Bonjour ! Je cherche une idée de sortie nature. À propos de ${placeName} : `;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  // TODO(07-measurement): fire whatsapp_click { slug } analytics event on click.

  return (
    <div className="sticky top-6 rounded-2xl bg-mediterranee p-6 text-calcaire">
      <h3 className="font-display text-xl leading-snug">
        Besoin d&apos;un plan sur mesure ?
      </h3>
      <p className="mt-2.5 text-sm text-calcaire/85">
        Enfants, chien, mistral, plan B si ça sature — écrivez-moi, gratuit.
      </p>
      <a
        href={href}
        className="mt-4.5 flex items-center justify-center gap-2 rounded-[10px] bg-calcaire px-5 py-3.5 font-semibold text-mediterranee-deep"
      >
        Écrire sur WhatsApp
      </a>
    </div>
  );
}
```

Check `app/globals.css` for whether `--mediterranee-deep`/`text-mediterranee-deep` already exists as a token (it does not, per the current file read earlier in this plan's research) — **add it** alongside the existing `--mediterranee` definition, with a dark-mode-safe value, mirroring the exact contrast bug fix already worked out and verified in this session's mockup. Do this as part of this step, not a separate task, since `WhatsAppCTA` is the only consumer.

Add to `app/globals.css`, in the `:root` block near the existing `--mediterranee` line:
```css
--mediterranee-deep: #0A343F;
```
And register it in the `@theme inline` block alongside the existing `--color-mediterranee` line:
```css
--color-mediterranee-deep: var(--mediterranee-deep);
```

This app's `globals.css` has no dark-mode media query or `data-theme` handling today (confirmed: no `prefers-color-scheme`/`dark`/`data-theme` anywhere in the file) — the mockup's dark-mode token handling was scoped to the standalone mockup file only and does not reflect this app's real state. Add only the single light-mode-appropriate value above; do not invent a dark-mode block that doesn't correspond to any other token in this file.

- [ ] **Step 6: Rewrite `AlternativeCallout.tsx`** — small side card

```tsx
import Link from "next/link";
import type { Claim, Place } from "../../prisma/generated/client";

export function AlternativeCallout({
  claims,
}: {
  claims: (Claim & { alternativePlace: Pick<Place, "slug" | "name"> | null })[];
}) {
  const alternatives = claims.filter(
    (c) => c.verdict === "ALTERNATIVE" && c.alternativePlace,
  );

  if (alternatives.length === 0) return null;

  return (
    <section aria-label="Alternatives" className="mt-5 flex flex-col gap-2 rounded-[10px] border border-sable/40 bg-calcaire-deep p-4 text-sm">
      {alternatives.map((claim) => (
        <p key={claim.id}>
          Si c&apos;est fermé ou saturé →{" "}
          <Link
            href={`/places/${claim.alternativePlace!.slug}`}
            className="font-semibold text-mediterranee underline"
          >
            {claim.alternativePlace!.name}
          </Link>
        </p>
      ))}
    </section>
  );
}
```

- [ ] **Step 7: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 8: Run full suite**

```bash
pnpm exec vitest run
```

- [ ] **Step 9: Commit**

```bash
git add "app/(public)/places/[slug]/page.tsx" src/components/StatusBlock.tsx src/components/ClaimList.tsx src/components/WhatsAppCTA.tsx src/components/AlternativeCallout.tsx app/globals.css
git rm src/components/ClaimItem.tsx  # only if Step 4 confirmed it's unused elsewhere
git commit -m "Redesign place detail page: hero, releve du jour panel, grouped claims, sidebar CTA"
```

---

### Task 7: Whole-branch review checklist (for the final reviewer, not a task to implement)

Before finishing this plan, the final whole-branch review should specifically verify:

- `GOOGLE_PLACES_API_KEY` never appears in any client-bundled code path — grep for it outside `src/corpus/google-places.ts` and the route handler; confirm neither file has `"use client"` anywhere in its own directive or (transitively) is imported by a client component.
- The photo `name`/reference is never persisted anywhere (no new Prisma writes touch it, no file/log/cache beyond the `fetch` `next.revalidate` window) — re-confirm this wasn't quietly reintroduced during implementation.
- Status is still conveyed via text + color together everywhere it's rendered (`PlaceCard`'s pill, `StatusBlock`'s stamp) — never color alone, on both the grid and detail redesigns.
- `resolvePlaceStatus`/`ResolvedStatus`/`Dateline`/the ZAPEF cascade logic itself is byte-identical to before this plan — `git diff` on `src/corpus/queries.ts` and `src/components/Dateline.tsx` should show zero changes; only their *callers'* rendering changed.
- No new client components (`"use client"`) were introduced anywhere in this plan's file list, per the plan's explicit constraint.
- The `PlaceCard.hookClaim` gap (left `null`, per Task 5's note) is either accepted as-is or explicitly flagged as a follow-up — not silently "fixed" mid-review with an improvised query shape that wasn't reviewed.
- Both `/places` and `/places/[slug]` still render a sensible page when a place has `googlePlaceId: null` (the common case for every existing seeded place today, since this field is brand new and nothing has been backfilled) — confirm the fallback panel path was actually exercised by a test or manual check, not just the has-a-photo path.
