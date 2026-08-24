"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProgressBar } from "@/components/configurator/ProgressBar";
import { AccessGate } from "@/components/configurator/AccessGate";
import { KonfiguratorProvider, useKonfigurator } from "@/components/configurator/KonfiguratorContext";
import { CONFIGURATOR_STEPS } from "@/lib/configurator-steps";

function KonfiguratorChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { file } = useKonfigurator();

  const currentIndex = Math.max(
    0,
    CONFIGURATOR_STEPS.findIndex((step) => pathname.endsWith(`/${step.id}`))
  );
  const currentStep = CONFIGURATOR_STEPS[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === CONFIGURATOR_STEPS.length - 1;
  const canProceed = currentStep.id !== "upload" || file !== null;

  const prevHref = !isFirst ? `/konfigurator/${CONFIGURATOR_STEPS[currentIndex - 1].id}` : null;
  const nextHref = !isLast ? `/konfigurator/${CONFIGURATOR_STEPS[currentIndex + 1].id}` : null;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-border-subtle/60 px-6 py-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          Deine<span className="text-accent-warm">Skulptur</span>
        </Link>
      </div>

      <ProgressBar currentIndex={currentIndex} />

      <main className="flex flex-1 items-center justify-center px-6 py-16">{children}</main>

      <div className="mx-auto flex w-full max-w-xl items-center justify-between px-6 pb-12">
        {prevHref ? (
          <Link
            href={prevHref}
            className="rounded-full border border-border-subtle px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent"
          >
            Zurück
          </Link>
        ) : (
          <span />
        )}
        {nextHref &&
          (canProceed ? (
            <Link
              href={nextHref}
              className="rounded-full bg-accent-warm px-6 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
            >
              Weiter
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-full bg-accent-warm px-6 py-2.5 text-sm font-medium text-background opacity-40">
              Weiter
            </span>
          ))}
      </div>
    </div>
  );
}

export default function KonfiguratorLayout({ children }: { children: ReactNode }) {
  return (
    <AccessGate>
      <KonfiguratorProvider>
        <KonfiguratorChrome>{children}</KonfiguratorChrome>
      </KonfiguratorProvider>
    </AccessGate>
  );
}
