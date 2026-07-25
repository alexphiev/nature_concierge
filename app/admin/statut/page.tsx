import type { Metadata } from "next";
import { connection } from "next/server";
import { prisma } from "@/src/corpus/db";
import { saveStatus } from "./actions";

export const metadata: Metadata = {
  title: "Statut du jour — Admin — Nature Concierge",
  robots: { index: false, follow: false },
};

const VALUE_OPTIONS: Record<string, string[]> = {
  FIRE_ACCESS: ["vert", "jaune", "orange", "rouge", "extreme"],
  WATER_QUALITY: ["excellente", "bonne", "suffisante", "insuffisante", "interdite"],
  AIR_QUALITY: ["bon", "moyen", "degrade", "mauvais", "tres-mauvais", "extremement-mauvais"],
};

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  FIRE_ACCESS: "Feu / accès massif",
  WATER_QUALITY: "Qualité de l'eau",
  AIR_QUALITY: "Qualité de l'air",
};

function forDateFor(signalType: string): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (signalType === "FIRE_ACCESS") {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function isSameCalendarDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Freshness = "confirmed" | "carried" | "unchecked";

const FRESHNESS_LABEL: Record<Freshness, string> = {
  confirmed: "Confirmé aujourd'hui",
  carried: "Reporté (non confirmé)",
  unchecked: "Jamais vérifié",
};

export default async function AdminStatutPage() {
  await connection();

  const zones = await prisma.signalZone.findMany({
    where: { active: true },
    include: {
      signalSource: { select: { signalType: true, provider: true } },
    },
    orderBy: { label: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await Promise.all(
    zones.map(async (zone) => {
      const signalType = zone.signalSource.signalType;
      const forDate = forDateFor(signalType);

      const [logForTarget, latestLog] = await Promise.all([
        prisma.statusLog.findUnique({
          where: { signalZoneId_forDate: { signalZoneId: zone.id, forDate } },
        }),
        prisma.statusLog.findFirst({
          where: { signalZoneId: zone.id },
          orderBy: { forDate: "desc" },
        }),
      ]);

      let freshness: Freshness;
      let defaultValue = "";
      let defaultDetail = "";

      if (logForTarget && isSameCalendarDate(logForTarget.confirmedAt, today)) {
        freshness = "confirmed";
        defaultValue = logForTarget.value;
        defaultDetail = logForTarget.detail ?? zone.parseNotes;
      } else if (latestLog) {
        freshness = "carried";
        defaultValue = latestLog.value;
        defaultDetail = latestLog.detail ?? zone.parseNotes;
      } else {
        freshness = "unchecked";
        defaultDetail = zone.parseNotes;
      }

      return {
        zone,
        signalType,
        forDate,
        freshness,
        defaultValue,
        defaultDetail,
      };
    }),
  );

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">Statut du jour</h1>
      <form action={saveStatus} className="flex flex-col gap-4">
        <ul className="flex flex-col gap-4">
          {rows.map(({ zone, signalType, freshness, defaultValue, defaultDetail }) => (
            <li
              key={zone.id}
              className="flex flex-col gap-2 rounded-[10px] border border-sable/40 bg-calcaire-deep p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-display text-lg">{zone.label}</span>
                <span className="font-mono text-xs text-encre/70">
                  {SIGNAL_TYPE_LABEL[signalType] ?? signalType}
                </span>
              </div>

              <p className="font-mono text-sm">{FRESHNESS_LABEL[freshness]}</p>

              <input type="hidden" name={`zone-${zone.id}-signalType`} value={signalType} />

              <label className="flex flex-col gap-1">
                <span className="text-sm text-encre/70">Niveau</span>
                <select
                  name={`zone-${zone.id}-value`}
                  defaultValue={defaultValue}
                  className="rounded-[10px] border border-sable/40 bg-calcaire p-2"
                >
                  <option value="">— Non renseigné —</option>
                  {(VALUE_OPTIONS[signalType] ?? []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-encre/70">Détail</span>
                <textarea
                  name={`zone-${zone.id}-detail`}
                  rows={2}
                  defaultValue={defaultDetail}
                  placeholder={zone.parseNotes}
                  className="rounded-[10px] border border-sable/40 bg-calcaire p-2"
                />
              </label>
            </li>
          ))}
        </ul>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white sm:w-auto"
        >
          Confirmer / Enregistrer
        </button>
      </form>
    </main>
  );
}
