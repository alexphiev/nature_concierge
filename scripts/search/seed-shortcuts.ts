import { prisma } from "../../src/corpus/db";

const PALETTES = [
  { bgColor: "#F6D98B", fgColor: "#4A3A0A" },
  { bgColor: "#A9DCD3", fgColor: "#0B3A44" },
  { bgColor: "#F6B39A", fgColor: "#5A1E10" },
  { bgColor: "#C9E0A8", fgColor: "#2A4318" },
];

const SHORTCUTS: { label: string; intro: string }[] = [
  { label: "Avec de jeunes enfants", intro: "Des lieux courts d’accès, avec de l’ombre et une entrée dans l’eau facile." },
  { label: "Première fois à La Ciotat", intro: "Pour comprendre le coin en une journée : la roche rouge, la mer et la vue sur le Bec de l’Aigle." },
  { label: "Coucher de soleil", intro: "Les endroits où la lumière du soir vaut le détour." },
  { label: "Avec un chien", intro: "Les lieux où votre chien est le bienvenu." },
  { label: "Sans voiture", intro: "Accessibles à pied, en bus ou en navette." },
  { label: "Baignade au calme", intro: "Des criques abritées pour nager tranquillement." },
  { label: "Snorkeling", intro: "Une eau claire et des fonds rocheux pour mettre la tête sous l’eau." },
  { label: "Petite balade (moins de 2 h)", intro: "Une sortie courte, faisable sans préparation." },
  { label: "Belle randonnée", intro: "Pour marcher plusieurs heures, avec de la vue en récompense." },
  { label: "Pique-nique", intro: "De la place, de l’ombre et une belle vue pour poser la nappe." },
  { label: "Loin de la foule", intro: "Des coins moins connus, où l’on respire." },
  { label: "Un jour de mistral", intro: "Des lieux abrités quand le vent souffle fort." },
  { label: "Tôt le matin", intro: "Pour profiter du calme et de la fraîcheur avant tout le monde." },
  { label: "Par forte chaleur", intro: "De l’ombre, de l’eau et des accès courts." },
  { label: "Vue sur la mer", intro: "Les panoramas qui valent la montée." },
  { label: "Criques et calanques", intro: "Les criques et calanques du coin, de la plus simple à la plus sauvage." },
  { label: "Accessible en poussette", intro: "Des chemins roulants, sans marches ni rochers." },
  { label: "Balade tranquille pour seniors", intro: "Des sorties sans dénivelé, avec de l’ombre pour souffler." },
  { label: "Observer la faune et la flore", intro: "Pour ouvrir l’œil : oiseaux, plantes du littoral et vie sous-marine." },
  { label: "Sortie hors saison", intro: "Des lieux qui gardent leur charme quand la saison est finie." },
];

async function main() {
  for (const [index, shortcut] of SHORTCUTS.entries()) {
    const data = { ...shortcut, ...PALETTES[index % PALETTES.length], order: index };
    await prisma.searchShortcut.upsert({
      where: { label: shortcut.label },
      create: data,
      update: data,
    });
  }
  console.log(`search:seed — ${SHORTCUTS.length} shortcuts upserted`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
