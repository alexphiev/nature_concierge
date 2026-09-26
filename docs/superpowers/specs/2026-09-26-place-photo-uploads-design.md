# Place Photo Uploads — Neon Object Storage

## Purpose

Place photos currently come only from Google Places (`/lieux/[slug]/photo?i=N`,
a redirect to a Google-hosted URI). Admins need to upload their own photos,
stored in Neon Object Storage (same Neon project as the DB), and those photos
must take the first positions everywhere a place photo is shown. Google photos
become a fallback used only to reach a minimum of 5 photos.

Admin-only upload for now. The existing `PlaceImage` model ("Images pratiques":
external URLs for maps/schedules shown at the bottom of the page) is unrelated
and stays untouched.

## Decisions

- **Bucket**: `place-photos`, `public_read`, already created on the Neon branch.
- **Upload path**: compress large files (> 1.5 MB) in the browser with
  `browser-image-compression`, then one server action call per photo. No presigned PUT, no bucket CORS.
- **Placement**: everywhere — detail gallery/carousel, `PlaceCard` (`/lieux`),
  `SpotCard`, and gallery spot tiles. The OG image is unchanged.
- **Credit**: optional free-text credit per photo, shown like Google
  attributions (`Photo : …`).
- **Create and edit**: both pages accept photos. Photos are uploaded as a
  second step, after the place itself is saved.

## Storage

Env vars (from `neon env pull` / Neon Console → Connect → Storage), added to
`.env.dist`:

```
AWS_ENDPOINT_URL_S3=https://br-xxx.storage.c-N.eu-central-1.aws.neon.tech
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=nak_live_...
AWS_SECRET_ACCESS_KEY=nsk_live_...
```

New module `src/storage/place-photos.ts`:

- S3 client: `new S3Client({ forcePathStyle: true, requestChecksumCalculation: "WHEN_REQUIRED" })`
  — reads the `AWS_*` env vars itself. Created lazily so importing the module
  without env vars (tests, build) doesn't throw.
- `PLACE_PHOTOS_BUCKET = "place-photos"`.
- `placePhotoKey(placeId, type)` → `places/{placeId}/{randomUUID()}.{jpg|png|webp}`.
- `placePhotoUrl(key)` → `${AWS_ENDPOINT_URL_S3}/place-photos/${key}`.
- `putPlacePhoto(key, body: Uint8Array, contentType)` → `PutObjectCommand` with
  the file's `ContentType` (JPEG, PNG or WebP) and
  `CacheControl: "public, max-age=31536000, immutable"`.
- `deletePlacePhotos(keys)` → `DeleteObjectsCommand` (no-op for empty list).

Keys are never reused (a replaced photo is a new key), so every cache layer can
keep an object forever. The DB stores the **key**, not the URL, so a changed
branch endpoint only requires an env change.

## Data model

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

`Place` gets `photos PlacePhoto[]`. One migration.

## Admin form

### `PlaceForm` becomes a client component

It keeps the same props (plus `photos` for the edit page) and wraps the
`action` prop in a client action:

1. `const { id } = await action(formData)` — `createPlace` / `updatePlace`
   now **return `{ id }` instead of redirecting**.
2. For each pending (not yet uploaded) photo, in order:
   `await uploadPlacePhoto(id, photoFormData)`, with a status line
   "Envoi photo 2/4…".
3. `router.push("/admin/places")`.

On error (thrown by the save or an upload), stay on the form and show the error
message. If the place was just created and an upload failed, navigate to
`/admin/places/{id}` instead so a retry doesn't create a duplicate place.
While submitting, the submit button is disabled.

### `PlacePhotoFields` (client component)

- File input (JPEG, PNG, WebP; `multiple`). Files > 1.5 MB are compressed in
  the browser with `browser-image-compression` (`maxSizeMB: 1.5`,
  `maxWidthOrHeight: 2400`, web worker, type preserved, EXIF orientation
  handled); smaller files are kept as-is. Each is kept in state as a pending
  photo with a local object-URL preview.
- List of photos: existing ones (edit page) first, then pending ones. Each row:
  thumbnail, credit input, ↑/↓ buttons, "Retirer" button.
- Existing photos submit with the main form as parallel hidden fields
  `photoIds` / `photoCredits`, in displayed order. Pending photos are not part
  of the main form submission — they are uploaded by step 2 above, each with its
  credit, and are appended after existing photos (reordering across the
  existing/pending boundary takes effect on the next save; pending photos can
  be reordered among themselves).
- Legend explains: photos appear first on the public page; Google photos
  complete up to 5.

### Server actions (`app/admin/places/actions.ts`)

- `uploadPlacePhoto(placeId, formData)`: reads `file` (JPEG, PNG or WebP,
  ≤ 4 MB — below Vercel's 4.5 MB body limit) and optional `credit`; `putPlacePhoto`; creates the `PlacePhoto`
  row with `order = max(order) + 1`; `updateTag("corpus")`.
- `createPlace`: unchanged logic, returns `{ id }` instead of `redirect`.
- `updatePlace`: additionally reads `photoIds` / `photoCredits`; deletes
  the place's `PlacePhoto` rows whose id is not listed (and their S3 objects
  via `deletePlacePhotos`); updates `order` (index) and `credit` of listed ones.
  Returns `{ id }` instead of `redirect`.

`/admin/*` (pages and their server-action POSTs) is protected by `proxy.ts`.

## Public display

### Gallery composition

Pure function in `src/corpus/place-photos.ts`:

```ts
type Slide = { src: string; credit: string | null; uploaded: boolean };
buildGallerySlides({ slug, uploaded, googleAttributions }): Slide[]
```

- Uploaded photos first (by `order`, `src = placePhotoUrl(key)`).
- Then Google photos `/lieux/{slug}/photo?i=k` for `k = 0…`, only while the
  total is below 5 (`MIN_GALLERY_PHOTOS = 5`) and Google has that index.
- 5+ uploaded photos → no Google photo at all.

And `coverPhotoSrc(slug, uploaded[0] | undefined, hasGooglePhoto)` for cards:
first uploaded photo, else `/lieux/{slug}/photo`, else `null`.

### Components

- `PlaceGallery` / `PhotoCarousel` take `slides: Slide[]` instead of a Google
  photo + attributions. The carousel indexes into `slides`; next-slide
  preloading stays.
- Uploaded slides render with `next/image` (`fill`,
  `sizes="(min-width: 768px) 66vw, 100vw"`, `preload` for the first slide).
  Google slides keep the plain `<img>` pointing at the redirect route
  (unchanged caching).
- `PlaceCard`, `SpotCard` and spot tiles receive a cover `src` (+ `uploaded`
  flag) instead of `GooglePlacePhoto`; uploaded covers use `next/image`.
  Google photo credit badges are still shown for Google covers, uploaded
  credits for uploaded ones.

### Queries

- `getPlaceBySlug`: include `photos: { orderBy: { order: "asc" } }`, and for
  `children`, `photos: { orderBy: { order: "asc" }, take: 1 }`.
- `getActivePlaces`: include `photos: { orderBy: { order: "asc" }, take: 1 }`.
- Google details are still fetched for places with fewer than 5 uploads
  (detail) / no upload (cards); skipped otherwise to save calls.

## Caching & static generation

- Pages stay statically generated (`generateStaticParams`, `"use cache"` +
  `cacheTag("corpus")`); every photo mutation calls `updateTag("corpus")`.
- `next.config.ts`: `images.remotePatterns` for
  `https://**.aws.neon.tech/place-photos/**`.
- Objects carry `Cache-Control: public, max-age=31536000, immutable`; the
  optimized image TTL is the larger of `minimumCacheTTL` and the upstream
  header, so optimized variants stay cached for a year. Immutable keys make
  that safe without invalidation.

## Testing

No new tests (the project is a mock). Existing tests are only adjusted where
behavior intentionally changes (actions return `{ id }`, photos included in
queries).

No browser automation; manual test steps are provided at the end:
create a place with 2 photos, edit it (reorder, credit, remove, add), check the
public page shows uploads first then Google up to 5, check `/lieux` cards and
spot cards, check response headers of the `/_next/image` URL.

## Out of scope

- Deleting S3 objects when a place is deleted (no place deletion flow exists).
- Uploading "Images pratiques".
- Non-admin uploads, presigned uploads, bucket CORS.
