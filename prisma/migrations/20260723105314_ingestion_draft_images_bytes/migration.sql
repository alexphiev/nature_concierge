/*
  Warnings:

  - The `inputImages` column on the `IngestionDraft` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "IngestionDraft" DROP COLUMN "inputImages",
ADD COLUMN     "inputImages" BYTEA[];
