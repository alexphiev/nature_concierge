-- CreateEnum
CREATE TYPE "PlaceType" AS ENUM ('CALANQUE', 'PLAGE', 'MASSIF', 'SENTIER', 'SOMMET', 'SITE');

-- CreateEnum
CREATE TYPE "PlaceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('ACCESS', 'CROWDING', 'SUITABILITY', 'TIP', 'AVOID', 'ALTERNATIVE', 'DECODING');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('GO', 'GO_IF', 'AVOID', 'ALTERNATIVE');

-- CreateEnum
CREATE TYPE "Verification" AS ENUM ('FIELD_VERIFIED', 'OFFICIAL', 'LOCAL_TESTIMONY', 'HEURISTIC');

-- CreateEnum
CREATE TYPE "DecayClass" AS ENUM ('PERMANENT', 'SEASONAL', 'ANNUAL_CHECK');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL', 'PERSONAL_VISIT', 'LOCAL_PERSON', 'OT_CONVERSATION', 'REDDIT_LEAD', 'INSTAGRAM_LEAD', 'FACEBOOK_LEAD', 'PRESS_LEAD');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('FIRE_ACCESS', 'WATER_QUALITY', 'AIR_QUALITY', 'PARKING', 'RESERVATION_QUOTA');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WHATSAPP', 'FORM', 'REDDIT', 'FACEBOOK', 'CAMPING_QR', 'OTHER');

-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('ANSWERED', 'USER_WENT', 'USER_REPORTED_BACK', 'RETURNED_NEW_REQUEST', 'REFERRED_SOMEONE', 'SILENT');

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "type" "PlaceType" NOT NULL,
    "governingAuthority" TEXT,
    "officialInfoUrl" TEXT,
    "description" TEXT,
    "demandRank" INTEGER NOT NULL DEFAULT 999,
    "status" "PlaceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "claimText" TEXT NOT NULL,
    "claimType" "ClaimType" NOT NULL,
    "conditions" TEXT[],
    "audience" TEXT[],
    "verdict" "Verdict" NOT NULL,
    "alternativePlaceId" TEXT,
    "sourceId" TEXT NOT NULL,
    "verification" "Verification" NOT NULL,
    "decayClass" "DecayClass" NOT NULL,
    "verifiedOn" TIMESTAMP(3) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "urlOrRef" TEXT,
    "dateCollected" TIMESTAMP(3) NOT NULL,
    "reliability" INTEGER NOT NULL DEFAULT 2,
    "notes" TEXT,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalSource" (
    "id" TEXT NOT NULL,
    "signalType" "SignalType" NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "updateSchedule" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "parseNotes" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SignalSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalSourceOnPlace" (
    "signalSourceId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,

    CONSTRAINT "SignalSourceOnPlace_pkey" PRIMARY KEY ("signalSourceId","placeId")
);

-- CreateTable
CREATE TABLE "StatusLog" (
    "id" TEXT NOT NULL,
    "signalSourceId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "forDate" DATE NOT NULL,
    "value" TEXT NOT NULL,
    "detail" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" "Channel" NOT NULL,
    "userRef" TEXT NOT NULL,
    "requestText" TEXT NOT NULL,
    "requestType" TEXT,
    "constraintsGiven" TEXT[],
    "timeSpentMin" INTEGER,
    "outcome" "Outcome" NOT NULL DEFAULT 'ANSWERED',
    "outcomeNotes" TEXT,
    "placesRecommended" TEXT[],

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestClaimUsed" (
    "requestId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,

    CONSTRAINT "RequestClaimUsed_pkey" PRIMARY KEY ("requestId","claimId")
);

-- CreateTable
CREATE TABLE "RequestClaimCreated" (
    "requestId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,

    CONSTRAINT "RequestClaimCreated_pkey" PRIMARY KEY ("requestId","claimId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_slug_key" ON "Place"("slug");

-- CreateIndex
CREATE INDEX "Place_status_demandRank_idx" ON "Place"("status", "demandRank");

-- CreateIndex
CREATE INDEX "Claim_placeId_status_idx" ON "Claim"("placeId", "status");

-- CreateIndex
CREATE INDEX "StatusLog_placeId_forDate_idx" ON "StatusLog"("placeId", "forDate");

-- CreateIndex
CREATE UNIQUE INDEX "StatusLog_signalSourceId_placeId_forDate_key" ON "StatusLog"("signalSourceId", "placeId", "forDate");

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_alternativePlaceId_fkey" FOREIGN KEY ("alternativePlaceId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalSourceOnPlace" ADD CONSTRAINT "SignalSourceOnPlace_signalSourceId_fkey" FOREIGN KEY ("signalSourceId") REFERENCES "SignalSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalSourceOnPlace" ADD CONSTRAINT "SignalSourceOnPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusLog" ADD CONSTRAINT "StatusLog_signalSourceId_fkey" FOREIGN KEY ("signalSourceId") REFERENCES "SignalSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusLog" ADD CONSTRAINT "StatusLog_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestClaimUsed" ADD CONSTRAINT "RequestClaimUsed_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestClaimUsed" ADD CONSTRAINT "RequestClaimUsed_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestClaimCreated" ADD CONSTRAINT "RequestClaimCreated_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestClaimCreated" ADD CONSTRAINT "RequestClaimCreated_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
