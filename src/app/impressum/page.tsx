import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Impressum — Deine Skulptur",
};

export default function ImpressumPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Impressum</h1>
        <p className="mt-3 text-sm text-foreground-muted">
          Diese Seite ist ein nicht-kommerzielles Schulprojekt. Es wird kein
          Gewerbe betrieben und es finden keine echten Verkäufe statt — der
          Bestellprozess läuft ausschließlich im Testmodus (siehe
          Datenschutzerklärung).
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Angaben gemäß § 5 DDG
          </h2>
          <p className="text-foreground-muted">
            Ivo Konig
            <br />
            E-Mail: ivokonig80@gmail.com
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Verantwortlich für den Inhalt
          </h2>
          <p className="text-foreground-muted">
            Ivo Konig (Kontakt siehe oben).
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
