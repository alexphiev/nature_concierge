-- AlterTable
ALTER TABLE "Source" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- DropEnum
DROP TYPE "SourceType";
