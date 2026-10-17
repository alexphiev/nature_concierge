import { cookies } from "next/headers";

export type PendingCookie = {
  email: string;
  next: string;
  formPath: string;
  sentAt: number;
};

const NAME = "nc_pending";

export async function readPendingCookie(): Promise<PendingCookie | null> {
  const raw = (await cookies()).get(NAME)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (
      typeof v?.email === "string" &&
      typeof v.next === "string" &&
      typeof v.formPath === "string" &&
      typeof v.sentAt === "number"
    ) {
      return { email: v.email, next: v.next, formPath: v.formPath, sentAt: v.sentAt };
    }
    return null;
  } catch {
    return null;
  }
}

export async function writePendingCookie(value: PendingCookie): Promise<void> {
  (await cookies()).set(NAME, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function clearPendingCookie(): Promise<void> {
  (await cookies()).delete(NAME);
}
