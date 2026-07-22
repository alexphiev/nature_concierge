-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING_REVIEW', 'ERROR', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "IngestionDraft" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputText" TEXT,
    "inputImages" TEXT[],
    "transcript" TEXT,
    "rawModelOutput" JSONB,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "draftPlace" JSONB,
    "draftClaims" JSONB NOT NULL,

    CONSTRAINT "IngestionDraft_pkey" PRIMARY KEY ("id")
);
