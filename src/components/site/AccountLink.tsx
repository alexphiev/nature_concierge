import Link from "next/link";
import { getSessionUser } from "@/src/auth/session";
import { ACCOUNT_HREF, ACTIVE_LINK, FOCUS_RING, NAV_ACCOUNT_SLOT, NAV_LINK_INACTIVE } from "../landing/shared";
import { NavLink } from "./NavLink";

export async function AccountLink() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className={`${NAV_ACCOUNT_SLOT} animate-fade-in`}>
        <NavLink
          href={ACCOUNT_HREF}
          label="Se connecter"
          match={[ACCOUNT_HREF, "/connexion"]}
          inactiveClassName={NAV_LINK_INACTIVE}
          activeClassName={ACTIVE_LINK}
        />
      </div>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={`${NAV_ACCOUNT_SLOT} animate-fade-in`}>
      <Link
        href={ACCOUNT_HREF}
        aria-label="Mon compte"
        className={`flex size-8.5 items-center justify-center rounded-full bg-[#0E4B5A] text-[15px] font-semibold text-white ${FOCUS_RING}`}
      >
        {initial}
      </Link>
    </div>
  );
}
