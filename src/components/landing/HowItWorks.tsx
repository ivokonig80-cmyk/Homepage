import { Reveal } from "@/components/motion/Reveal";

const STEPS = [
  {
    number: "01",
    title: "Foto hochladen",
    text: "Ein klares Foto deines Haustiers reicht — am besten frontal und gut beleuchtet.",
  },
  {
    number: "02",
    title: "KI erzeugt dein Modell",
    text: "In unter einer Minute entsteht ein individuelles 3D-Mesh, das wir in einen edlen Low-Poly-Stil überführen.",
  },
  {
    number: "03",
    title: "Farbe & Sockel wählen",
    text: "Stahl, Gold, Schwarz matt oder Kupfer — dreh und zoome dein Modell, bis es passt.",
  },
  {
    number: "04",
    title: "Bei dir zuhause ansehen",
    text: "Platziere die Skulptur direkt auf einem Foto deines Gartens oder deiner Terrasse.",
  },
];

export function HowItWorks() {
  return (
    <section id="so-funktionierts" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            So funktioniert&apos;s
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.08}>
              <div className="rounded-2xl border border-border-subtle bg-background-elevated p-6">
                <span className="font-display text-3xl font-semibold text-accent-warm">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-foreground-muted">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
