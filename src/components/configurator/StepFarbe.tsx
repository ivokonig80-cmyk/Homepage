"use client";

import { SculptureViewer } from "@/components/three/SculptureViewer";
import { CATALOG, MATERIALS } from "@/lib/catalog";

const PLACEHOLDER_ITEM = CATALOG.find((item) => item.slug === "katze") ?? CATALOG[0];

interface StepFarbeProps {
  materialId: string;
  onMaterialChange: (id: string) => void;
  scale: number;
}

export function StepFarbe({ materialId, onMaterialChange, scale }: StepFarbeProps) {
  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 items-center gap-8 md:grid-cols-2">
      <SculptureViewer
        parts={PLACEHOLDER_ITEM.parts}
        colorHex={material.colorHex}
        scale={scale}
        interactive
        autoRotateSpeed={0.3}
        className="h-72 w-full rounded-2xl border border-border-subtle bg-background-elevated"
      />
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Wähle deine Wunschfarbe
        </h1>
        <p className="mt-2 text-foreground-muted">
          Stahl, Gold, Schwarz matt oder Kupfer — live am Modell sichtbar.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {MATERIALS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === materialId}
              onClick={() => onMaterialChange(m.id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent-warm ${
                m.id === materialId
                  ? "border-accent-warm bg-background-elevated"
                  : "border-border-subtle hover:border-accent"
              }`}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-border-subtle"
                style={{ backgroundColor: m.colorHex }}
                aria-hidden
              />
              {m.label}
              {m.priceDelta > 0 && (
                <span className="text-foreground-muted">+{m.priceDelta} €</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
