-- DropForeignKey
ALTER TABLE "SignalZone" DROP CONSTRAINT "SignalZone_signalSourceId_fkey";

-- DropForeignKey
ALTER TABLE "StatusLog" DROP CONSTRAINT "StatusLog_signalZoneId_fkey";

-- DropForeignKey
ALTER TABLE "ZonePlace" DROP CONSTRAINT "ZonePlace_placeId_fkey";

-- DropForeignKey
ALTER TABLE "ZonePlace" DROP CONSTRAINT "ZonePlace_signalZoneId_fkey";

-- AlterTable
ALTER TABLE "Place" DROP COLUMN "zapef";

-- DropTable
DROP TABLE "SignalSource";

-- DropTable
DROP TABLE "SignalZone";

-- DropTable
DROP TABLE "StatusLog";

-- DropTable
DROP TABLE "ZonePlace";

-- DropEnum
DROP TYPE "SignalType";
