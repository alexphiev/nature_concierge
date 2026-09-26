# Place Photo Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins upload place photos to Neon Object Storage; those photos come first everywhere a place photo is shown, with Google Places photos only filling the gallery up to 5.

**Architecture:** A small S3 module (`src/storage/place-photos.ts`) talks to the `public_read` bucket `place-photos`. A `PlacePhoto` table stores object keys + credit + order. The admin form compresses large photos in the browser (`browser-image-compression`) and uploads them one per server-action call after the place is saved. Public pages turn uploaded photos + Google fallbacks into a single `DisplayPhoto` list (`src/corpus/place-photos.ts`) rendered by one `PhotoImage` component (`next/image` for uploads, plain `<img>` for the Google redirect route).

**Tech Stack:** Next.js 16.2 (App Router, Cache Components, `"use cache"`), React 19.2, Prisma 7.9 (`prisma-client` generator → `prisma/generated`), `@aws-sdk/client-s3` v3 (already installed), Vitest 4, Tailwind 4, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-26-place-photo-uploads-design.md`

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (AGENTS.md: "This is NOT the Next.js you know"). `next/image`: `01-app/03-api-reference/02-components/image.md` — in v16 use `preload`, not the deprecated `priority`.
- Bucket name: `place-photos` (`public_read`, already created). Env vars: `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (already in `.env.local`).
- S3 client: `new S3Client({ forcePathStyle: true, requestChecksumCalculation: "WHEN_REQUIRED" })`.
- Accepted types: `image/jpeg`, `image/png`, `image/webp` (shared in `src/storage/photo-types.ts`).
- Object key format: `places/{placeId}/{randomUUID()}.{jpg|png|webp}`. Keys are never reused.
- Object headers: `ContentType` = the file's type, `CacheControl: "public, max-age=31536000, immutable"`.
- Public URL: `${AWS_ENDPOINT_URL_S3}/place-photos/${key}`. The DB stores the key, never the URL.
- `MIN_GALLERY_PHOTOS = 5`. Uploaded photos first; Google photos only while total < 5.
- Browser compression only for files > 1.5 MB: `browser-image-compression` with `{ maxSizeMB: 1.5, maxWidthOrHeight: 2400, useWebWorker: true }` (keeps the file type, handles EXIF orientation). Files ≤ 1.5 MB are uploaded untouched. Server accepts the 3 types ≤ 4 MB (`MAX_PHOTO_BYTES`; Vercel rejects request bodies > 4.5 MB).
- Every photo mutation calls `updateTag("corpus")`.
- UI copy is French. Don't add comments that just describe code (user CLAUDE.md).
- `PlaceImage` ("Images pratiques") is not touched.
- The OG image (`app/(public)/lieux/[slug]/opengraph-image.tsx`) is not touched.
- **No new tests** (user: "this is just a mock, no tests needed"). Only adjust existing assertions that break because of changed behavior, so `pnpm test` stays green.
- No Playwright/browser automation. Verification = `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, plus manual steps for the user.

## Review Focus

1. **Partial upload failure, then save again (edit page)** — photos that did upload must not be uploaded twice nor deleted by the next `updatePlace`. `uploadPlacePhoto` returns `{ id, src }` and the form turns that pending item into a saved one (with a `photoIds` hidden input) immediately. Tasks 3 + 4.
2. **Save fails on validation (e.g. parent is itself a spot)** — the admin's typed values must survive. The form uses `onSubmit` + `preventDefault` (no React form-action auto-reset) and shows the error. Task 4.
3. **Unsupported or unreadable picked file (HEIC, PDF renamed .jpg, huge PNG still > 4 MB after compression)** — show a per-file message and keep processing the others. Task 4.
4. **A `photoIds` value belonging to another place** — must not be modified. `updatePlace` updates with `where: { id, placeId }`. Task 3.
5. **Missing `AWS_ENDPOINT_URL_S3` in an environment** — fail loudly with a clear message instead of rendering `undefined/place-photos/...`. Task 1.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/storage/place-photos.ts` | create | S3 client, key/URL helpers, put/delete objects |
| `prisma/schema.prisma` | modify | `PlacePhoto` model, `Place.photos` |
| `prisma/migrations/<ts>_place_photos/migration.sql` | create (generated) | migration |
| `next.config.ts` | modify | `images.remotePatterns` |
| `.env.dist` | modify | document `AWS_*` vars |
| `src/corpus/place-photos.ts` | create | `DisplayPhoto`, `buildGallerySlides`, `resolveCoverPhoto` |
| `src/corpus/queries.ts` | modify | include photos in `getActivePlaces` / `getPlaceBySlug` |
| `src/corpus/queries.test.ts` | modify | updated `findMany` expectation |
| `app/admin/places/actions.ts` | modify | `uploadPlacePhoto`; create/update return `{ id }`; photo edits |
| `app/admin/places/actions.test.ts` | modify | existing assertions only (mocks + return value) |
| `src/storage/photo-types.ts` | create | accepted types, extensions, size cap (no deps; shared client/server) |
| `app/admin/places/compress-photo.ts` | create | browser-side compression of large files |
| `app/admin/places/PlacePhotoFields.tsx` | create | controlled photo list UI |
| `app/admin/places/PlaceForm.tsx` | modify | becomes client component; save-then-upload flow |
| `app/admin/places/[id]/page.tsx` | modify | pass photos, show upload-failure banner |
| `src/components/PhotoImage.tsx` | create | renders a `DisplayPhoto` |
| `src/components/PhotoCarousel.tsx` | modify | iterate `DisplayPhoto[]` |
| `src/components/PlaceGallery.tsx` | modify | slides + tiles with covers |
| `src/components/PlaceCard.tsx`, `src/components/SpotCard.tsx` | modify | `cover: DisplayPhoto \| null` |
| `src/components/landing/GuideSection.tsx`, `src/components/landing/Hero.tsx` | modify | `cover` instead of Google photo |
| `app/(public)/lieux/[slug]/page.tsx`, `app/(public)/lieux/page.tsx`, `app/(landing)/page.tsx` | modify | compute slides/covers |

---

### Task 1: Storage foundation (S3 module, schema, config)

**Files:**
- Create: `src/storage/photo-types.ts`, `src/storage/place-photos.ts`
- Modify: `prisma/schema.prisma`, `next.config.ts`, `.env.dist`
- Create (generated): `prisma/migrations/<timestamp>_place_photos/migration.sql`
- Commit also: `package.json`, `pnpm-lock.yaml` (already modified by the user's `pnpm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner dotenv`)

**Interfaces:**
- Produces:
  - from `src/storage/photo-types.ts`: `type PlacePhotoType = "image/jpeg" | "image/png" | "image/webp"`, `isPlacePhotoType(type: string): type is PlacePhotoType`, `PLACE_PHOTO_TYPES: PlacePhotoType[]`, `MAX_PHOTO_BYTES = 4 * 1024 * 1024`
  - `PLACE_PHOTOS_BUCKET: "place-photos"`
  - `placePhotoKey(placeId: string, type: PlacePhotoType): string`
  - `placePhotoUrl(key: string): string` (throws if `AWS_ENDPOINT_URL_S3` unset)
  - `putPlacePhoto(key: string, body: Uint8Array, contentType: PlacePhotoType): Promise<void>`
  - `deletePlacePhotos(keys: string[]): Promise<void>`
  - Prisma model `PlacePhoto { id, placeId, key, credit: string | null, order: number, createdAt }`, `prisma.placePhoto`, `Place.photos`.

- [ ] **Step 1: Shared photo types** — `src/storage/photo-types.ts` (no imports: it is also used by client code)

```ts
const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type PlacePhotoType = keyof typeof EXTENSIONS;

export const PLACE_PHOTO_TYPES = Object.keys(EXTENSIONS) as PlacePhotoType[];

// Must stay below Vercel's 4.5 MB request body limit.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export function isPlacePhotoType(type: string): type is PlacePhotoType {
  return Object.hasOwn(EXTENSIONS, type);
}

export function photoExtension(type: PlacePhotoType): string {
  return EXTENSIONS[type];
}
```

- [ ] **Step 2: Implement** — `src/storage/place-photos.ts`

```ts
import { randomUUID } from "node:crypto";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { photoExtension, type PlacePhotoType } from "./photo-types";

export const PLACE_PHOTOS_BUCKET = "place-photos";

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

let client: S3Client | undefined;

// Lazy so importing this module (tests, build, pages without uploads) never
// needs the AWS_* env vars. The SDK reads AWS_ENDPOINT_URL_S3, AWS_REGION and
// the access keys from the environment itself.
function s3(): S3Client {
  client ??= new S3Client({
    forcePathStyle: true,
    // Recent SDKs add a default checksum that Neon's S3 endpoint rejects.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return client;
}

export function placePhotoKey(placeId: string, type: PlacePhotoType): string {
  return `places/${placeId}/${randomUUID()}.${photoExtension(type)}`;
}

export function placePhotoUrl(key: string): string {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (!endpoint) throw new Error("AWS_ENDPOINT_URL_S3 is not set: cannot build place photo URLs");
  return `${endpoint}/${PLACE_PHOTOS_BUCKET}/${key}`;
}

export async function putPlacePhoto(
  key: string,
  body: Uint8Array,
  contentType: PlacePhotoType,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: PLACE_PHOTOS_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }),
  );
}

export async function deletePlacePhotos(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await s3().send(
    new DeleteObjectsCommand({
      Bucket: PLACE_PHOTOS_BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}
```

- [ ] **Step 3: Add the Prisma model** — in `prisma/schema.prisma`, add `photos PlacePhoto[]` to `Place` right after `images PlaceImage[]`, and add this model right after the `PlaceImage` model:

```prisma
model PlacePhoto {
  id      String @id @default(cuid())
  placeId String
  place   Place  @relation(fields: [placeId], references: [id], onDelete: Cascade)

  key    String
  credit String?
  order  Int     @default(0)

  createdAt DateTime @default(now())

  @@index([placeId, order])
}
```

- [ ] **Step 4: Create and apply the migration**

Run: `pnpm prisma migrate dev --name place_photos`
Expected: a new folder `prisma/migrations/<timestamp>_place_photos/` whose `migration.sql` creates table `"PlacePhoto"`, index `"PlacePhoto_placeId_order_idx"` and FK with `ON DELETE CASCADE`. If Prisma reports drift or asks to reset the database, **STOP and report** — do not reset.
Then run: `pnpm prisma generate` (Prisma 7 does not always regenerate on migrate).

- [ ] **Step 5: Allow uploaded photos in `next/image`** — `next.config.ts`, add inside `nextConfig` (after `cacheLife`):

```ts
  images: {
    // Neon Object Storage public_read bucket (branch endpoint host varies).
    remotePatterns: [
      { protocol: "https", hostname: "**.aws.neon.tech", pathname: "/place-photos/**" },
    ],
  },
```

- [ ] **Step 6: Document env vars** — append to `.env.dist`:

```
# Neon Object Storage (Console → Connect → Storage, or `neon env pull`). Bucket: place-photos (public_read)
AWS_ENDPOINT_URL_S3=https://<branch-id>.storage.c-<N>.eu-central-1.aws.neon.tech
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=nak_live_...
AWS_SECRET_ACCESS_KEY=nsk_live_...
```

- [ ] **Step 7: Verify**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: existing tests pass, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/storage prisma/schema.prisma prisma/migrations next.config.ts .env.dist package.json pnpm-lock.yaml
git commit -m "feat: Neon Object Storage module and PlacePhoto model"
```

---

### Task 2: Display model (gallery slides, covers, queries)

**Files:**
- Create: `src/corpus/place-photos.ts`
- Modify: `src/corpus/queries.ts`, `src/corpus/queries.test.ts`

**Interfaces:**
- Consumes: `placePhotoUrl(key)` (Task 1); `getGooglePlaceDetails(googlePlaceId)` from `src/corpus/google-places.ts` (returns `{ photo: { photoUri, attribution } | null, photoAttributions: (string | null)[] } | null`).
- Produces:
  - `MIN_GALLERY_PHOTOS = 5`
  - `type DisplayPhoto = { src: string; credit: string | null; uploaded: boolean }`
  - `type UploadedPhoto = { key: string; credit: string | null }`
  - `buildGallerySlides(input: { slug: string; uploaded: UploadedPhoto[]; googleAttributions: (string | null)[] }): DisplayPhoto[]`
  - `resolveCoverPhoto(place: { slug: string; googlePlaceId: string | null; photos: UploadedPhoto[] }): Promise<DisplayPhoto | null>`
  - `type PlaceWithCover = Place & { photos: PlacePhoto[] }` (exported from `queries.ts`; `photos` holds at most the first photo)
  - `getActivePlaces(): Promise<PlaceWithCover[]>`
  - `PlaceWithPublicClaims` gains `photos: PlacePhoto[]` (all, ordered) and `children: PlaceWithCover[]`.

- [ ] **Step 1: Implement** — `src/corpus/place-photos.ts`

```ts
import { placePhotoUrl } from "../storage/place-photos";
import { getGooglePlaceDetails } from "./google-places";

export const MIN_GALLERY_PHOTOS = 5;

// `uploaded` photos are served from Neon Object Storage through next/image;
// the others point at the /lieux/[slug]/photo redirect to Google.
export type DisplayPhoto = { src: string; credit: string | null; uploaded: boolean };

export type UploadedPhoto = { key: string; credit: string | null };

function uploadedPhoto(photo: UploadedPhoto): DisplayPhoto {
  return { src: placePhotoUrl(photo.key), credit: photo.credit, uploaded: true };
}

function googlePhoto(slug: string, index: number, credit: string | null): DisplayPhoto {
  const src = index === 0 ? `/lieux/${slug}/photo` : `/lieux/${slug}/photo?i=${index}`;
  return { src, credit, uploaded: false };
}

export function buildGallerySlides({
  slug,
  uploaded,
  googleAttributions,
}: {
  slug: string;
  uploaded: UploadedPhoto[];
  googleAttributions: (string | null)[];
}): DisplayPhoto[] {
  const slides = uploaded.map(uploadedPhoto);
  const googleCount = Math.min(Math.max(MIN_GALLERY_PHOTOS - slides.length, 0), googleAttributions.length);
  for (let index = 0; index < googleCount; index++) {
    slides.push(googlePhoto(slug, index, googleAttributions[index]));
  }
  return slides;
}

export async function resolveCoverPhoto(place: {
  slug: string;
  googlePlaceId: string | null;
  photos: UploadedPhoto[];
}): Promise<DisplayPhoto | null> {
  if (place.photos[0]) return uploadedPhoto(place.photos[0]);

  const details = await getGooglePlaceDetails(place.googlePlaceId);
  return details?.photo ? googlePhoto(place.slug, 0, details.photo.attribution) : null;
}
```

- [ ] **Step 2: Include photos in queries** — `src/corpus/queries.ts`:

Change the type import to also import `PlacePhoto`:

```ts
import type { Place, Claim, SignalZone, PlaceImage, PlacePhoto } from "../../prisma/generated/client";
```

Replace `getActivePlaces` with:

```ts
// `photos` only holds the cover (first photo), enough for cards.
export type PlaceWithCover = Place & { photos: PlacePhoto[] };

const coverPhotoInclude = { orderBy: { order: "asc" }, take: 1 } as const;

export async function getActivePlaces(): Promise<PlaceWithCover[]> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
  return prisma.place.findMany({
    where: { status: "ACTIVE" },
    orderBy: { demandRank: "asc" },
    include: { photos: coverPhotoInclude },
  });
}
```

In `PlaceWithPublicClaims`, change `children: Place[];` to `children: PlaceWithCover[];` and add `photos: PlacePhoto[];` after `images: PlaceImage[];`. In `getPlaceBySlug`'s `include`, change `children` to:

```ts
      children: {
        where: { status: "ACTIVE" },
        orderBy: { demandRank: "asc" },
        include: { photos: coverPhotoInclude },
      },
```

and add after `images: …`:

```ts
      photos: { orderBy: { order: "asc" } },
```

- [ ] **Step 3: Update the existing queries test** — in `src/corpus/queries.test.ts`, the `getActivePlaces` test's `expect(findManyPlaceMock).toHaveBeenCalledWith({ … })` (around line 73) must now include `include: { photos: { orderBy: { order: "asc" }, take: 1 } }`. Read the test and add that key to the expected object; change nothing else.

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: existing tests pass. `tsc` may report errors only in files that consume `PlaceGallery`/cards — there should be none yet since types only widened; if any appear, report them rather than changing components (Task 5 owns components).

- [ ] **Step 5: Commit**

```bash
git add src/corpus/place-photos.ts src/corpus/queries.ts src/corpus/queries.test.ts
git commit -m "feat: gallery slides and cover photos from uploads with Google fallback"
```

---

### Task 3: Server actions (upload, save returns id, photo edits)

**Files:**
- Modify: `app/admin/places/actions.ts`, `app/admin/places/actions.test.ts`

**Interfaces:**
- Consumes: `placePhotoKey`, `placePhotoUrl`, `putPlacePhoto`, `deletePlacePhotos` (Task 1); `prisma.placePhoto` (Task 1).
- Produces:
  - `createPlace(formData: FormData): Promise<{ id: string }>` — no redirect anymore.
  - `updatePlace(placeId: string, formData: FormData): Promise<{ id: string }>` — no redirect; reads `photoIds` / `photoCredits`.
  - `uploadPlacePhoto(placeId: string, formData: FormData): Promise<{ id: string; src: string }>` — `formData`: `file` (JPEG/PNG/WebP Blob ≤ 4 MB), optional `credit`.

- [ ] **Step 1: Keep the existing tests working** — in `app/admin/places/actions.test.ts` (no new test cases):

`updatePlace` now queries `prisma.placePhoto`, and both actions return `{ id }` instead of redirecting. Add to the `vi.hoisted` destructuring and object: `findManyPlacePhotoMock`, `findFirstPlacePhotoMock`, `createPlacePhotoMock`, `updatePlacePhotoMock`, `deleteManyPlacePhotoMock`, `putPlacePhotoMock`, `deletePlacePhotosMock` (all `vi.fn()`).

Add to the mocked `prisma`:

```ts
    placePhoto: {
      findMany: findManyPlacePhotoMock,
      findFirst: findFirstPlacePhotoMock,
      create: createPlacePhotoMock,
      update: updatePlacePhotoMock,
      deleteMany: deleteManyPlacePhotoMock,
    },
```

Add a storage mock after the `next/cache` mock:

```ts
vi.mock("@/src/storage/place-photos", () => ({
  placePhotoKey: (placeId: string) => `places/${placeId}/uuid.jpg`,
  placePhotoUrl: (key: string) => `https://storage.test/place-photos/${key}`,
  putPlacePhoto: putPlacePhotoMock,
  deletePlacePhotos: deletePlacePhotosMock,
}));
```

In `beforeEach`, reset every new mock, and add `findManyPlacePhotoMock.mockResolvedValue([]);` after the resets (updatePlace always queries photos).

Remove the `redirectMock` hoisted mock, its `vi.mock("next/navigation", …)` block and its reset. Replace every `expect(redirectMock).toHaveBeenCalledWith("/admin/places");` with an assertion on the returned value, e.g. in the first createPlace test:

```ts
    const result = await createPlace(formData);
    // ...
    expect(result).toEqual({ id: "place-1" });
```

and in updatePlace tests `expect(await updatePlace("place-1", formData)).toEqual({ id: "place-1" })` (capture `result` where the call already exists; don't call twice).

- [ ] **Step 2: Implement** — `app/admin/places/actions.ts`:

Replace the imports with:

```ts
import { updateTag } from "next/cache";
import { prisma } from "@/src/corpus/db";
import {
  deletePlacePhotos,
  placePhotoKey,
  placePhotoUrl,
  putPlacePhoto,
} from "@/src/storage/place-photos";
import { MAX_PHOTO_BYTES, isPlacePhotoType } from "@/src/storage/photo-types";
```

Add below `readImageUrls`:

```ts
function readPhotoEdits(formData: FormData): { id: string; order: number; credit: string | null }[] {
  const credits = formData.getAll("photoCredits").map((v) => String(v).trim());
  return formData
    .getAll("photoIds")
    .map((id, order) => ({ id: String(id), order, credit: credits[order] || null }));
}

async function savePhotoEdits(placeId: string, formData: FormData): Promise<void> {
  const photos = readPhotoEdits(formData);

  const removed = await prisma.placePhoto.findMany({
    where: { placeId, id: { notIn: photos.map((p) => p.id) } },
    select: { id: true, key: true },
  });
  if (removed.length > 0) {
    await prisma.placePhoto.deleteMany({ where: { id: { in: removed.map((p) => p.id) } } });
    await deletePlacePhotos(removed.map((p) => p.key));
  }

  await Promise.all(
    photos.map((photo) =>
      prisma.placePhoto.update({
        where: { id: photo.id, placeId },
        data: { order: photo.order, credit: photo.credit },
      }),
    ),
  );
}
```

In `createPlace`: change the signature to `Promise<{ id: string }>` and replace the final `redirect("/admin/places");` with `return { id: place.id };` (keep `updateTag("corpus")` before it).

In `updatePlace`: change the signature to `Promise<{ id: string }>`; right after the `placeImage` block and before `updateTag("corpus")` add `await savePhotoEdits(placeId, formData);`; replace `redirect("/admin/places");` with `return { id: placeId };`.

Append:

```ts
export async function uploadPlacePhoto(
  placeId: string,
  formData: FormData,
): Promise<{ id: string; src: string }> {
  const file = formData.get("file");
  if (!(file instanceof Blob) || !isPlacePhotoType(file.type)) {
    throw new Error("La photo doit être un JPEG, PNG ou WebP");
  }
  if (file.size > MAX_PHOTO_BYTES) throw new Error("La photo dépasse 4 Mo");
  const credit = String(formData.get("credit") ?? "").trim() || null;

  const key = placePhotoKey(placeId, file.type);
  await putPlacePhoto(key, new Uint8Array(await file.arrayBuffer()), file.type);

  const last = await prisma.placePhoto.findFirst({
    where: { placeId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const photo = await prisma.placePhoto.create({
    data: { placeId, key, credit, order: (last?.order ?? -1) + 1 },
  });

  updateTag("corpus");
  return { id: photo.id, src: placePhotoUrl(photo.key) };
}
```

- [ ] **Step 3: Verify** — `pnpm test`. Expected: PASS. (`tsc` errors in `PlaceForm.tsx`/pages about the action return type are expected until Task 4; don't fix them here.)

- [ ] **Step 4: Commit**

```bash
git add app/admin/places/actions.ts app/admin/places/actions.test.ts
git commit -m "feat: upload place photos and save their order and credits"
```

---

### Task 4: Admin form (compression, photo list, save-then-upload)

**Files:**
- Create: `app/admin/places/compress-photo.ts`, `app/admin/places/PlacePhotoFields.tsx`
- Modify: `package.json`, `pnpm-lock.yaml` (new dependency `browser-image-compression`)
- Modify: `app/admin/places/PlaceForm.tsx`, `app/admin/places/[id]/page.tsx`
- `app/admin/places/new/page.tsx` needs no change (it passes `createPlace`, which now returns `{ id }`).

**Interfaces:**
- Consumes: `createPlace` / `updatePlace` returning `{ id }`, `uploadPlacePhoto(placeId, formData) → { id, src }` (Task 3); `placePhotoUrl`, `isPlacePhotoType`, `PLACE_PHOTO_TYPES`, `MAX_PHOTO_BYTES` (Task 1).
- Produces:
  - `compressPhoto(file: File): Promise<File>`
  - `type PhotoItem = { kind: "saved"; id: string; src: string; credit: string } | { kind: "pending"; tempId: string; blob: Blob; src: string; credit: string }`
  - `PlacePhotoFields({ items, onChange }: { items: PhotoItem[]; onChange: (items: PhotoItem[]) => void })`
  - `PlaceForm` new prop `photos?: { id: string; src: string; credit: string | null }[]`; `action: (formData: FormData) => Promise<{ id: string }>`.

Verification is `tsc`, `lint`, and the manual steps in Task 6.

- [ ] **Step 1: Compression helper**

Run: `pnpm add browser-image-compression` (v2, ships its own types).

`app/admin/places/compress-photo.ts`:

```ts
import imageCompression from "browser-image-compression";
import { MAX_PHOTO_BYTES, isPlacePhotoType } from "@/src/storage/photo-types";

const COMPRESS_ABOVE_MB = 1.5;

export async function compressPhoto(file: File): Promise<File> {
  if (!isPlacePhotoType(file.type)) throw new Error("format non supporté (JPEG, PNG ou WebP)");
  if (file.size <= COMPRESS_ABOVE_MB * 1024 * 1024) return file;

  const compressed = await imageCompression(file, {
    maxSizeMB: COMPRESS_ABOVE_MB,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
  });
  if (compressed.size > MAX_PHOTO_BYTES) throw new Error("trop lourde, même après compression");
  return compressed;
}
```

- [ ] **Step 2: Photo list** — `app/admin/places/PlacePhotoFields.tsx`

```tsx
"use client";

import { useRef, useState } from "react";
import { PLACE_PHOTO_TYPES } from "@/src/storage/photo-types";
import { compressPhoto } from "./compress-photo";

export type PhotoItem =
  | { kind: "saved"; id: string; src: string; credit: string }
  | { kind: "pending"; tempId: string; blob: Blob; src: string; credit: string };

const inputClass = "min-w-0 rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";
const smallButton =
  "rounded-[10px] border border-sable/40 px-3 py-1.5 text-sm text-encre/70 disabled:opacity-40";

function itemKey(item: PhotoItem): string {
  return item.kind === "saved" ? item.id : item.tempId;
}

export function PlacePhotoFields({
  items,
  onChange,
}: {
  items: PhotoItem[];
  onChange: (items: PhotoItem[]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function addFiles(files: FileList) {
    setPreparing(true);
    const added: PhotoItem[] = [];
    const failed: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const blob = await compressPhoto(file);
        added.push({
          kind: "pending",
          tempId: crypto.randomUUID(),
          blob,
          src: URL.createObjectURL(blob),
          credit: "",
        });
      } catch (e) {
        failed.push(`« ${file.name} » : ${e instanceof Error ? e.message : "illisible"}`);
      }
    }
    setErrors(failed);
    setPreparing(false);
    if (fileInput.current) fileInput.current.value = "";
    onChange([...items, ...added]);
  }

  // Saved photos always precede pending ones: pending photos are appended on upload.
  function canSwap(a: number, b: number): boolean {
    return b >= 0 && b < items.length && items[a].kind === items[b].kind;
  }

  function swap(a: number, b: number) {
    const next = [...items];
    [next[a], next[b]] = [next[b], next[a]];
    onChange(next);
  }

  function remove(index: number) {
    const item = items[index];
    if (item.kind === "pending") URL.revokeObjectURL(item.src);
    onChange(items.filter((_, i) => i !== index));
  }

  function setCredit(index: number, credit: string) {
    onChange(items.map((item, i) => (i === index ? { ...item, credit } : item)));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-encre/70">
        Photos du lieu — affichées en premier sur la page publique. Les photos Google
        complètent jusqu&apos;à 5.
      </legend>

      {items.map((item, index) => (
        <div key={itemKey(item)} className="flex flex-wrap items-center gap-2">
          <img src={item.src} alt="" className="h-15 w-20 rounded-[8px] object-cover" />
          {item.kind === "saved" && <input type="hidden" name="photoIds" value={item.id} />}
          <input
            type="text"
            name={item.kind === "saved" ? "photoCredits" : undefined}
            value={item.credit}
            onChange={(e) => setCredit(index, e.target.value)}
            placeholder="Crédit (optionnel)"
            className={`flex-1 ${inputClass}`}
          />
          {item.kind === "pending" && (
            <span className="font-mono text-xs text-encre/60">à envoyer</span>
          )}
          <button
            type="button"
            onClick={() => swap(index, index - 1)}
            disabled={!canSwap(index, index - 1)}
            aria-label="Monter"
            className={smallButton}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => swap(index, index + 1)}
            disabled={!canSwap(index, index + 1)}
            aria-label="Descendre"
            className={smallButton}
          >
            ↓
          </button>
          <button type="button" onClick={() => remove(index)} className={smallButton}>
            Retirer
          </button>
        </div>
      ))}

      <label className="self-start rounded-[10px] border border-sable/40 px-3 py-1.5 text-sm text-mediterranee">
        {preparing ? "Préparation…" : "+ Ajouter des photos"}
        <input
          ref={fileInput}
          type="file"
          accept={PLACE_PHOTO_TYPES.join(",")}
          multiple
          disabled={preparing}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          className="sr-only"
        />
      </label>
      {errors.map((error) => (
        <p key={error} className="text-sm text-statut-rouge">
          {error}
        </p>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 3: PlaceForm becomes a client component** — `app/admin/places/PlaceForm.tsx`:

1. Add `"use client";` as the first line and these imports:

```tsx
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPlacePhoto } from "./actions";
import { PlacePhotoFields, type PhotoItem } from "./PlacePhotoFields";
```

2. Props: change `action` to `action: (formData: FormData) => Promise<{ id: string }>;` and add `photos = []` with type `photos?: { id: string; src: string; credit: string | null }[];`.

3. At the top of the component body:

```tsx
  const router = useRouter();
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>(
    photos.map((p) => ({ kind: "saved", id: p.id, src: p.src, credit: p.credit ?? "" })),
  );
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // onSubmit instead of <form action>: React resets uncontrolled fields after a
  // form action, which would wipe the admin's edits when saving fails.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      let placeId: string;
      try {
        ({ id: placeId } = await action(formData));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Enregistrement impossible");
        return;
      }

      let items = photoItems;
      const pending = items.filter((item) => item.kind === "pending");
      for (const [index, photo] of pending.entries()) {
        setProgress(`Envoi photo ${index + 1}/${pending.length}…`);
        const data = new FormData();
        data.set("file", photo.blob);
        data.set("credit", photo.credit);
        try {
          const saved = await uploadPlacePhoto(placeId, data);
          URL.revokeObjectURL(photo.src);
          items = items.map((item) =>
            item === photo ? { kind: "saved", id: saved.id, src: saved.src, credit: photo.credit } : item,
          );
          setPhotoItems(items);
        } catch {
          setProgress(null);
          if (!place) {
            router.push(`/admin/places/${placeId}?erreur=photos`);
          } else {
            setError("L'envoi d'une photo a échoué. Enregistrez à nouveau pour réessayer.");
          }
          return;
        }
      }

      setProgress(null);
      router.push("/admin/places");
    });
  }
```

4. Change `<form action={action} className="flex flex-col gap-4">` to `<form onSubmit={handleSubmit} className="flex flex-col gap-4">`.

5. Right before `<PlaceImageFields defaultUrls={imageUrls} />`, add `<PlacePhotoFields items={photoItems} onChange={setPhotoItems} />`.

6. Replace the submit button with:

```tsx
      {error && <p className="text-sm text-statut-rouge">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white disabled:opacity-60 sm:w-auto"
      >
        {progress ?? (isPending ? "Enregistrement…" : "Enregistrer")}
      </button>
```

Check `app/globals.css` for the exact red status token (`statut-rouge` is used in `PlaceCard.tsx` as `text-statut-rouge`); use it as above.

- [ ] **Step 4: Edit page passes photos and shows the failure banner** — `app/admin/places/[id]/page.tsx`:

Add import `import { placePhotoUrl } from "@/src/storage/place-photos";`. Add `searchParams` to the props:

```tsx
export default async function AdminEditPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
```

After `const { id } = await params;` add `const { erreur } = await searchParams;`. Add to the `Promise.all` array (and destructure as `photos`):

```ts
    prisma.placePhoto.findMany({ where: { placeId: id }, orderBy: { order: "asc" } }),
```

Just above `<PlaceForm`, add:

```tsx
      {erreur === "photos" && (
        <p className="rounded-[10px] border border-statut-rouge/40 p-3 text-sm text-statut-rouge">
          Le lieu a été créé, mais certaines photos n&apos;ont pas pu être envoyées. Ajoutez-les à
          nouveau ci-dessous.
        </p>
      )}
```

and pass `photos={photos.map((p) => ({ id: p.id, src: placePhotoUrl(p.key), credit: p.credit }))}` to `PlaceForm`.

- [ ] **Step 5: Verify**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: no type errors in `app/admin/**`; lint clean (a `@next/next/no-img-element` warning on admin thumbnails is acceptable — the codebase already uses `<img>`); tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/admin/places
git commit -m "feat: photo upload in the place form (create and edit)"
```

---

### Task 5: Public display (uploads first everywhere)

**Files:**
- Create: `src/components/PhotoImage.tsx`
- Modify: `src/components/PhotoCarousel.tsx`, `src/components/PlaceGallery.tsx`, `src/components/PlaceCard.tsx`, `src/components/SpotCard.tsx`, `src/components/landing/GuideSection.tsx`, `src/components/landing/Hero.tsx`, `app/(public)/lieux/[slug]/page.tsx`, `app/(public)/lieux/page.tsx`, `app/(landing)/page.tsx`

**Interfaces:**
- Consumes: `DisplayPhoto`, `MIN_GALLERY_PHOTOS`, `buildGallerySlides`, `resolveCoverPhoto` (Task 2); `PlaceWithCover`, `getActivePlaces`, `getPlaceBySlug` (Task 2); `next.config.ts` remotePatterns (Task 1).
- Produces:
  - `PhotoImage({ photo, sizes, className?, preload? }: { photo: DisplayPhoto; sizes: string; className?: string; preload?: boolean })` — fills its `relative` parent.
  - `PhotoCarousel({ slides }: { slides: DisplayPhoto[] })`
  - `PlaceGallery({ typeLabel, slides, tiles }: { typeLabel: string; slides: DisplayPhoto[]; tiles: GalleryTile[] })`, `type GalleryTile = { slug: string; name: string; cover: DisplayPhoto }`
  - `PlaceCard({ place, status, cover })`, `SpotCard({ spot, status, cover })` with `cover: DisplayPhoto | null`
  - `GuideCard = { place: Place; cover: DisplayPhoto | null }`, `HeroPhoto = { place: Place; cover: DisplayPhoto }`

Read `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` (sections `fill`, `sizes`, `preload`, `getImageProps`) before starting.

- [ ] **Step 1: `PhotoImage`** — `src/components/PhotoImage.tsx`

```tsx
import Image from "next/image";
import type { DisplayPhoto } from "../corpus/place-photos";

export function PhotoImage({
  photo,
  sizes,
  className = "",
  preload = false,
}: {
  photo: DisplayPhoto;
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  if (photo.uploaded) {
    return (
      <Image src={photo.src} alt="" fill sizes={sizes} preload={preload} className={`object-cover ${className}`} />
    );
  }

  // Google photos go through the /lieux/[slug]/photo redirect, which next/image can't optimize.
  return (
    <img
      src={photo.src}
      alt=""
      loading={preload ? "eager" : "lazy"}
      className={`absolute inset-0 size-full object-cover ${className}`}
    />
  );
}
```

- [ ] **Step 2: `PhotoCarousel`** — `src/components/PhotoCarousel.tsx`: replace the `photoSrc` helper, props, `useEffect` preloading and the `<img key={index} …>` element. New props: `{ slides }: { slides: DisplayPhoto[] }`; `const count = slides.length; const credit = slides[index].credit;`. Remove the `useEffect` import and block. Render the current slide plus the next one invisibly (so the browser fetches it — works for both `next/image` and the Google redirect):

```tsx
      <PhotoImage key={slides[index].src} photo={slides[index]} sizes={GALLERY_SIZES} preload={index === 0} />
      {slides[index + 1] && (
        <div aria-hidden className="invisible">
          <PhotoImage key={slides[index + 1].src} photo={slides[index + 1]} sizes={GALLERY_SIZES} />
        </div>
      )}
```

with `const GALLERY_SIZES = "(min-width: 768px) 66vw, 100vw";` at module level, imports `import type { DisplayPhoto } from "../corpus/place-photos";` and `import { PhotoImage } from "./PhotoImage";`. Replace the old `attribution` badge with the same markup using `credit` (`Photo : {credit}`). Update the component comment: each Google photo is still resolved only when requested; the current and next slide are loaded. Buttons and the `{index + 1} / {count}` counter stay as is.

Note: the invisible wrapper `div` must not break `fill` positioning — `PhotoImage` fills the nearest positioned ancestor, which is still the gallery panel (`relative`), since the wrapper `div` is static. Keep it static (no `relative`).

- [ ] **Step 3: `PlaceGallery`** — `src/components/PlaceGallery.tsx`:
  - Props become `{ typeLabel, slides, tiles }` (drop `slug`, `photo`, `photoAttributions`); `export type GalleryTile = { slug: string; name: string; cover: DisplayPhoto };`. Replace the `GooglePlacePhoto` import with `import type { DisplayPhoto } from "../corpus/place-photos";` and `import { PhotoImage } from "./PhotoImage";`.
  - Main panel: `style={slides.length > 0 ? undefined : { backgroundImage: STRIPES }}`; content: `slides.length > 1` → `<PhotoCarousel slides={slides} />`; `slides.length === 1` → `<PhotoImage photo={slides[0]} sizes="(min-width: 768px) 66vw, 100vw" preload />` plus the credit badge (`slides[0].credit`); else the existing "photo à venir" span.
  - Tiles: replace the `<img src={`/lieux/${tile.slug}/photo`} …>` with `<PhotoImage photo={tile.cover} sizes="(min-width: 768px) 17vw, 0px" className="transition-transform duration-300 group-hover:scale-[1.03]" />` (the tile `Link` is already `relative`).

- [ ] **Step 4: Cards** —
  - `src/components/PlaceCard.tsx`: prop `photo: GooglePlacePhoto | null` → `cover: DisplayPhoto | null` (update the import). Replace `photo` with `cover` in the stripes condition and gradient condition; replace the `<img …>` with `<PhotoImage photo={cover} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />`. `place` stays typed `Place` (a `PlaceWithCover` is assignable).
  - `src/components/SpotCard.tsx`: same rename; add `relative` to the thumbnail `div`'s className; replace the `<img>` with `<PhotoImage photo={cover} sizes="88px" />`.
  - `src/components/landing/GuideSection.tsx`: `export type GuideCard = { place: Place; cover: DisplayPhoto | null };` (replace the `GooglePlacePhoto` import); in the map, destructure `{ place, cover }` and replace the `<img …>` with `<PhotoImage photo={cover} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 92px" />` (the wrapper `div` is already `relative`).

- [ ] **Step 5: Hero** — `src/components/landing/Hero.tsx`:
  - `export type HeroPhoto = { place: Place; cover: DisplayPhoto };` (replace the `GooglePlacePhoto` import; add `import { getImageProps } from "next/image";`).
  - `const attribution = heroPhoto?.cover.credit;`
  - Keep the `<picture>` + transparent-pixel trick (no download on mobile). The `<source>` becomes:

```tsx
              <source media="(min-width: 768px)" {...heroSource(heroPhoto.cover)} />
```

with, at module level:

```tsx
const HERO_SIZES = "(min-width: 1024px) 50vw, 100vw";

function heroSource(cover: DisplayPhoto): { srcSet: string; sizes?: string } {
  if (!cover.uploaded) return { srcSet: cover.src };
  const { props } = getImageProps({ src: cover.src, alt: "", width: 1200, height: 900, sizes: HERO_SIZES });
  return { srcSet: props.srcSet ?? props.src, sizes: HERO_SIZES };
}
```

- [ ] **Step 6: Detail page** — `app/(public)/lieux/[slug]/page.tsx`:
  - Imports: add `import { MIN_GALLERY_PHOTOS, buildGallerySlides, resolveCoverPhoto } from "@/src/corpus/place-photos";`.
  - Replace the `Promise.all` and `galleryTiles` with:

```tsx
  const [googleDetails, spotCards, activePlaces] = await Promise.all([
    place.photos.length < MIN_GALLERY_PHOTOS ? getGooglePlaceDetails(place.googlePlaceId) : null,
    Promise.all(
      place.children.map(async (spot) => ({ spot, cover: await resolveCoverPhoto(spot) })),
    ),
    getActivePlaces(),
  ]);

  const slides = buildGallerySlides({
    slug: place.slug,
    uploaded: place.photos,
    googleAttributions: googleDetails?.photo ? googleDetails.photoAttributions : [],
  });
  const galleryTiles = spotCards.flatMap(({ spot, cover }) =>
    cover ? [{ slug: spot.slug, name: spot.name, cover }] : [],
  );
```

  - `<PlaceGallery typeLabel={typeLabel} slides={slides} tiles={galleryTiles} />`
  - `SpotCard`: `spotCards.map(({ spot, cover }) => <SpotCard … cover={cover} …/>)`.

- [ ] **Step 7: Index and landing pages** —
  - `app/(public)/lieux/page.tsx`: replace the `getGooglePlaceDetails` import with `import { resolveCoverPhoto } from "@/src/corpus/place-photos";`; cards become `places.map(async (place) => ({ place, cover: await resolveCoverPhoto(place) }))`; pass `cover={cover}` to `PlaceCard`.
  - `app/(landing)/page.tsx`: replace the `getGooglePlaceDetails` import with `resolveCoverPhoto`; `import type { PlaceWithCover } from "@/src/corpus/queries";`. Rewrite:

```tsx
async function withCover(place: PlaceWithCover): Promise<GuideCard> {
  return { place, cover: await resolveCoverPhoto(place) };
}

async function findHeroPhoto(cards: GuideCard[], rest: PlaceWithCover[]): Promise<HeroPhoto | null> {
  const fromCards = cards.find((card): card is HeroPhoto => card.cover !== null);
  if (fromCards) return fromCards;

  for (const place of rest) {
    const card = await withCover(place);
    if (card.cover) return { place, cover: card.cover };
  }
  return null;
}
```

    and use `withCover` in `LandingPage`. Remove the now-unused `Place` type import if nothing else uses it.

- [ ] **Step 8: Verify**

Run: `grep -rn "GooglePlacePhoto" src app` — expected: only `src/corpus/google-places.ts` (+ its test).
Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: all clean/passing.

- [ ] **Step 9: Commit**

```bash
git add src/components app
git commit -m "feat: show uploaded place photos first, Google photos as fallback"
```

---

### Task 6: Final verification + manual test steps

**Files:** none (unless verification finds a bug; fix it in the owning file and commit `fix: …`).

- [ ] **Step 1: Full checks**

Run: `pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`
Expected: all pass; `pnpm build` lists `/lieux/[slug]` as prerendered (●/SSG with generateStaticParams), no `next/image` "hostname not configured" error.

- [ ] **Step 2: Hand the user these manual steps** (do not run a browser):

1. `pnpm dev`, open `/admin/places/new`, fill a place with a Google Place ID, pick 2 photos (one portrait from a phone to check EXIF rotation), add a credit on one, click **Enregistrer** → button shows "Envoi photo 1/2…", then the list page.
2. Open that place's edit page: both photos listed, credit kept. Reorder (↓), change a credit, remove one, add a new one → save. Re-open: order/credit/removal persisted, new photo last.
3. Neon Console → Object storage → `place-photos`: the removed photo's object is gone.
4. Set the place ACTIVE and open `/lieux/<slug>`: uploads first in the carousel with "Photo : <credit>", then Google photos, 5 total. With 5+ uploads: no Google photo.
5. `/lieux` card, the parent place's spot card/tile, and the landing guide card show the first uploaded photo.
6. DevTools → Network on the detail page: the uploaded image loads from `/_next/image?url=https%3A%2F%2F…neon.tech%2Fplace-photos%2F…`; after `pnpm build && pnpm start`, its response has `Cache-Control: public, max-age=31536000, must-revalidate` (or similar year-long value).
7. Pick a photo > 1.5 MB → it is compressed (preview appears after a short "Préparation…"); a small photo is added instantly. A HEIC/other file (choose "All files" in the picker) → a per-file error, other files still added.
8. Before deploying: add the 4 `AWS_*` vars to Vercel (Production + Preview).
