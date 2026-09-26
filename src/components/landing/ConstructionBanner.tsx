import { CONTAINER } from "./shared";

export function ConstructionBanner() {
  if (process.env.SHOW_CONSTRUCTION_BANNER === "false") return null;

  return (
    <div role="status" className="bg-[#FBE9DD] text-[#A34A25]">
      <p className={`${CONTAINER} py-2.5 text-center text-sm font-semibold`}>
        Site en cours de construction
      </p>
    </div>
  );
}
