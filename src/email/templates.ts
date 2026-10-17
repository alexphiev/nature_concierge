import { SITE_URL } from "@/src/site";

export type EmailContent = { subject: string; text: string };

const SIGNATURE = "Alexandre — Guide Nature de La Ciotat";

function callbackPath(url: string): string {
  try {
    return new URL(url).searchParams.get("callbackURL") ?? "";
  } catch {
    return "";
  }
}

export function magicLinkEmail(url: string): EmailContent {
  const confirming = callbackPath(url).startsWith("/connexion/confirmer");
  const subject = confirming
    ? "Confirmez votre email pour envoyer votre contribution"
    : "Votre lien de connexion au Guide Nature de La Ciotat";
  const intro = confirming
    ? "Cliquez sur ce lien pour confirmer votre email et envoyer votre contribution :"
    : "Cliquez sur ce lien pour vous connecter :";
  return {
    subject,
    text: `Bonjour,\n\n${intro}\n${url}\n\nCe lien expire dans 15 minutes.\n\n${SIGNATURE}`,
  };
}

export function adminNewContributionEmail(input: {
  typeLabel: string;
  placeName: string;
}): EmailContent {
  return {
    subject: `Nouvelle contribution à relire — ${input.typeLabel} · ${input.placeName}`,
    text: `Une nouvelle contribution attend votre relecture :\n${SITE_URL}/admin/contributions`,
  };
}

export function tipPublishedEmail(input: {
  placeName: string;
  placeUrl: string;
  note: string | null;
}): EmailContent {
  const note = input.note ? `\n\nMon commentaire :\n${input.note}` : "";
  return {
    subject: `Votre astuce sur ${input.placeName} est en ligne, merci !`,
    text: `Bonjour,\n\nVotre astuce est maintenant visible sur la page du lieu :\n${input.placeUrl}${note}\n\nMerci d'avoir partagé votre connaissance du terrain.\n\n${SIGNATURE}`,
  };
}

export function contributionRejectedEmail(input: { note: string | null }): EmailContent {
  const reason = input.note
    ? `« ${input.note} »`
    : "Elle ne correspondait pas tout à fait à la charte du guide. Merci d'avoir pris le temps de l'écrire.";
  return {
    subject: "Votre contribution n'a pas été retenue",
    text: `Bonjour,\n\nMerci pour votre contribution. Elle n'a pas été retenue.\n\n${reason}\n\n${SIGNATURE}`,
  };
}
