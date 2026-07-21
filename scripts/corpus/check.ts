import { discoverPlaceFiles } from "./discover-places";
import { validatePlaceFile } from "../../src/corpus/schema";

async function main() {
  const places = await discoverPlaceFiles();
  const slugs = new Set(places.map((p) => p.slug));

  const slugCounts = new Map<string, number>();
  for (const p of places) {
    slugCounts.set(p.slug, (slugCounts.get(p.slug) ?? 0) + 1);
  }
  const duplicateSlugErrors: string[] = [];
  for (const [slug, count] of slugCounts) {
    if (count > 1) {
      duplicateSlugErrors.push(`duplicate slug "${slug}" appears in ${count} files`);
    }
  }

  let hasErrors = duplicateSlugErrors.length > 0;
  const allWarnings: string[] = [];

  for (const err of duplicateSlugErrors) {
    console.error(`✗ ${err}`);
  }

  for (const place of places) {
    const result = validatePlaceFile(place, slugs);
    if (result.errors.length > 0) {
      hasErrors = true;
      console.error(`✗ ${place.slug}: ${result.errors.length} error(s)`);
      for (const e of result.errors) console.error(`  - ${e}`);
    } else {
      console.log(`✓ ${place.slug}`);
    }
    allWarnings.push(...result.warnings);
  }

  if (allWarnings.length > 0) {
    console.log(`\n${allWarnings.length} warning(s):`);
    for (const w of allWarnings) console.log(`  ! ${w}`);
  }

  if (hasErrors) {
    console.error("\ncorpus:check FAILED");
    process.exit(1);
  }

  console.log(`\ncorpus:check passed — ${places.length} place(s) validated`);
}

main();
