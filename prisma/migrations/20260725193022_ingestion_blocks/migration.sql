-- Data-loss note: clean cutover from flat IngestionDraft to place-scoped
-- IngestionDraft + IngestionBlock. Existing rows (6 total: 4 PENDING_REVIEW,
-- 2 ERROR) are deleted because the old flat shape has no placeId and cannot
-- be backfilled automatically. This is the confirmed cutover decision.
TRUNCATE TABLE "IngestionDraft";

-- CreateEnum
CREATE TYPE "BlockStatus" AS ENUM ('PENDING_REVIEW', 'ERROR', 'RESOLVED');

-- AlterTable
ALTER TABLE "IngestionDraft" DROP COLUMN "draftClaims",
DROP COLUMN "draftPlace",
DROP COLUMN "inputImages",
DROP COLUMN "inputText",
DROP COLUMN "rawModelOutput",
DROP COLUMN "transcript",
ADD COLUMN     "placeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "IngestionBlock" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "inputSourceHint" TEXT,
    "inputSourceType" TEXT,
    "inputText" TEXT,
    "inputImages" BYTEA[],
    "transcript" TEXT,
    "rawModelOutput" JSONB,
    "draftSource" JSONB,
    "draftClaims" JSONB NOT NULL,
    "sourceId" TEXT,
    "status" "BlockStatus" NOT NULL DEFAULT 'PENDING_REVIEW',

    CONSTRAINT "IngestionBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngestionBlock_draftId_order_key" ON "IngestionBlock"("draftId", "order");

-- CreateIndex
CREATE INDEX "IngestionDraft_status_createdAt_idx" ON "IngestionDraft"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "IngestionDraft" ADD CONSTRAINT "IngestionDraft_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionBlock" ADD CONSTRAINT "IngestionBlock_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "IngestionDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionBlock" ADD CONSTRAINT "IngestionBlock_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
