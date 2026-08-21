import { Reveal } from "@/components/motion/Reveal";
import { MATERIALS } from "@/lib/catalog";

// Direkt aus dem echten Shop-Katalog (nicht dupliziert/erfunden) - vorher
// zeigte diese Sektion eine eigene, vom Katalog abweichende Farbliste
// (u.a. ein "Mattschwarz", das es im Shop gar nicht gibt).
const COLORWAYS = MATERIALS.map((m) => ({ name: m.label, hex: m.colorHex }));

function lighten(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

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
                {/* Verlauf von einem hellen Tint zum eigentlichen Material-
                    Ton (statt vorher zu Bildschirm-Schwarz) - sorgt fuer
                    einheitlich helle Kacheln unabhaengig davon, wie dunkel
                    der Rohton selbst ist (Anthrazit war als
                    dunkel-zu-schwarz-Verlauf kaum noch zu erkennen). */}
                <div
                  className="aspect-square w-full transition-transform duration-500 group-hover:scale-105"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${lighten(c.hex, 0.7)}, ${c.hex} 85%)`,
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
