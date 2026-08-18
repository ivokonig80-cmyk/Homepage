"use client";

import { SculptureViewer } from "@/components/three/SculptureViewer";
import { CATALOG } from "@/lib/catalog";
import type { GenerationState } from "@/lib/useSculptureGeneration";

// Solange kein echtes generiertes Mesh vorliegt (Upload noch nicht
// gestartet, Generierung läuft noch oder ist fehlgeschlagen), zeigen wir
// eine unserer vorhandenen Low-Poly-Formen als ehrlich gekennzeichneten
// Platzhalter - so bleibt der komplette Klick-Pfad für Heatmap-Tests
// durchgängig testbar, auch ohne (oder mit leerem) Tripo-Guthaben.
const PLACEHOLDER_ITEM = CATALOG.find((item) => item.slug === "katze") ?? CATALOG[0];

interface StepVorschauProps {
  colorHex: string;
  scale: number;
  generation: GenerationState;
}

export function StepVorschau({ colorHex, scale, generation }: StepVorschauProps) {
  const { status, progress, modelUrl, error } = generation;
  const isGenerating = status === "uploading" || status === "processing";
  const hasModel = status === "succeeded" && Boolean(modelUrl);

  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
        Deine 3D-Vorschau
      </h1>

      {hasModel && <p className="mt-2 text-foreground-muted">Zum Drehen ziehen.</p>}
      {status === "failed" && (
        <p className="mt-2 text-red-400">
          {error ?? "Die Generierung ist fehlgeschlagen."} Hier siehst du stattdessen eine
          Platzhalter-Form.
        </p>
      )}
      {isGenerating && (
        <p className="mt-2 text-foreground-muted">
          Dein Foto wird gerade in ein 3D-Modell verwandelt
          {typeof progress === "number" ? ` (${progress}%)` : "…"} — das kann bis zu ein bis
          zwei Minuten dauern.
        </p>
      )}
      {status === "idle" && (
        <p className="mt-2 text-foreground-muted">
          Zum Drehen ziehen. (Platzhalter-Form — dein echtes Modell entsteht hier, sobald die
          KI-Generierung aus deinem Foto abgeschlossen ist.)
        </p>
      )}

      {hasModel && modelUrl ? (
        <SculptureViewer
          modelUrl={modelUrl}
          colorHex={colorHex}
          scale={scale}
          interactive
          autoRotateSpeed={0.3}
          className="mx-auto mt-8 h-80 w-full rounded-2xl border border-stage-border bg-stage"
        />
      ) : (
        <SculptureViewer
          parts={PLACEHOLDER_ITEM.parts}
          colorHex={colorHex}
          scale={scale}
          interactive
          autoRotateSpeed={isGenerating ? 0.15 : 0.3}
          className="mx-auto mt-8 h-80 w-full rounded-2xl border border-stage-border bg-stage"
        />
      )}

      {isGenerating && (
        <div
          role="progressbar"
          aria-valuenow={progress ?? undefined}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Generierungsfortschritt"
          className="mx-auto mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border-subtle"
        >
          <div
            className="h-full rounded-full bg-accent-warm transition-all"
            style={{ width: `${progress ?? 8}%` }}
          />
        </div>
      )}
    </div>
  );
}
