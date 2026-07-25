import { definePlace } from "../schema";

export default definePlace({
  slug: "port-d-alon",
  name: "Calanque de Port d'Alon",
  commune: "Saint-Cyr-sur-Mer",
  departement: "83",
  lat: 43.1656,
  lng: 5.6598,
  type: "CALANQUE",
  governingAuthority: "Ville de Saint-Cyr-sur-Mer — Service Espaces Naturels",
  officialInfoUrl: "https://www.var.gouv.fr/",
  demandRank: 3,
  zapef: true,
  description:
    "Calanque préservée entre Saint-Cyr et Bandol, pinède et plage de galets.",
  sources: {
    otStCyr: {
      type: "OT_CONVERSATION",
      urlOrRef: "Email Service Espaces Naturels Saint-Cyr, juillet 2026",
      dateCollected: "2026-07-18",
      reliability: 3,
    },
  },
  claims: [
    {
      claimText:
        "En code rouge, la calanque reste ouverte 8h–17h mais seuls la pinède et la plage principale sont accessibles, avec un parking fortement réduit.",
      claimType: "DECODING",
      conditions: ["ete", "code-rouge"],
      audience: ["tous"],
      verdict: "GO_IF",
      source: "otStCyr",
      verification: "OFFICIAL",
      decayClass: "ANNUAL_CHECK",
      verifiedOn: "2026-07-18",
      isPublic: true,
    },
  ],
});
