import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  commune: string | null;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, commune } = session.user;
  return { id, name, email, commune: commune ?? null };
});
