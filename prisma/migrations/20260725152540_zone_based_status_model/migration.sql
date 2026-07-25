-- DropForeignKey
ALTER TABLE "SignalSourceOnPlace" DROP CONSTRAINT "SignalSourceOnPlace_placeId_fkey";

-- DropForeignKey
ALTER TABLE "SignalSourceOnPlace" DROP CONSTRAINT "SignalSourceOnPlace_signalSourceId_fkey";

-- DropForeignKey
ALTER TABLE "StatusLog" DROP CONSTRAINT "StatusLog_placeId_fkey";

-- DropForeignKey
ALTER TABLE "StatusLog" DROP CONSTRAINT "StatusLog_signalSourceId_fkey";

-- DropIndex
DROP INDEX "StatusLog_placeId_forDate_idx";

-- DropIndex
DROP INDEX "StatusLog_signalSourceId_placeId_forDate_key";

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "zapef" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SignalSource" DROP COLUMN "parseNotes";

-- AlterTable
ALTER TABLE "StatusLog" DROP COLUMN "checkedAt",
DROP COLUMN "placeId",
DROP COLUMN "signalSourceId",
ADD COLUMN     "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "signalZoneId" TEXT NOT NULL;

-- DropTable
DROP TABLE "SignalSourceOnPlace";

-- CreateTable
CREATE TABLE "SignalZone" (
    "id" TEXT NOT NULL,
    "signalSourceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "externalRef" TEXT,
    "parseNotes" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SignalZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZonePlace" (
    "signalZoneId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,

    CONSTRAINT "ZonePlace_pkey" PRIMARY KEY ("signalZoneId","placeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignalZone_signalSourceId_label_key" ON "SignalZone"("signalSourceId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "SignalSource_provider_signalType_key" ON "SignalSource"("provider", "signalType");

-- CreateIndex
CREATE INDEX "StatusLog_forDate_idx" ON "StatusLog"("forDate");

-- CreateIndex
CREATE UNIQUE INDEX "StatusLog_signalZoneId_forDate_key" ON "StatusLog"("signalZoneId", "forDate");

-- AddForeignKey
ALTER TABLE "SignalZone" ADD CONSTRAINT "SignalZone_signalSourceId_fkey" FOREIGN KEY ("signalSourceId") REFERENCES "SignalSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZonePlace" ADD CONSTRAINT "ZonePlace_signalZoneId_fkey" FOREIGN KEY ("signalZoneId") REFERENCES "SignalZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZonePlace" ADD CONSTRAINT "ZonePlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusLog" ADD CONSTRAINT "StatusLog_signalZoneId_fkey" FOREIGN KEY ("signalZoneId") REFERENCES "SignalZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

