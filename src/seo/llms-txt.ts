import type { Place } from "../../prisma/generated/client";
import { TYPE_LABELS } from "../components/PlaceCard";

export type LlmsTxtPlace = Pick<
  Place,
  "id" | "slug" | "name" | "commune" | "type" | "description" | "parentId"
>;

const HEADER = `# Nature Concierge

> Le guide local pour la nature entre Marseille et Bandol : statut du jour (accès incendie) et conseils vérifiés sur le terrain, lieu par lieu.

## Mission

Le guide local pour la nature entre Marseille et Bandol : structurellement
neutre, inter-communes, opinionated, et attentif aux conditions du jour.
Chaque lieu a sa propre page avec un statut du jour (accès incendie, qualité
de l'eau) et des conseils vérifiés sur le terrain — pas un résumé du web.

## Territoire couvert

Littoral entre Marseille et Bandol, ouest Var, et le massif de la
Sainte-Baume.

## Mise à jour

Les statuts (accès incendie, qualité de l'eau) sont vérifiés et mis à jour
chaque jour, généralement en fin d'après-midi.`;

const CONTACT = `## Contact

Pour une recommandation personnalisée, écrire via WhatsApp — le lien est sur
la page d'accueil (/).`;

// First sentence = text up to and including the first ./!/? followed by whitespace or end.
function firstSentence(description: string): string {
  const match = description.match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0] : description;
}

function placeLine(place: LlmsTxtPlace, siteUrl: string, indent: string): string {
  const url = `${siteUrl}/lieux/${place.slug}`;
  const typeLabel = TYPE_LABELS[place.type as Place["type"]];
  const base = `${indent}- [${place.name}](${url}): ${typeLabel} à ${place.commune}.`;
  if (!place.description) return base;
  return `${base} ${firstSentence(place.description)}`;
}

export function buildLlmsTxt(places: LlmsTxtPlace[], siteUrl: string): string {
  const byId = new Map(places.map((p) => [p.id, p]));
  const topLevel = places.filter((p) => !p.parentId || !byId.has(p.parentId));
  const childrenByParentId = new Map<string, LlmsTxtPlace[]>();
  for (const place of places) {
    if (place.parentId && byId.has(place.parentId)) {
      const siblings = childrenByParentId.get(place.parentId) ?? [];
      siblings.push(place);
      childrenByParentId.set(place.parentId, siblings);
    }
  }

  const lines: string[] = [];
  for (const place of topLevel) {
    lines.push(placeLine(place, siteUrl, ""));
    for (const child of childrenByParentId.get(place.id) ?? []) {
      lines.push(placeLine(child, siteUrl, "  "));
    }
  }

  return `${HEADER}\n\n## Lieux\n\n${lines.join("\n")}\n\n${CONTACT}\n`;
}
