import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Reveal } from "@/components/motion/Reveal";
import { ProductCard } from "@/components/shop/ProductCard";
import { CATALOG } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop — Fertige Low-Poly-Skulpturen | Deine Skulptur",
  description:
    "Sechs vorgefertigte Low-Poly-Stahlskulpturen, konfigurierbar in Größe und Material — sofort bestellbar, ohne Fotoupload.",
};

export default function ShopPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-8 md:pt-24">
          <Reveal>
            <p className="text-sm font-medium tracking-wide text-accent-warm uppercase">
              Fertige Modelle
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-5xl">
              Sechs Motive, drei Größen, vier Materialien
            </h1>
            <p className="mt-4 max-w-xl text-foreground-muted">
              Kein eigenes Foto nötig: Diese Skulpturen sind bereits fertig
              gestaltet und direkt bestellbar. Farbe testen direkt auf der
              Karte, Größe und Material im Detail wählen.
            </p>
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOG.map((item, i) => (
              <Reveal key={item.slug} delay={Math.min(i * 0.06, 0.24)}>
                <ProductCard item={item} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
