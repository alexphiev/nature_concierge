import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/src/auth/auth";
import { getSessionUser } from "@/src/auth/session";
import { prisma } from "@/src/corpus/db";
import { safeNextPath, withSentFlag } from "./paths";
import { writePendingCookie } from "./pending-cookie";
import { CommuneSchema, DisplayNameSchema, IdentitySchema } from "./schema";
import {
  createPendingContribution,
  createUnconfirmedContribution,
  type ContributionData,
} from "./service";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const FIELD_MESSAGES: Record<string, string> = {
  name: "Choisissez un nom de 2 à 40 caractères.",
  commune: "La commune doit faire entre 2 et 80 caractères.",
  email: "Cette adresse email ne semble pas valide.",
  consent: "Merci d'accepter la charte et la politique de confidentialité.",
};

function formValue(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function sendContributionMagicLink(input: {
  email: string;
  name: string;
  next: string;
}): Promise<void> {
  await auth.api.signInMagicLink({
    body: {
      email: input.email,
      name: input.name,
      callbackURL: `/connexion/confirmer?next=${encodeURIComponent(safeNextPath(input.next))}`,
      errorCallbackURL: "/connexion/verifier?erreur=lien",
    },
    headers: await headers(),
  });
}

export async function submitContribution(input: {
  data: ContributionData;
  formData: FormData;
  formPath: string;
  next: string;
}): Promise<FormState> {
  const { data, formData, formPath } = input;
  const next = safeNextPath(input.next);

  if (formValue(formData, "website").trim()) redirect(withSentFlag(next));

  const user = await getSessionUser();

  if (user) {
    if (!user.name.trim()) {
      const name = DisplayNameSchema.safeParse(formValue(formData, "name"));
      if (!name.success) return { fieldErrors: { name: FIELD_MESSAGES.name } };
      const commune = CommuneSchema.safeParse(formValue(formData, "commune"));
      if (!commune.success) return { fieldErrors: { commune: FIELD_MESSAGES.commune } };
      await prisma.user.update({
        where: { id: user.id },
        data: { name: name.data, ...(commune.data ? { commune: commune.data } : {}) },
      });
    }
    const result = await createPendingContribution(user.id, data);
    if ("error" in result) return { error: result.error };
    redirect(withSentFlag(next));
  }

  const parsed = IdentitySchema.safeParse({
    name: formValue(formData, "name"),
    commune: formValue(formData, "commune"),
    email: formValue(formData, "email"),
    consent: formValue(formData, "consent"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= FIELD_MESSAGES[key] ?? "Valeur invalide.";
    }
    return { fieldErrors };
  }
  const { name, commune, email } = parsed.data;

  const result = await createUnconfirmedContribution({ email, name, commune }, data);
  if ("error" in result) return { error: result.error };

  let sent = true;
  try {
    await sendContributionMagicLink({ email, name, next });
  } catch (error) {
    console.error("[contributions] magic link failed", error);
    sent = false;
  }
  await writePendingCookie({ email, next, formPath, sentAt: Date.now() });
  redirect(sent ? "/connexion/verifier" : "/connexion/verifier?erreur=envoi");
}
