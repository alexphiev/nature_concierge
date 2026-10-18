import Link from "next/link";
import { getSessionUser } from "@/src/auth/session";
import { FOCUS_RING } from "../landing/shared";

export async function AccountLink() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <Link href="/compte" className={`hidden text-[#1D2A2E] md:block ${FOCUS_RING}`}>
        Se connecter
      </Link>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link
      href="/compte"
      aria-label="Mon compte"
      className={`flex size-8.5 items-center justify-center rounded-full bg-[#0E4B5A] text-[15px] font-semibold text-white ${FOCUS_RING}`}
    >
      {initial}
    </Link>
  );
}
