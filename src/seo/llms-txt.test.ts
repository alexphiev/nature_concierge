import { describe, it, expect } from "vitest";
import { buildLlmsTxt, type LlmsTxtPlace } from "./llms-txt";

function makePlace(overrides: Partial<LlmsTxtPlace> = {}): LlmsTxtPlace {
  return {
    id: "place-1",
    slug: "calanque-du-mugel",
    name: "Calanque du Mugel",
    commune: "La Ciotat",
    type: "CALANQUE",
    description: null,
    parentId: null,
    ...overrides,
  };
}

const SITE_URL = "http://localhost:3000";

describe("buildLlmsTxt", () => {
  it("includes the header, mission, territoire, mise a jour and contact sections verbatim", () => {
    const result = buildLlmsTxt([], SITE_URL);
    expect(result).toContain(
      "> Le guide local pour la nature entre Marseille et Bandol : statut du jour (accès incendie) et conseils vérifiés sur le terrain, lieu par lieu.",
    );
    expect(result).toContain("## Mission");
    expect(result).toContain(
      "Le guide local pour la nature entre Marseille et Bandol : structurellement\nneutre, inter-communes, opinionated, et attentif aux conditions du jour.",
    );
    expect(result).toContain("## Territoire couvert");
    expect(result).toContain(
      "Littoral entre Marseille et Bandol, ouest Var, et le massif de la\nSainte-Baume.",
    );
    expect(result).toContain("## Mise à jour");
    expect(result).toContain(
      "Les statuts (accès incendie, qualité de l'eau) sont vérifiés et mis à jour\nchaque jour, généralement en fin d'après-midi.",
    );
    expect(result).toContain("## Contact");
    expect(result).toContain(
      "Pour une recommandation personnalisée, écrire via WhatsApp — le lien est sur\nla page d'accueil (/).",
    );
  });

  it("lists a top-level place with type label, absolute URL and first sentence of description", () => {
    const place = makePlace({
      slug: "calanque-du-mugel",
      name: "Calanque du Mugel",
      commune: "La Ciotat",
      type: "CALANQUE",
      description: "Calanque emblématique avec une eau turquoise. Accès à pied uniquement.",
    });
    const result = buildLlmsTxt([place], SITE_URL);
    expect(result).toContain(
      "- [Calanque du Mugel](http://localhost:3000/lieux/calanque-du-mugel): Calanque à La Ciotat. Calanque emblématique avec une eau turquoise.",
    );
  });

  it("omits the description clause entirely when there is no description", () => {
    const place = makePlace({ description: null });
    const result = buildLlmsTxt([place], SITE_URL);
    expect(result).toContain(
      "- [Calanque du Mugel](http://localhost:3000/lieux/calanque-du-mugel): Calanque à La Ciotat.\n",
    );
  });

  it("nests a spot under its parent with 2-space indent", () => {
    const parent = makePlace({
      id: "parent-id-mugel",
      slug: "calanque-du-mugel",
      name: "Calanque du Mugel",
      commune: "La Ciotat",
      type: "CALANQUE",
      parentId: null,
    });
    const spot = makePlace({
      id: "spot-id-anse",
      slug: "anse-du-sec",
      name: "Anse du Sec",
      commune: "La Ciotat",
      type: "SITE",
      description: null,
      parentId: "parent-id-mugel",
    });
    const result = buildLlmsTxt([parent, spot], SITE_URL);
    expect(result).toMatch(
      /- \[Calanque du Mugel\]\(http:\/\/localhost:3000\/lieux\/calanque-du-mugel\): Calanque à La Ciotat\.\n {2}- \[Anse du Sec\]/,
    );
  });

  it("lists a spot top-level when its parent is not in the input list (orphan)", () => {
    const spot = makePlace({
      id: "spot-orpheline",
      slug: "anse-orpheline",
      name: "Anse Orpheline",
      commune: "Bandol",
      type: "SITE",
      description: null,
      parentId: "missing-parent-id",
    });
    const result = buildLlmsTxt([spot], SITE_URL);
    expect(result).toContain("- [Anse Orpheline](http://localhost:3000/lieux/anse-orpheline)");
    expect(result).not.toMatch(/^\s{2}-/m);
  });

  it("uses absolute URLs built from siteUrl", () => {
    const place = makePlace({ slug: "plage-des-lecques" });
    const result = buildLlmsTxt([place], "https://natureconcierge.fr");
    expect(result).toContain("https://natureconcierge.fr/lieux/plage-des-lecques");
  });
});
