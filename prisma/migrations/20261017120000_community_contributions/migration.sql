◇ injected env (0) from .env.local // tip: ⌘ enable debugging { debug: true }
-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('TIP', 'CORRECTION', 'PLACE', 'PHOTOS');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('UNCONFIRMED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CorrectionKind" AS ENUM ('OUTDATED', 'WRONG', 'MISSING_DETAIL');

-- DropForeignKey
ALTER TABLE "RequestClaimUsed" DROP CONSTRAINT "RequestClaimUsed_requestId_fkey";

-- DropForeignKey
ALTER TABLE "RequestClaimUsed" DROP CONSTRAINT "RequestClaimUsed_claimId_fkey";

-- DropForeignKey
ALTER TABLE "RequestClaimCreated" DROP CONSTRAINT "RequestClaimCreated_requestId_fkey";

-- DropForeignKey
ALTER TABLE "RequestClaimCreated" DROP CONSTRAINT "RequestClaimCreated_claimId_fkey";

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "proposedById" TEXT;

-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "authorDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "authorId" TEXT;

-- DropTable
DROP TABLE "Request";

-- DropTable
DROP TABLE "RequestClaimUsed";

-- DropTable
DROP TABLE "RequestClaimCreated";

-- DropEnum
DROP TYPE "Channel";

-- DropEnum
DROP TYPE "Outcome";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "commune" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "type" "ContributionType" NOT NULL,
    "status" "ContributionStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "userId" TEXT,
    "pendingEmail" TEXT,
    "pendingName" TEXT,
    "pendingCommune" TEXT,
    "placeId" TEXT,
    "claimId" TEXT,
    "text" TEXT,
    "claimType" "ClaimType",
    "correctionKind" "CorrectionKind",
    "placeName" TEXT,
    "placeCommune" TEXT,
    "locationHint" TEXT,
    "photosConsentAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionPhoto" (
    "id" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContributionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "Contribution_status_createdAt_idx" ON "Contribution"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Contribution_userId_placeId_status_idx" ON "Contribution"("userId", "placeId", "status");

-- CreateIndex
CREATE INDEX "Contribution_pendingEmail_status_idx" ON "Contribution"("pendingEmail", "status");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionPhoto" ADD CONSTRAINT "ContributionPhoto_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

