// Sorts existing claims into practical info vs lived tips.
//
//   pnpm corpus:split-kinds                       dry run: prints the plan, writes claim-kinds.csv
//   pnpm corpus:split-kinds --overrides kinds.json  same, with your manual choices applied
//   pnpm corpus:split-kinds --apply [--overrides kinds.json]
//
// Workflow: run the dry run, open claim-kinds.csv, fix the rows you disagree
// with by putting { "<claimId>": "PRACTICAL_INFO" | "LOCAL_TIP" } in a JSON
// file, then rerun with --apply and the same --overrides file.
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/corpus/db";
import { guessClaimKind } from "../../src/corpus/claim-kind";
import type { ClaimKind } from "../../prisma/generated/client";

const KINDS: ClaimKind[] = ["PRACTICAL_INFO", "LOCAL_TIP"];

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function readOverrides(path: string | undefined): Map<string, ClaimKind> {
  if (!path) return new Map();
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
  const overrides = new Map<string, ClaimKind>();
  for (const [id, kind] of Object.entries(raw)) {
    if (!KINDS.includes(kind as ClaimKind)) {
      throw new Error(`Valeur inconnue pour ${id} : ${kind} (attendu : ${KINDS.join(" ou ")})`);
    }
    overrides.set(id, kind as ClaimKind);
  }
  return overrides;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const overrides = readOverrides(argValue("--overrides"));
  const csvPath = argValue("--csv") ?? "claim-kinds.csv";

  const claims = await prisma.claim.findMany({
    where: { status: { not: "RETIRED" } },
    include: { place: { select: { name: true } }, source: { select: { type: true } } },
    orderBy: [{ placeId: "asc" }, { createdAt: "asc" }],
  });

  const unknownOverrides = [...overrides.keys()].filter(
    (id) => !claims.some((claim) => claim.id === id),
  );
  if (unknownOverrides.length > 0) {
    console.warn(`Overrides ignorés (conseil introuvable) : ${unknownOverrides.join(", ")}`);
  }

  const rows: string[] = [["id", "lieu", "actuel", "propose", "raison", "theme", "texte"].join(",")];
  const changes: { id: string; kind: ClaimKind }[] = [];
  const totals: Record<ClaimKind, number> = { PRACTICAL_INFO: 0, LOCAL_TIP: 0 };

  for (const claim of claims) {
    const guess = guessClaimKind({
      claimType: claim.claimType,
      claimText: claim.claimText,
      verification: claim.verification,
      sourceType: claim.source.type,
    });
    const override = overrides.get(claim.id);
    const kind = override ?? guess.kind;
    const reason = override ? "choix manuel" : guess.reason;
    totals[kind]++;
    if (kind !== claim.kind) changes.push({ id: claim.id, kind });

    const marker = kind === "PRACTICAL_INFO" ? "INFO   " : "CONSEIL";
    console.log(`${marker} ${claim.place.name} · ${claim.claimText}  [${reason}]`);
    rows.push(
      [claim.id, claim.place.name, claim.kind, kind, reason, claim.claimType, claim.claimText]
        .map(csvCell)
        .join(","),
    );
  }

  writeFileSync(csvPath, `${rows.join("\n")}\n`);
  console.log(
    `\n${claims.length} conseil(s) : ${totals.PRACTICAL_INFO} infos pratiques, ${totals.LOCAL_TIP} conseils vécus. ` +
      `${changes.length} à modifier. Détail : ${csvPath}`,
  );

  if (!apply) {
    console.log("Simulation : rien n'a été écrit. Relancez avec --apply pour enregistrer.");
    return;
  }

  for (const kind of KINDS) {
    const ids = changes.filter((change) => change.kind === kind).map((change) => change.id);
    if (ids.length > 0) {
      await prisma.claim.updateMany({ where: { id: { in: ids } }, data: { kind } });
    }
  }
  console.log(`${changes.length} conseil(s) mis à jour. Pensez à revalider le cache : POST /api/revalidate avec REVALIDATE_TOKEN.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
