"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LowPolyCat } from "./LowPolyCat";
import { trackEvent } from "@/lib/analytics";

export function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? {} : { opacity: 0, y: 16 };
  const animate = prefersReducedMotion ? {} : { opacity: 1, y: 0 };

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden px-6 py-16">
      <div className="mx-auto grid w-full max-w-7xl items-stretch gap-8 md:grid-cols-[1fr_1.3fr] md:gap-4">
        <div className="flex h-full flex-col items-center justify-center text-center md:justify-end md:pb-6">
          <motion.p
            initial={initial}
            animate={animate}
            transition={{ duration: 0.6 }}
            className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-accent-warm"
          >
            Individuelle Metallkunst
          </motion.p>
          <motion.h1
            initial={initial}
            animate={animate}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl"
          >
            Dein Haustier.
            <br />
            Als edle Low-Poly-Skulptur.
          </motion.h1>
          <motion.p
            initial={initial}
            animate={animate}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-md text-lg text-foreground-muted"
          >
            Ein Foto genügt. Unsere KI verwandelt es in ein facettiertes
            3D-Kunstwerk — als massive Stahlskulptur gefertigt, in deiner
            Wunschfarbe, in wenigen Minuten vorab zu sehen.
          </motion.p>
          <motion.div
            initial={initial}
            animate={animate}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap justify-center gap-4"
          >
            <Link
              href="/konfigurator"
              onClick={() => trackEvent("cta_start_configurator", { location: "hero" })}
              className="rounded-full bg-accent-warm px-7 py-3 font-medium text-background transition-transform hover:scale-[1.03] focus-visible:scale-[1.03]"
            >
              Jetzt gestalten
            </Link>
            <a
              href="#so-funktionierts"
              className="rounded-full border border-border-subtle px-7 py-3 font-medium text-foreground transition-colors hover:border-accent"
            >
              Wie es funktioniert
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.92 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mx-auto w-full max-w-2xl"
        >
          <div className="absolute inset-0 -z-10 rounded-full bg-accent-warm/10 blur-3xl" />
          <LowPolyCat className="w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]" />
        </motion.div>
      </div>
    </section>
  );
}
