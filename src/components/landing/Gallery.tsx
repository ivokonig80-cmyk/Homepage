import { Reveal } from "@/components/motion/Reveal";

const COLORWAYS = [
  { name: "Gebürsteter Stahl", hex: "#9aa5b1" },
  { name: "Warmes Bronze", hex: "#c9a961" },
  { name: "Mattschwarz", hex: "#2b2b2e" },
  { name: "Kupfer", hex: "#b56a4a" },
];

/**
 * Platzhalter-Galerie bis echte Meshy-Renderings vorliegen - zeigt schon
 * jetzt das Farbkonzept und die Kartenoptik, die später mit echten
 * Produktbildern befüllt wird.
 */
export function Gallery() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Wunschfarben
          </h2>
          <p className="mt-3 max-w-xl text-foreground-muted">
            Jede Skulptur entsteht individuell — wähle die Oberfläche, die zu
            deinem Zuhause passt.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {COLORWAYS.map((c, i) => (
            <Reveal key={c.name} delay={i * 0.08}>
              <div className="group overflow-hidden rounded-2xl border border-border-subtle bg-background-elevated">
                <div
                  className="aspect-square w-full transition-transform duration-500 group-hover:scale-105"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${c.hex}, #0a0a0c 75%)`,
                  }}
                  aria-hidden="true"
                />
                <p className="px-4 py-3 text-sm font-medium">{c.name}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
