import type { Metadata } from "next";
import { connection } from "next/server";
import { prisma } from "@/src/corpus/db";
import { parisDateString, parisToday } from "@/src/corpus/paris-date";
import { saveStatus } from "./actions";

export const metadata: Metadata = {
  title: "Statut du jour — Admin — Guide Nature de La Ciotat",
  robots: { index: false, follow: false },
};

const VALUE_OPTIONS: Record<string, string[]> = {
  FIRE_ACCESS: ["vert", "jaune", "orange", "rouge", "extreme"],
  WATER_QUALITY: [
    "excellente",
    "bonne",
    "suffisante",
    "insuffisante",
    "interdite",
  ],
  AIR_QUALITY: [
    "bon",
    "moyen",
    "degrade",
    "mauvais",
    "tres-mauvais",
    "extremement-mauvais",
  ],
};

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  FIRE_ACCESS: "Feu / accès massif",
  WATER_QUALITY: "Qualité de l'eau",
  AIR_QUALITY: "Qualité de l'air",
};

type Freshness = "confirmed" | "carried" | "unchecked";

const FRESHNESS_LABEL: Record<Freshness, string> = {
  confirmed: "Confirmé aujourd'hui",
  carried: "Reporté (non confirmé)",
  unchecked: "Jamais vérifié",
};

const FRESHNESS_STYLE: Record<Freshness, string> = {
  confirmed: "text-statut-vert bg-statut-vert/15",
  carried: "text-statut-orange bg-statut-orange/15",
  unchecked: "text-statut-inconnu bg-statut-inconnu/15",
};

function FreshnessPill({ freshness }: { freshness: Freshness }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-wide ${FRESHNESS_STYLE[freshness]}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {FRESHNESS_LABEL[freshness]}
    </span>
  );
}

export default async function AdminStatutPage() {
  await connection();

  const zones = await prisma.signalZone.findMany({
    where: { active: true },
    include: {
      signalSource: { select: { signalType: true, provider: true } },
    },
    orderBy: { label: "asc" },
  });

  const today = parisToday();
  const forDate = today;

  const rows = await Promise.all(
    zones.map(async (zone) => {
      const signalType = zone.signalSource.signalType;

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

      if (logForTarget && parisDateString(logForTarget.confirmedAt) === parisDateString(today)) {
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
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map(
            ({ zone, signalType, freshness, defaultValue, defaultDetail }) => (
              <li
                key={zone.id}
                className="flex flex-col gap-2 rounded-2xl border border-sable/45 bg-calcaire-deep p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display text-lg">{zone.label}</span>
                  <span className="font-mono text-xs text-encre/70">
                    {SIGNAL_TYPE_LABEL[signalType] ?? signalType}
                  </span>
                </div>

                <FreshnessPill freshness={freshness} />

                <label className="flex flex-col gap-1">
                  <span className="text-sm text-encre/70">Niveau</span>
                  <select
                    name={`zone-${zone.id}-value`}
                    defaultValue={defaultValue}
                    className="w-full min-w-0 rounded-[10px] border border-sable/40 bg-calcaire p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
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
                    className="w-full min-w-0 rounded-[10px] border border-sable/40 bg-calcaire p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
                  />
                </label>
              </li>
            ),
          )}
        </ul>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-encre/70">Date du statut</span>
          <input
            type="date"
            name="forDate"
            required
            defaultValue={parisDateString()}
            className="w-full min-w-0 rounded-[10px] border border-sable/40 bg-calcaire p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
          />
        </label>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white transition-colors hover:bg-mediterranee-deep sm:w-auto"
        >
          Confirmer / Enregistrer
        </button>
      </form>
    </main>
  );
}
