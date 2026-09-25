export interface SignalZoneSeed {
  label: string;
  departement: string;
  externalRef: string;
  parseNotes: string;
}

export interface SignalSourceSeed {
  key: string;
  signalType: "FIRE_ACCESS" | "WATER_QUALITY" | "AIR_QUALITY";
  provider: string;
  url: string;
  updateSchedule: string;
  format: string;
  zones: SignalZoneSeed[];
}

export const SIGNAL_SOURCES: SignalSourceSeed[] = [
  {
    key: "fire-83",
    signalType: "FIRE_ACCESS",
    provider: "Préfecture du Var",
    url: "https://risque-prevention-incendie.fr/var",
    updateSchedule: "daily ~18h, veille pour lendemain",
    format: "carte web",
    zones: [
      {
        label: "MONTS TOULONNAIS",
        departement: "83",
        externalRef: "1",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "SAINTE BAUME",
        departement: "83",
        externalRef: "2",
        parseNotes:
          "Couleur par massif. Port d'Alon (ZAPEF) : rouge = ouvert 8h–17h, pinède + plage principale uniquement, parking réduit ; extrême = fermé y compris piétons.",
      },
      {
        label: "HAUT VAR",
        departement: "83",
        externalRef: "3",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "CORNICHE DES MAURES",
        departement: "83",
        externalRef: "4",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "MAURES",
        departement: "83",
        externalRef: "5",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "CENTRE VAR",
        departement: "83",
        externalRef: "6",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "PLATEAU DE CANJUERS",
        departement: "83",
        externalRef: "7",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "ESTEREL",
        departement: "83",
        externalRef: "8",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
      {
        label: "ILES D'HYERES",
        departement: "83",
        externalRef: "9",
        parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
      },
    ],
  },
  {
    key: "fire-13",
    signalType: "FIRE_ACCESS",
    provider: "Préfecture des Bouches-du-Rhône",
    url: "https://risque-prevention-incendie.fr/bouches-du-rhone",
    updateSchedule: "daily ~18h",
    format: "carte web",
    // Official massif list from the prefecture's access map (risque-prevention-incendie.fr/bouches-du-rhone)
    zones: [
      "ALPILLES",
      "ARBOIS",
      "CALANQUES",
      "CAP CANAILLE",
      "CASTILLON",
      "CHAÎNE DES CÔTES",
      "CHAMBREMONT",
      "COLLINES DE GARDANNE",
      "CONCORS",
      "COTE BLEUE",
      "ETOILE",
      "GARLABAN",
      "GRAND CAUNET",
      "LANÇON",
      "LES ROQUES",
      "MONTAGNETTE",
      "MONTAIGUET",
      "PONT DE RHAUD",
      "QUATRE TERMES",
      "REGAGNAS",
      "ROUGADOU",
      "SAINTE-BAUME",
      "SAINTE-VICTOIRE",
      "SULAUZE",
      "TREVARESSE",
    ].map((label, i) => ({
      label,
      departement: "13",
      externalRef: String(i + 1),
      parseNotes: "Couleur par massif, légende officielle à 5 niveaux.",
    })),
  },
  {
    key: "water-ars",
    signalType: "WATER_QUALITY",
    provider: "ARS / baignades.sante.gouv.fr",
    url: "https://baignades.sante.gouv.fr",
    updateSchedule: "saison, hebdo + alertes",
    format: "site",
    zones: [],
  },
  {
    key: "air-atmosud",
    signalType: "AIR_QUALITY",
    provider: "ATMO Sud",
    url: "https://www.atmosud.org",
    updateSchedule: "daily",
    format: "site/API",
    zones: [],
  },
];
