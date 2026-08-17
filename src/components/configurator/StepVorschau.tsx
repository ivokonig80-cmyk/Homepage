"use client";

import { SculptureViewer } from "@/components/three/SculptureViewer";
import { CATALOG } from "@/lib/catalog";

// Solange kein echtes generiertes Mesh vorliegt (Tripo-Guthaben noch
// ausstehend), zeigen wir hier eine unserer vorhandenen Low-Poly-Formen als
// ehrlich gekennzeichneten Platzhalter - so bleibt der komplette Klick-Pfad
// für Heatmap-Tests durchgängig testbar. Sobald echte Generierung läuft,
// wird `parts` hier durch das tatsächliche Ergebnis des Uploads ersetzt.
const PLACEHOLDER_ITEM = CATALOG.find((item) => item.slug === "katze") ?? CATALOG[0];

interface StepVorschauProps {
  colorHex: string;
  scale: number;
}

export function StepVorschau({ colorHex, scale }: StepVorschauProps) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
        Deine 3D-Vorschau
      </h1>
      <p className="mt-2 text-foreground-muted">
        Zum Drehen ziehen. (Platzhalter-Form — dein echtes Modell entsteht
        hier, sobald die KI-Generierung aus deinem Foto abgeschlossen ist.)
      </p>
      <SculptureViewer
        parts={PLACEHOLDER_ITEM.parts}
        colorHex={colorHex}
        scale={scale}
        interactive
        autoRotateSpeed={0.3}
        className="mx-auto mt-8 h-80 w-full rounded-2xl border border-border-subtle bg-background-elevated"
      />
    </div>
  );
}
