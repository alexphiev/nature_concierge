import type { ReactNode } from "react";
import { CONTAINER } from "@/src/components/landing/shared";
import { Charter } from "./Charter";

export function ContributionShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className={`${CONTAINER} max-w-[720px]! py-10 md:py-14`}>
      <p className="font-mono text-xs tracking-wide text-encre/65 uppercase">{eyebrow}</p>
      <h1 className="mt-2 font-display text-[2rem] leading-tight font-semibold">{title}</h1>
      <p className="mt-4 text-lg">
        Relu par Alexandre avant publication, en général sous quelques jours. Vous recevrez un
        email quand c&apos;est en ligne.
      </p>
      <div className="mt-6">
        <Charter />
      </div>
      <div className="mt-8">{children}</div>
    </main>
  );
}
