# Zone-Based Status Model + ZAPEF Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `SignalSource`→`Place` status model with a
zone-based model (`SignalZone`, `ZonePlace`) that supports ZAPEF exceptions,
seed the real Var/Bouches-du-Rhône signal sources and zones, build the daily
`/admin/statut` status page, and rewrite the public place page's status
resolution to apply the ZAPEF rules correctly.

**Architecture:** Schema migration replaces `SignalSourceOnPlace`
(place-direct coverage) with `SignalZone` (the official massif/beach/sector
unit) + `ZonePlace` (place→zone assignment) + `Place.zapef`. `StatusLog` moves
from `(signalSourceId, placeId)` to `signalZoneId` only — one row per zone per
day, not per place. A new resolution function in `src/corpus/queries.ts`
implements the 4-rule ZAPEF cascade from `04-signal-ops.md` and replaces the
old direct `getTodayStatus`. `/admin/statut` is a new authenticated page (auth
already covered by the existing `/admin/:path*` proxy matcher) with a form
per zone, one-tap value buttons, and a single save action that writes one
`StatusLog` per zone and revalidates every place under changed zones.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, zod, Vitest
(existing `vi.hoisted()` Prisma-mock convention).

## Global Constraints

- `StatusLog.forDate` = tomorrow for `FIRE_ACCESS`, today for
  `WATER_QUALITY`/`AIR_QUALITY` (spec 04).
- Five official fire levels, exact vocabulary: `vert | jaune | orange | rouge
  | extreme` (`extreme` replaces the old `rouge-extreme` — spec 04 line 54).
- ZAPEF cascade, in order (spec 04 lines 63–72):
  1. `zone.value` ∈ {vert, jaune, orange} → place open, normal rules.
  2. `zone.value = rouge` and `place.zapef = true` → open, restricted (text
     comes from a `DECODING` claim on the place, not the zone).
  3. `zone.value = rouge` and `place.zapef = false` → closed.
  4. `zone.value = extreme` → closed regardless of ZAPEF. No exception.
- `StatusLog` freshness distinguishes three states on `/admin/statut`:
  confirmed today, carried forward (defaulted, unconfirmed), not checked
  (spec 04 line 120) — do not collapse into one boolean.
- A zone never opened today writes no row → every place under it shows the
  loud "non vérifié" state (spec 03 line 47, spec 04 line 130). Never default
  to green.
- `WATER_QUALITY`: `excellente | bonne | suffisante | insuffisante |
  interdite`. `AIR_QUALITY`: `bon | moyen | degrade | mauvais |
  tres-mauvais | extremement-mauvais` (spec 04 line 165–167).
- Active-fire caveat text, rendered on `orange`/`rouge`/`extreme` days on the
  public place page (spec 03 line 41–43, spec 04 line 93–95): « En cas de
  fumée ou de consignes des secours sur place, suivez-les même si la carte
  indique autre chose. »
- Var's 9 official massifs, labels verbatim, seeded now (spec 04 lines
  34–38): MONTS TOULONNAIS (1) · SAINTE BAUME (2) · HAUT VAR (3) · CORNICHE
  DES MAURES (4) · MAURES (5) · CENTRE VAR (6) · PLATEAU DE CANJUERS (7) ·
  ESTEREL (8) · ILES D'HYERES (9). `externalRef` = the official number as a
  string (e.g. `"2"`).
- Bouches-du-Rhône `SignalZone` rows are **not** seeded this plan — spec 04
  gives no concrete B13 zone list and Port d'Alon is département 83. The
  `fire-13` `SignalSource` row is still seeded (per spec 04's source table),
  just with zero `SignalZone` children for now.
- Port d'Alon: `zapef = true`, assigned to the `SAINTE BAUME` zone.
- SignalSource/SignalZone setup is seeded via a code file
  (`src/corpus/signal-sources.ts`), loaded by the existing seed pipeline —
  **no `/admin/sources` UI** in this plan (confirmed with user: setup is
  rare, matches the existing one-file-per-concept seeding convention used
  for places).
- `/admin/statut` needs no new auth code — `proxy.ts`'s `matcher:
  "/admin/:path*"` already covers it.
- Do not touch `/places` routes' URL structure (`/lieux` rename is explicitly
  out of scope, confirmed with user — spec 03's `/lieux` references are
  stale and not part of this plan).
- Do not build `/admin/sources`, `/admin/places`, `/admin/ingest`, or
  `/admin/review/[draftId]` in this plan — those belong to a second,
  separate plan (spec 11) built after this one merges.

---

### Task 1: Schema migration — SignalZone, ZonePlace, Place.zapef, StatusLog re-key

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via `prisma migrate dev` (auto-named)

**Interfaces:**
- Produces: `Place.zapef: Boolean`, `SignalZone` model (`id`, `signalSourceId`,
  `label`, `externalRef`, `parseNotes`, `active`), `ZonePlace` join model
  (`signalZoneId`, `placeId`), `StatusLog` re-keyed to `signalZoneId` (was
  `signalSourceId` + `placeId`), `checkedAt` renamed to `confirmedAt`.
- Removes: `SignalSourceOnPlace` model, `StatusLog.placeId`,
  `StatusLog.signalSourceId`, `SignalSource.parseNotes` (moves to
  `SignalZone.parseNotes` — decoding rules are per-zone, not per-source, per
  spec 04's own model).
- Consumes: nothing (first task).

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Replace the `Real-time layer` section (currently `SignalSource`,
`SignalSourceOnPlace`, `SignalType`, `StatusLog`) with:

```prisma
// ---------- Real-time layer (separate lane, automatable later) ----------

model SignalSource {
  id             String     @id @default(cuid())
  signalType     SignalType
  provider       String
  url            String
  updateSchedule String
  format         String
  active         Boolean    @default(true)

  zones          SignalZone[]

  @@unique([provider, signalType])
}

model SignalZone {
  id             String       @id @default(cuid())
  signalSourceId String
  signalSource   SignalSource @relation(fields: [signalSourceId], references: [id])

  label          String
  externalRef    String?
  parseNotes     String
  active         Boolean      @default(true)

  places         ZonePlace[]
  statusLogs     StatusLog[]

  @@unique([signalSourceId, label])
}

model ZonePlace {
  signalZoneId String
  placeId      String
  signalZone   SignalZone @relation(fields: [signalZoneId], references: [id])
  place        Place      @relation(fields: [placeId], references: [id])

  @@id([signalZoneId, placeId])
}

enum SignalType {
  FIRE_ACCESS
  WATER_QUALITY
  AIR_QUALITY
  PARKING
  RESERVATION_QUOTA
}

model StatusLog {
  id           String     @id @default(cuid())
  signalZoneId String
  signalZone   SignalZone @relation(fields: [signalZoneId], references: [id])

  forDate      DateTime   @db.Date
  value        String
  detail       String?
  confirmedAt  DateTime   @default(now())

  @@unique([signalZoneId, forDate])
  @@index([forDate])
}
```

In the `Place` model, add the `zapef` field and update relations (remove
`signalCoverage`, add `zones`):

```prisma
model Place {
  id                 String      @id @default(cuid())
  slug               String      @unique
  name               String
  commune            String
  departement        String
  lat                Float
  lng                Float
  type               PlaceType
  governingAuthority String?
  officialInfoUrl    String?
  description        String?
  demandRank         Int         @default(999)
  zapef              Boolean     @default(false)
  status             PlaceStatus @default(DRAFT)
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  claims             Claim[]     @relation("PlaceClaims")
  alternativeOf      Claim[]     @relation("AlternativePlace")
  zones              ZonePlace[]

  @@index([status, demandRank])
}
```

The current `Place` model has a `statusLogs StatusLog[]` relation line —
**delete it** (don't keep it). `StatusLog` no longer has a `placeId`
foreign key after this migration, so that relation would be dangling and
Prisma will reject it at generate time.

- [ ] **Step 2: Run the migration**

```bash
pnpm exec prisma migrate dev --name zone_based_status_model
```

Expected: migration file created under `prisma/migrations/`, applied to the
dev database (Neon), Prisma Client regenerated automatically.

- [ ] **Step 3: Verify the generated client**

```bash
grep -n "zapef" prisma/generated/models/Place.ts
grep -n "signalZoneId" prisma/generated/models/StatusLog.ts
```

Expected: both greps return matches. If either is empty, run
`pnpm exec prisma generate` explicitly and re-check — the client can go
stale relative to schema.prisma if `migrate dev` didn't regenerate it (this
exact failure mode bit the corpus-ingestion-capture plan; check every time).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Replace SignalSource/Place direct coverage with SignalZone/ZonePlace model; add Place.zapef"
```

---

### Task 2: Seed data — SignalSource/SignalZone file + Port d'Alon zapef/zone assignment

**Files:**
- Create: `src/corpus/signal-sources.ts`
- Modify: `src/corpus/places/port-d-alon.ts`
- Modify: `src/corpus/schema.ts` (add `zapef` to `PlaceFileSchema`)
- Modify: `scripts/corpus/seed.ts` (`pnpm corpus:seed` entry point)

**Interfaces:**
- Consumes: `SignalType` enum, `Place.zapef` (Task 1).
- Produces: seeded `SignalSource` rows (`fire-83`, `fire-13`, `water-ars`,
  `air-atmosud`) and 9 `SignalZone` rows under `fire-83`, plus a
  `ZonePlace` row linking Port d'Alon to the `SAINTE BAUME` zone.

- [ ] **Step 1: Write `src/corpus/signal-sources.ts`**

```ts
export interface SignalZoneSeed {
  label: string;
  externalRef: string;
  parseNotes: string;
}

export interface SignalSourceSeed {
  key: string;
  signalType: "FIRE_ACCESS" | "WATER_QUALITY" | "AIR_QUALITY";
  provider: string;
  url: string;
  updateSchedule: string;
  format: string;
  zones: SignalZoneSeed[];
}

export const SIGNAL_SOURCES: SignalSourceSeed[] = [
  {
    key: "fire-83",
    signalType: "FIRE_ACCESS",
    provider: "Préfecture du Var",
    url: "https://risque-prevention-incendie.fr/var",
    updateSchedule: "daily ~18h, veille pour lendemain",
    format: "carte web",
    zones: [
      {
        label: "MONTS TOULONNAIS",
        externalRef: "1",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "SAINTE BAUME",
        externalRef: "2",
        parseNotes:
          "Couleur par massif. Port d'Alon (ZAPEF) : rouge = ouvert 8h–17h, pinède + plage principale uniquement, parking réduit ; extrême = fermé y compris piétons.",
      },
      {
        label: "HAUT VAR",
        externalRef: "3",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "CORNICHE DES MAURES",
        externalRef: "4",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "MAURES",
        externalRef: "5",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "CENTRE VAR",
        externalRef: "6",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "PLATEAU DE CANJUERS",
        externalRef: "7",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "ESTEREL",
        externalRef: "8",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "ILES D'HYERES",
        externalRef: "9",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
    ],
  },
  {
    key: "fire-13",
    signalType: "FIRE_ACCESS",
    provider: "Préfecture des Bouches-du-Rhône",
    url: "https://risque-prevention-incendie.fr/bouches-du-rhone",
    updateSchedule: "daily ~18h",
    format: "carte web",
    zones: [], // seeded when a B13 place is captured — spec 04 gives no concrete zone list yet
  },
  {
    key: "water-ars",
    signalType: "WATER_QUALITY",
    provider: "ARS / baignades.sante.gouv.fr",
    url: "https://baignades.sante.gouv.fr",
    updateSchedule: "saison, hebdo + alertes",
    format: "site",
    zones: [],
  },
  {
    key: "air-atmosud",
    signalType: "AIR_QUALITY",
    provider: "ATMO Sud",
    url: "https://www.atmosud.org",
    updateSchedule: "daily",
    format: "site/API",
    zones: [],
  },
];
```

- [ ] **Step 2: Add `zapef` to `PlaceFileSchema` in `src/corpus/schema.ts`**

`PlaceFileSchema` does not currently include `zapef`. Add it so
`validatePlaceFile`/`PlaceFileSchema.safeParse` don't silently strip or
reject the field once Step 3 adds it to the place file:

```ts
export const PlaceFileSchema = z.object({
  slug: z.string(),
  name: z.string(),
  commune: z.string(),
  departement: z.enum(["13", "83"]),
  lat: z.number(),
  lng: z.number(),
  type: PlaceTypeSchema,
  governingAuthority: z.string().optional(),
  officialInfoUrl: z.string().optional(),
  description: z.string().optional(),
  demandRank: z.number().int(),
  zapef: z.boolean().default(false),
  sources: z.record(z.string(), SourceInputSchema),
  claims: z.array(ClaimInputSchema),
});
```

(Only the added `zapef` line changes; everything else in the object is
unchanged from the current file.)

- [ ] **Step 3: Update `src/corpus/places/port-d-alon.ts`**

Add `zapef: true` to the `definePlace` call, after `demandRank`:

```ts
export default definePlace({
  slug: "port-d-alon",
  name: "Calanque de Port d'Alon",
  commune: "Saint-Cyr-sur-Mer",
  departement: "83",
  lat: 43.1656,
  lng: 5.6598,
  type: "CALANQUE",
  governingAuthority: "Ville de Saint-Cyr-sur-Mer — Service Espaces Naturels",
  officialInfoUrl: "https://www.var.gouv.fr/",
  demandRank: 3,
  zapef: true,
  description:
    "Calanque préservée entre Saint-Cyr et Bandol, pinède et plage de galets.",
  sources: {
    // unchanged
  },
  claims: [
    // unchanged
  ],
});
```

(Only the inserted `zapef: true` line changes; `sources`/`claims` stay
exactly as they are today — do not touch them.)

- [ ] **Step 4: Wire signal-source/zone seeding into `scripts/corpus/seed.ts`**

Add the import and a new block inside `main()`, after the existing
place/source/claim loop (i.e. right before the closing
`console.log(...)`/`$disconnect()` lines):

```ts
import { SIGNAL_SOURCES } from "../../src/corpus/signal-sources";
```

```ts
  let signalSourcesUpserted = 0;
  let signalZonesUpserted = 0;

  for (const source of SIGNAL_SOURCES) {
    const dbSource = await prisma.signalSource.upsert({
      where: { provider_signalType: { provider: source.provider, signalType: source.signalType } },
      create: {
        signalType: source.signalType,
        provider: source.provider,
        url: source.url,
        updateSchedule: source.updateSchedule,
        format: source.format,
      },
      update: {
        url: source.url,
        updateSchedule: source.updateSchedule,
        format: source.format,
      },
    });
    signalSourcesUpserted++;

    for (const zone of source.zones) {
      await prisma.signalZone.upsert({
        where: { signalSourceId_label: { signalSourceId: dbSource.id, label: zone.label } },
        create: {
          signalSourceId: dbSource.id,
          label: zone.label,
          externalRef: zone.externalRef,
          parseNotes: zone.parseNotes,
        },
        update: {
          externalRef: zone.externalRef,
          parseNotes: zone.parseNotes,
        },
      });
      signalZonesUpserted++;
    }
  }

  const sainteBaumeZone = await prisma.signalZone.findFirst({
    where: { label: "SAINTE BAUME" },
  });
  const portDAlon = await prisma.place.findUnique({ where: { slug: "port-d-alon" } });
  if (sainteBaumeZone && portDAlon) {
    await prisma.zonePlace.upsert({
      where: { signalZoneId_placeId: { signalZoneId: sainteBaumeZone.id, placeId: portDAlon.id } },
      create: { signalZoneId: sainteBaumeZone.id, placeId: portDAlon.id },
      update: {},
    });
  }

  console.log(
    `corpus:seed done — ${placesUpserted} place(s), ${claimsUpserted} claim(s), ${signalSourcesUpserted} signal source(s), ${signalZonesUpserted} signal zone(s)`,
  );
```

This **replaces** the existing final `console.log(...)` line in the file
(the one currently reading
`` `corpus:seed done — ${placesUpserted} place(s), ${claimsUpserted} claim(s)` ``)
— don't leave both.

Note: `signalSource.upsert`'s `where` clause uses the
`provider_signalType` compound key generated from `SignalSource`'s
`@@unique([provider, signalType])` (Task 1), and `signalZone.upsert` uses
`signalSourceId_label` from `SignalZone`'s `@@unique([signalSourceId,
label])` (also Task 1). Confirm both compound key names against
`prisma/generated/models/*.ts` before running this step — Prisma's default
naming is field names joined by `_` in declaration order, but verify
rather than assume. `ZonePlace`'s `@@id([signalZoneId, placeId])`
similarly generates `signalZoneId_placeId`, used in Step 4 above.

- [ ] **Step 5: Run the seed script and verify**

```bash
pnpm corpus:seed
```

```bash
pnpm exec tsx -e "
import { prisma } from './src/corpus/db';
const zones = await prisma.signalZone.findMany({ include: { signalSource: true } });
console.log(zones.map(z => z.label));
const place = await prisma.place.findUnique({ where: { slug: 'port-d-alon' }, include: { zones: { include: { signalZone: true } } } });
console.log(place?.zapef, place?.zones.map(z => z.signalZone.label));
"
```

Expected: 9 zone labels printed for `fire-83` (0 for `fire-13`/`water-ars`/
`air-atmosud`), `place.zapef === true`, `place.zones` contains `SAINTE
BAUME`.

- [ ] **Step 6: Commit**

```bash
git add src/corpus/signal-sources.ts src/corpus/places/port-d-alon.ts src/corpus/schema.ts scripts/corpus/seed.ts
git commit -m "Seed SignalSource/SignalZone data and assign Port d'Alon to SAINTE BAUME with zapef=true"
```

---

### Task 3: Status resolution logic — `resolvePlaceStatus` in `src/corpus/queries.ts`

**Files:**
- Modify: `src/corpus/queries.ts`
- Test: `src/corpus/queries.test.ts`

**Interfaces:**
- Consumes: `Place.zapef`, `ZonePlace`, `SignalZone`, `StatusLog` (Task 1/2).
- Produces:
  ```ts
  export type ResolvedStatus = {
    zoneValue: string;       // raw StatusLog.value, e.g. "rouge"
    displayValue: "vert" | "jaune" | "orange" | "rouge" | "extreme";
    isOpen: boolean;         // the ZAPEF-resolved open/closed verdict
    restricted: boolean;     // true only for the ZAPEF rouge exception
    detail: string | null;   // StatusLog.detail
    confirmedAt: Date;
    zoneLabel: string;
    provider: string;
  } | null; // null = no StatusLog row for the relevant zone/date — "non vérifié"

  export async function resolvePlaceStatus(placeId: string): Promise<ResolvedStatus>
  ```
  This **replaces** `getTodayStatus` (delete it; update the one caller in
  Task 4). `getPlaceFreshness` keeps its existing signature but its internal
  `StatusLog` query changes shape (see Step 3 below) since `StatusLog` no
  longer has `placeId`.

- [ ] **Step 1: Write the failing test for the "no zone assigned" case**

Add to `src/corpus/queries.test.ts`, replacing the entire existing
`describe("getTodayStatus", ...)` block:

```ts
describe("resolvePlaceStatus", () => {
  it("returns null when the place has no zone assignment", async () => {
    findFirstZonePlaceMock.mockResolvedValue(null);

    const result = await resolvePlaceStatus("place-id-1");

    expect(result).toBeNull();
  });

  it("returns null when the zone has no StatusLog row for today (non vérifié)", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue(null);

    const result = await resolvePlaceStatus("place-id-1");

    expect(result).toBeNull();
  });

  it("resolves vert as open, not restricted", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue({
      value: "vert",
      detail: null,
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
    });
    findFirstPlaceMock.mockResolvedValue({ zapef: false });

    const result = await resolvePlaceStatus("place-id-1");

    expect(result).toEqual({
      zoneValue: "vert",
      displayValue: "vert",
      isOpen: true,
      restricted: false,
      detail: null,
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
      zoneLabel: "SAINTE BAUME",
      provider: "Préfecture du Var",
    });
  });

  it("resolves rouge + zapef=true as open and restricted", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue({
      value: "rouge",
      detail: "8h–17h, pinède + plage principale, parking réduit",
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
    });
    findFirstPlaceMock.mockResolvedValue({ zapef: true });

    const result = await resolvePlaceStatus("place-id-1");

    expect(result?.isOpen).toBe(true);
    expect(result?.restricted).toBe(true);
    expect(result?.displayValue).toBe("rouge");
  });

  it("resolves rouge + zapef=false as closed", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue({
      value: "rouge",
      detail: null,
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
    });
    findFirstPlaceMock.mockResolvedValue({ zapef: false });

    const result = await resolvePlaceStatus("place-id-1");

    expect(result?.isOpen).toBe(false);
    expect(result?.restricted).toBe(false);
  });

  it("resolves extreme as closed regardless of zapef=true", async () => {
    findFirstZonePlaceMock.mockResolvedValue({
      signalZone: { id: "zone-1", label: "SAINTE BAUME", signalSource: { provider: "Préfecture du Var" } },
    });
    findFirstStatusLogMock.mockResolvedValue({
      value: "extreme",
      detail: null,
      confirmedAt: new Date("2026-07-21T18:00:00Z"),
    });
    findFirstPlaceMock.mockResolvedValue({ zapef: true });

    const result = await resolvePlaceStatus("place-id-1");

    expect(result?.isOpen).toBe(false);
    expect(result?.restricted).toBe(false);
    expect(result?.displayValue).toBe("extreme");
  });
});
```

Update the top-of-file `vi.hoisted()` block to add
`findFirstZonePlaceMock: vi.fn()` and wire it into the `vi.mock("./db", ...)`
factory as `zonePlace: { findFirst: findFirstZonePlaceMock }`, alongside the
existing `place`/`statusLog`/`claim` mocks. Add its `mockReset()` call to the
`beforeEach`.

- [ ] **Step 2: Run tests, confirm they fail**

```bash
pnpm exec vitest run src/corpus/queries.test.ts
```

Expected: FAIL — `resolvePlaceStatus is not a function` (or similar), since
it doesn't exist yet.

- [ ] **Step 3: Implement `resolvePlaceStatus`, remove `getTodayStatus`**

In `src/corpus/queries.ts`, delete the existing `getTodayStatus` function
entirely and add:

```ts
export type ResolvedStatus = {
  zoneValue: string;
  displayValue: "vert" | "jaune" | "orange" | "rouge" | "extreme";
  isOpen: boolean;
  restricted: boolean;
  detail: string | null;
  confirmedAt: Date;
  zoneLabel: string;
  provider: string;
} | null;

export async function resolvePlaceStatus(
  placeId: string,
): Promise<ResolvedStatus> {
  const zonePlace = await prisma.zonePlace.findFirst({
    where: { placeId },
    include: {
      signalZone: {
        include: { signalSource: { select: { provider: true } } },
      },
    },
  });

  if (!zonePlace) return null;

  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

  const statusLog = await prisma.statusLog.findFirst({
    where: {
      signalZoneId: zonePlace.signalZone.id,
      forDate: { gte: startOfToday },
    },
    orderBy: { forDate: "asc" },
    select: { value: true, detail: true, confirmedAt: true },
  });

  if (!statusLog) return null;

  const place = await prisma.place.findFirst({
    where: { id: placeId },
    select: { zapef: true },
  });

  const displayValue = statusLog.value as ResolvedStatus extends null
    ? never
    : NonNullable<ResolvedStatus>["displayValue"];

  let isOpen: boolean;
  let restricted = false;

  if (displayValue === "extreme") {
    isOpen = false;
  } else if (displayValue === "rouge") {
    isOpen = place?.zapef === true;
    restricted = isOpen;
  } else {
    isOpen = true;
  }

  return {
    zoneValue: statusLog.value,
    displayValue,
    isOpen,
    restricted,
    detail: statusLog.detail,
    confirmedAt: statusLog.confirmedAt,
    zoneLabel: zonePlace.signalZone.label,
    provider: zonePlace.signalZone.signalSource.provider,
  };
}
```

(The `as` cast handles that `statusLog.value` is stored as a plain `String`
in Postgres, not a Prisma enum, per the existing `String` typing in the
schema — same pattern the file already uses elsewhere for taxonomy-typed
strings.)

- [ ] **Step 4: Update `getPlaceFreshness`'s StatusLog query**

`StatusLog` no longer has `placeId`. Change `getPlaceFreshness` to look up
freshness through the place's zone instead:

```ts
export async function getPlaceFreshness(placeId: string): Promise<Date> {
  const zonePlace = await prisma.zonePlace.findFirst({
    where: { placeId },
    select: { signalZoneId: true },
  });

  const [latestClaim, latestStatusLog] = await Promise.all([
    prisma.claim.findFirst({
      where: { placeId, isPublic: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    zonePlace
      ? prisma.statusLog.findFirst({
          where: { signalZoneId: zonePlace.signalZoneId },
          orderBy: { confirmedAt: "desc" },
          select: { confirmedAt: true },
        })
      : Promise.resolve(null),
  ]);

  const candidates = [latestClaim?.updatedAt, latestStatusLog?.confirmedAt].filter(
    (d): d is Date => d !== undefined,
  );

  if (candidates.length > 0) {
    return candidates.reduce((latest, d) => (d > latest ? d : latest));
  }

  const place = await prisma.place.findFirst({
    where: { id: placeId },
    select: { updatedAt: true },
  });

  return place?.updatedAt ?? new Date();
}
```

Update the three existing `getPlaceFreshness` tests in
`queries.test.ts` for the renamed `checkedAt`→`confirmedAt` field and the
new `zonePlace.findFirst` call the mock needs to satisfy (mock it to return
`{ signalZoneId: "zone-1" }` in the tests that expect a StatusLog to be
found, and `null` in a case that should fall through — add one such case if
none exists, since the old code never had this branch).

- [ ] **Step 5: Run tests, confirm they pass**

```bash
pnpm exec vitest run src/corpus/queries.test.ts
```

Expected: all tests in the file pass.

- [ ] **Step 6: Commit**

```bash
git add src/corpus/queries.ts src/corpus/queries.test.ts
git commit -m "Replace getTodayStatus with ZAPEF-aware resolvePlaceStatus; fix getPlaceFreshness for zone-keyed StatusLog"
```

---

### Task 4: Public place page — render resolved status + active-fire caveat

**Files:**
- Modify: `src/components/StatusBlock.tsx`
- Modify: `src/components/StatusChip.tsx`
- Modify: `app/(public)/places/[slug]/page.tsx`
- Test: none exist today for these two components (no test file to update);
  do not add new test infra for presentational components — this task is
  content/prop-shape changes only, consistent with the existing untested
  status.

**Interfaces:**
- Consumes: `ResolvedStatus` (Task 3).
- Produces: `StatusBlock` and `StatusChip` now take `ResolvedStatus` instead
  of `(StatusLog & { signalSource: { provider } }) | null`.

- [ ] **Step 1: Rewrite `src/components/StatusBlock.tsx`**

```tsx
import { Dateline } from "./Dateline";
import type { ResolvedStatus } from "../corpus/queries";

const ACTIVE_FIRE_CAVEAT =
  "En cas de fumée ou de consignes des secours sur place, suivez-les même si la carte indique autre chose.";

export function StatusBlock({
  status,
  officialInfoUrl,
}: {
  status: ResolvedStatus;
  officialInfoUrl: string | null;
}) {
  if (!status) {
    return (
      <section
        aria-label="Statut du jour"
        className="rounded-[10px] border border-dashed border-statut-inconnu bg-calcaire-deep p-4"
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
    ? "border-statut-rouge text-statut-rouge"
    : status.restricted || status.displayValue === "orange" || status.displayValue === "jaune"
      ? "border-statut-orange text-statut-orange"
      : "border-statut-vert text-statut-vert";

  const showCaveat = ["orange", "rouge", "extreme"].includes(status.displayValue);

  return (
    <section
      aria-label="Statut du jour"
      className={`rounded-[10px] border-l-2 bg-calcaire-deep p-4 ${colorClass}`}
    >
      <p className="font-mono uppercase">
        <span aria-hidden>●</span> {status.displayValue}{" "}
        {status.detail ? `— ${status.detail}` : ""}
      </p>
      {showCaveat && (
        <p className="mt-2 text-sm">{ACTIVE_FIRE_CAVEAT}</p>
      )}
      <hr className="my-3 border-sable/40" />
      <p className="font-mono text-[0.875rem] text-encre/70">
        <Dateline checkedAt={status.confirmedAt} /> · Source officielle :{" "}
        {status.provider}
        {officialInfoUrl && (
          <>
            {" "}
            <a href={officialInfoUrl} className="underline">
              ↗
            </a>
          </>
        )}
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Update `src/components/StatusChip.tsx`**

Replace `"rouge-extreme"` with `"extreme"` and align the type with the five
official values:

```tsx
type StatusValue = "vert" | "jaune" | "orange" | "rouge" | "extreme" | null;

const STATUS_META: Record<
  NonNullable<StatusValue>,
  { label: string; colorClass: string }
> = {
  vert: { label: "Accès autorisé", colorClass: "text-statut-vert" },
  jaune: { label: "Restrictions légères", colorClass: "text-statut-orange" },
  orange: { label: "Restrictions", colorClass: "text-statut-orange" },
  rouge: { label: "Accès restreint", colorClass: "text-statut-rouge" },
  extreme: { label: "Accès interdit", colorClass: "text-statut-rouge" },
};
```

(Rest of the file unchanged — only the type alias and the `"rouge-extreme"`
key rename.)

- [ ] **Step 3: Update `app/(public)/places/[slug]/page.tsx`**

Replace:
```tsx
import {
  getActivePlaces,
  getPlaceBySlug,
  getTodayStatus,
} from "@/src/corpus/queries";
```
with:
```tsx
import {
  getActivePlaces,
  getPlaceBySlug,
  resolvePlaceStatus,
} from "@/src/corpus/queries";
```

Replace:
```tsx
const statusLog = await getTodayStatus(place.id);
```
with:
```tsx
const status = await resolvePlaceStatus(place.id);
```

Replace the `<StatusBlock statusLog={statusLog} ... />` prop with
`<StatusBlock status={status} officialInfoUrl={place.officialInfoUrl} />`.

- [ ] **Step 4: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors. If `StatusChip` is used anywhere with the old
`"rouge-extreme"` literal, fix that call site too (grep first:
`grep -rn "rouge-extreme" app src`).

- [ ] **Step 5: Commit**

```bash
git add src/components/StatusBlock.tsx src/components/StatusChip.tsx "app/(public)/places/[slug]/page.tsx"
git commit -m "Render ZAPEF-resolved status and active-fire caveat on public place page"
```

---

### Task 5: `/admin/statut` daily status page + save action

**Files:**
- Create: `app/admin/statut/page.tsx`
- Create: `app/admin/statut/actions.ts`
- Test: `app/admin/statut/actions.test.ts`

**Interfaces:**
- Consumes: `SignalZone`, `StatusLog`, `ZonePlace` (Task 1/2),
  `resolvePlaceStatus`-adjacent freshness concept (Task 3, not directly
  called — this page reads raw zone/StatusLog rows, not the resolved
  per-place view).
- Produces: `saveStatus(formData: FormData): Promise<void>` server action
  that writes one `StatusLog` per submitted zone and revalidates affected
  place pages.

- [ ] **Step 1: Write `app/admin/statut/page.tsx`**

Server component. Query all `active: true` `SignalZone` rows with their
`SignalSource` (for `signalType`/`provider`) and their most recent
`StatusLog` (today for water/air, tomorrow for fire — compute the relevant
`forDate` per zone's `signalType`). For each zone, determine freshness
state per spec 04 line 120: **confirmed today** (a `StatusLog` row exists
with `confirmedAt` on today's calendar date), **carried forward** (no
row for the target `forDate` yet, but a previous day's row exists — used to
pre-fill the default value), **not checked** (no row at all, ever, for this
zone). Render one row per zone: label, signal-type icon/text, a `<select>`
(one-tap buttons are a `09-design.md` visual concern — a native `<select>`
with the zone's value set is the correct MVP scope here; do not build a
custom button-group component not requested elsewhere in this plan)
pre-selected to the carried-forward or confirmed value, a detail
`<textarea>` pre-filled from `parseNotes` when the level changes (client-side
default via the `<select>`'s associated option, keep it simple — a plain
`defaultValue` on the detail field sourced from the zone's `parseNotes` is
sufficient, no live JS reactivity required for v1), and a freshness badge
distinguishing the three states in text (not color alone, per spec 03's
accessibility floor). Wrap the whole zone list in one `<form
action={saveStatus}>` with a single submit button "Confirmer / Enregistrer".

Value options per `signalType`:
- `FIRE_ACCESS`: `vert, jaune, orange, rouge, extreme`
- `WATER_QUALITY`: `excellente, bonne, suffisante, insuffisante, interdite`
- `AIR_QUALITY`: `bon, moyen, degrade, mauvais, tres-mauvais,
  extremement-mauvais`

Call `await connection()` before the queries (forces dynamic rendering,
same pattern as `app/admin/page.tsx` and `app/admin/new/page.tsx`).

- [ ] **Step 2: Write the failing tests for `saveStatus`**

`app/admin/statut/actions.test.ts`, using the existing `vi.hoisted()`
Prisma-mock convention (see `src/corpus/ingestion.test.ts` for the exact
pattern used elsewhere in this codebase):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsertStatusLogMock, findManyZonePlaceMock, revalidatePathMock } = vi.hoisted(() => ({
  upsertStatusLogMock: vi.fn(),
  findManyZonePlaceMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/src/corpus/db", () => ({
  prisma: {
    statusLog: { upsert: upsertStatusLogMock },
    zonePlace: { findMany: findManyZonePlaceMock },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { saveStatus } from "./actions";

beforeEach(() => {
  upsertStatusLogMock.mockReset();
  findManyZonePlaceMock.mockReset();
  revalidatePathMock.mockReset();
});

describe("saveStatus", () => {
  it("writes one StatusLog per submitted zone with the correct forDate", async () => {
    findManyZonePlaceMock.mockResolvedValue([{ place: { slug: "port-d-alon" } }]);

    const formData = new FormData();
    formData.set("zone-zone1-signalType", "FIRE_ACCESS");
    formData.set("zone-zone1-value", "rouge");
    formData.set("zone-zone1-detail", "8h-17h");

    await saveStatus(formData);

    expect(upsertStatusLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { signalZoneId_forDate: expect.objectContaining({ signalZoneId: "zone1" }) },
        create: expect.objectContaining({ signalZoneId: "zone1", value: "rouge", detail: "8h-17h" }),
      }),
    );
  });

  it("revalidates every place under a changed zone", async () => {
    findManyZonePlaceMock.mockResolvedValue([
      { place: { slug: "port-d-alon" } },
      { place: { slug: "other-place" } },
    ]);

    const formData = new FormData();
    formData.set("zone-zone1-signalType", "FIRE_ACCESS");
    formData.set("zone-zone1-value", "vert");
    formData.set("zone-zone1-detail", "");

    await saveStatus(formData);

    expect(revalidatePathMock).toHaveBeenCalledWith("/places/port-d-alon", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/places/other-place", "page");
  });

  it("skips zones with no submitted value (not touched today)", async () => {
    const formData = new FormData();
    // no zone-* fields set at all

    await saveStatus(formData);

    expect(upsertStatusLogMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
```

Adjust field-naming details (`zone-{id}-value` etc.) to match whatever the
Step 1 form actually emits — write Step 1's field names first, then match
the test to them exactly, not the reverse (the form is the real contract;
the test documents it).

- [ ] **Step 3: Run tests, confirm they fail**

```bash
pnpm exec vitest run app/admin/statut/actions.test.ts
```

Expected: FAIL — `saveStatus` module not found.

- [ ] **Step 4: Implement `app/admin/statut/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/corpus/db";

function forDateFor(signalType: string): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (signalType === "FIRE_ACCESS") {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export async function saveStatus(formData: FormData): Promise<void> {
  const zoneIds = new Set<string>();
  for (const key of formData.keys()) {
    const match = key.match(/^zone-(.+)-value$/);
    if (match) zoneIds.add(match[1]);
  }

  for (const zoneId of zoneIds) {
    const value = formData.get(`zone-${zoneId}-value`);
    const signalType = formData.get(`zone-${zoneId}-signalType`);
    const detail = formData.get(`zone-${zoneId}-detail`);

    if (typeof value !== "string" || value.length === 0) continue;
    if (typeof signalType !== "string") continue;

    const forDate = forDateFor(signalType);

    await prisma.statusLog.upsert({
      where: { signalZoneId_forDate: { signalZoneId: zoneId, forDate } },
      create: {
        signalZoneId: zoneId,
        forDate,
        value,
        detail: typeof detail === "string" && detail.length > 0 ? detail : null,
      },
      update: {
        value,
        detail: typeof detail === "string" && detail.length > 0 ? detail : null,
        confirmedAt: new Date(),
      },
    });

    const zonePlaces = await prisma.zonePlace.findMany({
      where: { signalZoneId: zoneId },
      include: { place: { select: { slug: true } } },
    });
    for (const zp of zonePlaces) {
      revalidatePath(`/places/${zp.place.slug}`, "page");
    }
  }
}
```

- [ ] **Step 5: Run tests, confirm they pass**

```bash
pnpm exec vitest run app/admin/statut/actions.test.ts
```

Expected: all 3 tests pass. If the `upsert` `where` shape doesn't match
Prisma's actual generated compound-unique-key name for
`@@unique([signalZoneId, forDate])` (Prisma names it
`signalZoneId_forDate` by default, but verify against
`prisma/generated/models/StatusLog.ts` rather than assuming), fix the field
name to match what Prisma actually generated.

- [ ] **Step 6: Typecheck and manual smoke check**

```bash
pnpm exec tsc --noEmit
pnpm dev
```

With the dev server running, authenticate to `/admin/statut` (Basic Auth,
`ADMIN_PASSWORD` from `.env.local`) and confirm the 9 Var zones render with
their `SAINTE BAUME` row showing Port d'Alon's `parseNotes` context, submit
a value, and confirm no server error. This is a real UI — verify it in a
browser per this project's standing rule for UI changes, not just via
`curl`.

- [ ] **Step 7: Commit**

```bash
git add app/admin/statut
git commit -m "Add /admin/statut daily zone status page and saveStatus server action"
```

---

### Task 6: Whole-branch review checklist (for the final reviewer, not a task to implement)

Before finishing this plan, the final whole-branch review (per
subagent-driven-development) should specifically verify:

- No remaining references to `SignalSourceOnPlace`, `signalCoverage`,
  `getTodayStatus`, `checkedAt` (on `StatusLog`), or `"rouge-extreme"`
  anywhere in `app/`, `src/`, or test files (`grep -rn` each across the
  repo, excluding `prisma/generated` and `node_modules`).
- `prisma/generated` actually reflects the new schema (the corpus-ingestion
  plan hit exactly this staleness bug once already — re-check
  `pnpm exec prisma generate` was run after the Task 1 migration, not just
  assumed).
- `pnpm exec tsc --noEmit` and the full `pnpm exec vitest run` suite both
  pass on the merge commit, not just per-task.
- The ZAPEF cascade's 4th rule (extreme overrides zapef) has an actual test
  case, not just the 2nd/3rd rules — it's the one most likely to be
  silently dropped under refactoring pressure.
