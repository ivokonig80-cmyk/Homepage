import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";

export function CTASection() {
  return (
    <section className="px-6 py-24">
      <Reveal>
        <div className="mx-auto max-w-4xl rounded-3xl border border-accent-warm/30 bg-background-elevated px-8 py-16 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Bereit für dein eigenes Kunstwerk?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-foreground-muted">
            Lade ein Foto hoch und sieh in wenigen Minuten, wie deine
            Skulptur aussehen wird.
          </p>
          <Link
            href="/konfigurator"
            className="mt-8 inline-block rounded-full bg-accent-warm px-8 py-3 font-medium text-background transition-transform hover:scale-[1.03] focus-visible:scale-[1.03]"
          >
            Jetzt gestalten
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
