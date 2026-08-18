"use client";

import { SculptureViewer } from "@/components/three/SculptureViewer";
import { CATALOG, MATERIALS, SIZES } from "@/lib/catalog";

const PLACEHOLDER_ITEM = CATALOG.find((item) => item.slug === "katze") ?? CATALOG[0];

interface StepSockelProps {
  materialId: string;
  sizeId: string;
  onSizeChange: (id: string) => void;
  modelUrl?: string;
}

export function StepSockel({ materialId, sizeId, onSizeChange, modelUrl }: StepSockelProps) {
  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[1];

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 items-center gap-8 md:grid-cols-2">
      <SculptureViewer
        {...(modelUrl ? { modelUrl } : { parts: PLACEHOLDER_ITEM.parts })}
        colorHex={material.colorHex}
        scale={size.scale}
        interactive
        autoRotateSpeed={0.3}
        className="h-72 w-full rounded-2xl border border-stage-border bg-stage"
      />
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Sockel &amp; Größe
        </h1>
        <p className="mt-2 text-foreground-muted">
          Bestimme die passende Größe für deine Skulptur — jede Größe wird
          mit einem passenden Stahlsockel geliefert.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === sizeId}
              onClick={() => onSizeChange(s.id)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent-warm ${
                s.id === sizeId
                  ? "border-accent-warm bg-accent-warm text-background"
                  : "border-border-subtle hover:border-accent"
              }`}
            >
              {s.label}
              {s.priceDelta > 0 && <span className="ml-1 opacity-70">+{s.priceDelta} €</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
