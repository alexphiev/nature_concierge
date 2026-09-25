-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Place_parentId_idx" ON "Place"("parentId");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
