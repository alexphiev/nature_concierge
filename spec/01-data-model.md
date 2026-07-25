# 01 — Data Model (Prisma + PostgreSQL)

## Design rules (enforced by convention + seed validation, not only by the DB)

1. **A claim is a decision-relevant, conditional, opinionated assertion.**
   Description text lives on `Place.description`, never in `Claim`.
2. **A claim without conditions is invalid** unless `decayClass = PERMANENT`
   (topography-class facts). The seed validator enforces this.
3. **Daily-changing facts never live in `Claim`.** They live in `StatusLog`,
   keyed to a `SignalZone` (a source's official zone — a fire massif, a
   monitored beach), not directly to a `Place`. Places attach to zones via
   `ZonePlace`, assigned once at place creation. A claim may describe the *rule*
   ("`rouge` here means 8h–17h, main beach only"); the *current level* is a
   status resolved through the place's zone **and its `zapef` flag** — a ZAPEF
   place stays open under restrictions at `rouge` but closes at `extreme`, like
   everywhere else. Full resolution order in `04-signal-ops.md`; do not
   implement status display as a plain zone lookup.
4. **Media are leads, never content.** `Source` records where a lead came from;
   `Claim.claimText` is always authored by us. No document storage tables exist.
5. **Enums-as-string-arrays for taxonomy fields** (`conditions`, `audience`).
   The taxonomy will change weekly in August; zod validates values at seed time,
   avoiding a Postgres enum migration per learning. Stable single-value fields
   (verdict, verification, decayClass, claimType) are real Prisma enums.

## Prisma schema

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------- Core corpus ----------

model Place {
  id                 String      @id @default(cuid())
  slug               String      @unique // "port-d-alon"
  name               String      // "Calanque de Port d'Alon"
  commune            String      // "Saint-Cyr-sur-Mer"
  departement        String      // "83" | "13" — decides which préfecture governs
  lat                Float
  lng                Float
  type               PlaceType
  governingAuthority String?     // "Ville de Saint-Cyr (Espaces Naturels)", "PN Calanques"…
  officialInfoUrl    String?     // what the status block links to
  description        String?     // neutral, short; NOT claims
  demandRank         Int         @default(999) // 1 = head of demand curve; drives coverage priority
  zapef              Boolean     @default(false) // Zone d'Accueil du Public en Forêt: official
                                 // dérogation at `rouge`, but NOT at `extreme`. See 04-signal-ops.md.
  status             PlaceStatus @default(DRAFT)
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  claims             Claim[]     @relation("PlaceClaims")
  alternativeOf      Claim[]     @relation("AlternativePlace")
  zones              ZonePlace[]
  ingestionDrafts    IngestionDraft[] // see 11-admin-ingestion-ui.md

  @@index([status, demandRank])
}

enum PlaceType {
  CALANQUE
  PLAGE
  MASSIF
  SENTIER
  SOMMET
  SITE
}

enum PlaceStatus {
  DRAFT
  ACTIVE
  RETIRED
}

model Claim {
  id                 String       @id @default(cuid())
  placeId            String
  place              Place        @relation("PlaceClaims", fields: [placeId], references: [id])

  claimText          String       // one opinionated sentence, authored by us
  claimType          ClaimType
  conditions         String[]     // validated by zod against taxonomy.ts (e.g. "ete", "dimanche", "mistral", "code-rouge", "11h-13h")
  audience           String[]     // e.g. "famille-jeunes-enfants", "pmr", "chiens", "sans-voiture", "seniors", "sportifs", "tous"
  verdict            Verdict
  alternativePlaceId String?      // required when verdict = ALTERNATIVE
  alternativePlace   Place?       @relation("AlternativePlace", fields: [alternativePlaceId], references: [id])

  sourceId           String
  source             Source       @relation(fields: [sourceId], references: [id])
  verification       Verification
  decayClass         DecayClass
  verifiedOn         DateTime     // last date the claim was checked true
  isPublic           Boolean      @default(false) // giveaway line: only hook claims render on the site
  status             ClaimStatus  @default(DRAFT)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  requestsUsedIn     RequestClaimUsed[]
  requestsCreatedBy  RequestClaimCreated[]

  @@index([placeId, status])
}

enum ClaimType {
  ACCESS          // rules, entrances, hours
  CROWDING        // saturation patterns
  SUITABILITY     // audience fit (stroller, PMR, kids, dogs)
  TIP             // micro-logistics, temporal windows
  AVOID           // negative verdicts, failure modes
  ALTERNATIVE     // dispersal edges
  DECODING        // institutional decoding ("code rouge here means…")
}

enum Verdict {
  GO
  GO_IF
  AVOID
  ALTERNATIVE
}

enum Verification {
  FIELD_VERIFIED   // we were there
  OFFICIAL         // préfecture, mairie, park — in writing
  LOCAL_TESTIMONY  // told by a local pro/resident, not yet verified by us
  HEURISTIC        // pattern we believe but haven't verified
}

enum DecayClass {
  PERMANENT     // topography, exposure — never expires
  SEASONAL      // re-verify each pre-season
  ANNUAL_CHECK  // rules that change by arrêté — check once a year
  // note: no DAILY. Daily facts are StatusLog rows by design.
}

enum ClaimStatus {
  DRAFT
  PUBLISHED
  RETIRED
}

model Source {
  id            String     @id @default(cuid())
  type          SourceType
  urlOrRef      String?    // URL, "conversation OT La Ciotat 24/07", email ref…
  dateCollected DateTime
  reliability   Int        @default(2) // 1–3, subjective
  notes         String?
  claims        Claim[]
}

enum SourceType {
  OFFICIAL
  PERSONAL_VISIT
  LOCAL_PERSON
  OT_CONVERSATION
  REDDIT_LEAD
  INSTAGRAM_LEAD
  FACEBOOK_LEAD
  PRESS_LEAD
}

// ---------- Real-time layer (separate lane, automatable later) ----------

model SignalSource {
  id             String     @id @default(cuid())
  signalType     SignalType
  provider       String     // "Préfecture du Var", "ARS baignades", "ATMO Sud"
  url            String
  updateSchedule String     // "daily ~18h, veille pour lendemain"
  format         String     // "carte web", "PDF", "API"
  active         Boolean    @default(true)

  zones          SignalZone[]
}

// The unit you actually see on the official map/bulletin — a fire-risk massif
// zone, a monitored beach, an air-quality sector. Créated rarely (setup or
// when a new zone type appears); daily updates target zones, not places.
model SignalZone {
  id             String       @id @default(cuid())
  signalSourceId String
  signalSource   SignalSource @relation(fields: [signalSourceId], references: [id])

  label          String       // matches the official naming exactly, e.g. "SAINTE BAUME"
  externalRef    String?      // the official identifier (massif number / WFS feature id) — the
                               // join key for automated ingestion later. See 04-signal-ops.md.
  parseNotes     String       // decoding rule for this zone, e.g. Port d'Alon red-code detail
                               // also used as the pre-fill template for the daily detail field
  active         Boolean      @default(true)

  places         ZonePlace[]
  statusLogs     StatusLog[]
}

// Assigned once at setup (or when a new place is added under an existing
// zone), never touched in the daily flow.
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

  forDate      DateTime   @db.Date // date the status applies to (tomorrow, for 18h fire checks)
  value        String     // normalized: "vert" | "jaune" | "orange" | "rouge" | "extreme"
                          // (fire) / "excellente" … "interdite" (water) — see 04-signal-ops.md
  detail       String?    // "8h–17h, plage principale seulement" — pre-filled from parseNotes, editable
  confirmedAt  DateTime   @default(now()) // set only on explicit save, not on silent carry-forward

  @@unique([signalZoneId, forDate])
  @@index([forDate])
}

// ---------- Concierge log (the validation instrument) ----------

model Request {
  id               String        @id @default(cuid())
  date             DateTime      @default(now())
  channel          Channel
  userRef          String        // initials/pseudo — return detection only
  requestText      String        // verbatim
  requestType      String?       // tagged against OT top-10 taxonomy
  constraintsGiven String[]      // same vocabulary as Claim.conditions/audience
  timeSpentMin     Int?
  outcome          Outcome       @default(ANSWERED)
  outcomeNotes     String?

  placesRecommended String[]     // place slugs (kept loose on purpose)
  claimsUsed        RequestClaimUsed[]
  claimsCreated     RequestClaimCreated[]
}

model RequestClaimUsed {
  requestId String
  claimId   String
  request   Request @relation(fields: [requestId], references: [id])
  claim     Claim   @relation(fields: [claimId], references: [id])
  @@id([requestId, claimId])
}

model RequestClaimCreated {
  requestId String
  claimId   String
  request   Request @relation(fields: [requestId], references: [id])
  claim     Claim   @relation(fields: [claimId], references: [id])
  @@id([requestId, claimId])
}

enum Channel {
  WHATSAPP
  FORM
  REDDIT
  FACEBOOK
  CAMPING_QR
  OTHER
}

enum Outcome {
  ANSWERED
  USER_WENT
  USER_REPORTED_BACK
  RETURNED_NEW_REQUEST
  REFERRED_SOMEONE
  SILENT
}
```

## Taxonomy file (single source of truth for string arrays)

`src/corpus/taxonomy.ts` exports `CONDITIONS`, `AUDIENCES`, `REQUEST_TYPES` as
`const` arrays + zod enums. Seed validation and (later) any UI import from here.
Adding a taxonomy value = one-line PR, no migration.

## Derived metrics (implemented as SQL views or script queries, not tables)

- **Corpus reuse rate**: avg `claimsUsed` per request over time (should rise).
- **Gap rate**: requests with ≥1 `claimsCreated` (should fall).
- **Return rate**: distinct `userRef` with ≥2 requests / distinct `userRef`.
- **Coverage depth**: published claims per ACTIVE place vs `demandRank`.
