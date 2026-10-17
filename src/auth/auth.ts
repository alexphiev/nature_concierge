import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
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
