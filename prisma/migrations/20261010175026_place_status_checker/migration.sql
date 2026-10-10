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

-- CreateTable
CREATE TABLE "place_status_source" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "place_id" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{"version":1,"rules":[],"ai":{"mode":"fallback"}}',
    "check_interval_minutes" INTEGER NOT NULL DEFAULT 360,
    "next_check_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_until" TIMESTAMPTZ,
    "last_status" TEXT NOT NULL DEFAULT 'unknown',
    "last_method" TEXT,
    "last_confidence" REAL,
    "last_evidence" TEXT,
    "last_checked_at" TIMESTAMPTZ,
    "last_changed_at" TIMESTAMPTZ,
    "last_content_hash" TEXT,
    "last_etag" TEXT,
    "last_modified" TEXT,
    "last_error" TEXT,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_status_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_status_check" (
    "id" BIGSERIAL NOT NULL,
    "source_id" UUID NOT NULL,
    "invocation_id" TEXT NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "rule_index" INTEGER,
    "confidence" REAL,
    "evidence" TEXT,
    "http_status" INTEGER,
    "content_hash" TEXT,
    "duration_ms" INTEGER,
    "ai_model" TEXT,
    "ai_input_tokens" INTEGER,
    "ai_output_tokens" INTEGER,
    "error" TEXT,

    CONSTRAINT "place_status_check_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_status_source_place_id_idx" ON "place_status_source"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "place_status_source_place_id_url_key" ON "place_status_source"("place_id", "url");

-- CreateIndex
CREATE INDEX "place_status_check_source_id_checked_at_idx" ON "place_status_check"("source_id", "checked_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "place_status_check_source_id_invocation_id_key" ON "place_status_check"("source_id", "invocation_id");

-- AddForeignKey
ALTER TABLE "place_status_source" ADD CONSTRAINT "place_status_source_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_status_check" ADD CONSTRAINT "place_status_check_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "place_status_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Not expressible in the Prisma schema: CHECK constraint, partial index, views.
ALTER TABLE "place_status_source" ADD CONSTRAINT "place_status_source_check_interval_minutes_check" CHECK ("check_interval_minutes" >= 15);

CREATE INDEX "place_status_source_due_idx" ON "place_status_source"("next_check_at") WHERE "enabled";

-- One row per place with at least one enabled source. A result is fresh for 48 h;
-- stale or never-checked sources count as 'unknown'. Most restrictive fresh result
-- wins (closed > open > unknown), ties broken by the most recent check.
CREATE VIEW "place_current_status" AS
SELECT DISTINCT ON (s."place_id")
    s."place_id",
    s."status",
    CASE WHEN s."fresh" THEN s."last_evidence" END AS "cause",
    s."url" AS "source_url",
    s."label" AS "source_label",
    s."last_method" AS "method",
    s."last_checked_at" AS "checked_at",
    s."last_changed_at" AS "changed_at"
FROM (
    SELECT
        src.*,
        f."fresh",
        CASE WHEN f."fresh" AND src."last_status" IN ('open', 'closed') THEN src."last_status" ELSE 'unknown' END AS "status"
    FROM "place_status_source" src
    CROSS JOIN LATERAL (
        SELECT COALESCE(src."last_checked_at" >= now() - interval '48 hours', false) AS "fresh"
    ) f
    WHERE src."enabled"
) s
ORDER BY
    s."place_id",
    CASE s."status" WHEN 'closed' THEN 0 WHEN 'open' THEN 1 ELSE 2 END,
    s."last_checked_at" DESC NULLS LAST,
    s."id";

CREATE VIEW "place_status_health" AS
SELECT
    "id",
    "place_id",
    "url",
    "label",
    "last_status",
    "last_error",
    "consecutive_failures",
    "last_checked_at",
    "check_interval_minutes"
FROM "place_status_source"
WHERE "enabled"
  AND (
    "consecutive_failures" >= 3
    OR COALESCE("last_checked_at", "created_at") < now() - make_interval(mins => 2 * "check_interval_minutes")
    OR "last_error" IS NOT NULL
  );
