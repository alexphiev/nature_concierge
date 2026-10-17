import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { attachUnconfirmedContributions } from "@/src/contributions/service";
import { prisma } from "@/src/corpus/db";
import { sendEmail } from "@/src/email/send";
import { magicLinkEmail } from "@/src/email/templates";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  verification: { modelName: "authVerification" },
  user: {
    additionalFields: {
      commune: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Covers every verified sign-in (cross-device, /compte), not only /connexion/confirmer.
        after: async (session) => {
          try {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { id: true, name: true, email: true, commune: true },
            });
            if (user) await attachUnconfirmedContributions(user);
          } catch (error) {
            console.error("[contributions] attach on sign-in failed", error);
          }
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 900,
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({ to: email, ...magicLinkEmail(url) });
      },
    }),
    nextCookies(),
  ],
});
