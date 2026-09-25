-- AlterTable
ALTER TABLE "Place" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- DropEnum
DROP TYPE "PlaceType";
