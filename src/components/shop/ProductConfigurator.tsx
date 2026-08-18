"use client";

import { useEffect, useMemo, useState } from "react";
import { SculptureViewer } from "@/components/three/SculptureViewer";
import { OrderForm } from "@/components/checkout/OrderForm";
import { trackEvent } from "@/lib/analytics";
import {
  DEFAULT_MATERIAL_ID,
  DEFAULT_SIZE_ID,
  MATERIALS,
  SIZES,
  type CatalogItem,
} from "@/lib/catalog";

/**
 * Konfigurator auf der Produktdetailseite: Größe + Material wählen, Preis
 * live berechnen, 3D-Vorschau per Drag selbst drehen (OrbitControls), Kauf
 * über das gemeinsame OrderForm (Testmodus, keine echte Zahlung).
 */
export function ProductConfigurator({ item }: { item: CatalogItem }) {
  const [sizeId, setSizeId] = useState(DEFAULT_SIZE_ID);
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID);

  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[0];
  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];
  const totalPrice = useMemo(
    () => item.basePrice + size.priceDelta + material.priceDelta,
    [item.basePrice, size.priceDelta, material.priceDelta]
  );

  useEffect(() => {
    trackEvent("product_view", { slug: item.slug, item: item.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug]);

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:items-start">
      <div>
        <SculptureViewer
          parts={item.parts}
          colorHex={material.colorHex}
          scale={size.scale}
          interactive
          autoRotateSpeed={0.25}
          className="h-[420px] w-full rounded-2xl border border-stage-border bg-stage"
        />
        <p className="mt-2 text-center text-xs text-foreground-muted">
          Zum Drehen ziehen
        </p>
      </div>

      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{item.name}</h1>
        <p className="mt-1 text-foreground-muted">{item.tagline}</p>
        <p className="mt-4 max-w-md text-sm text-foreground-muted">{item.description}</p>

        <fieldset className="mt-8">
          <legend className="text-sm font-medium">Größe</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === sizeId}
                onClick={() => setSizeId(s.id)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent-warm ${
                  s.id === sizeId
                    ? "border-accent-warm bg-accent-warm text-background"
                    : "border-border-subtle hover:border-accent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Material</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {MATERIALS.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={m.id === materialId}
                onClick={() => setMaterialId(m.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent-warm ${
                  m.id === materialId
                    ? "border-accent-warm bg-background"
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
        </fieldset>

        <div className="mt-8 flex items-center justify-between rounded-2xl border border-border-subtle bg-background-elevated px-5 py-4">
          <span className="text-sm text-foreground-muted">Gesamtpreis</span>
          <span className="font-display text-2xl font-semibold">{totalPrice} €</span>
        </div>

        <OrderForm
          itemLabel={item.name}
          materialLabel={material.label}
          sizeLabel={size.label}
          totalPrice={totalPrice}
          eventContext="shop"
        />
      </div>
    </div>
  );
}
