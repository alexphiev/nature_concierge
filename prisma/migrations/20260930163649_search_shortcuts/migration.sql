-- CreateTable
CREATE TABLE "SearchShortcut" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL,
    "fgColor" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SearchShortcut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchShortcut_label_key" ON "SearchShortcut"("label");
