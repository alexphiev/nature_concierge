-- CreateEnum
CREATE TYPE "ClaimKind" AS ENUM ('PRACTICAL_INFO', 'LOCAL_TIP');

-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "kind" "ClaimKind" NOT NULL DEFAULT 'LOCAL_TIP';

-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN     "claimKind" "ClaimKind",
ADD COLUMN     "sourceHint" TEXT;
