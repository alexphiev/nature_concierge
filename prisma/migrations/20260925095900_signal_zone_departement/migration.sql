-- AlterTable
ALTER TABLE "SignalZone" ADD COLUMN "departement" TEXT;

-- Backfill from the prefecture that publishes each zone
UPDATE "SignalZone" z
SET "departement" = CASE s."provider"
  WHEN 'Préfecture du Var' THEN '83'
  WHEN 'Préfecture des Bouches-du-Rhône' THEN '13'
END
FROM "SignalSource" s
WHERE z."signalSourceId" = s."id";

-- Fails loudly if a zone from another provider was left unmapped
ALTER TABLE "SignalZone" ALTER COLUMN "departement" SET NOT NULL;
