import type { ReactNode } from "react";
import { CONTAINER } from "../landing/shared";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className={`${CONTAINER} max-w-[760px]! py-10 md:py-16`}>
      <h1 className="font-landing-display text-[34px] leading-[1.1] font-semibold md:text-[48px]">
        {title}
      </h1>
      <div className="mt-8 space-y-4 text-[17px] leading-relaxed [&_h2]:mt-10 [&_h2]:font-landing-display [&_h2]:text-2xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_a]:underline">
        {children}
      </div>
    </main>
  );
}
