"use client";

import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { useRef, useState, type PointerEvent } from "react";
import { SculptureViewer } from "@/components/three/SculptureViewer";
import { DEFAULT_MATERIAL_ID, MATERIALS, type CatalogItem } from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";

const MAX_TILT_DEG = 10;

/**
 * Produktkarte mit 3D-Tilt-Effekt (folgt der Maus, per CSS-Transform - keine
 * zusätzliche 3D-Rendering-Last) plus Live-Vorschau der Skulptur samt
 * Material-Sofortwechsel per Klick auf die Farbpunkte. Das ist bewusst die
 * "auffällige" Interaktion aus dem Konfigurator-Wunsch, aber technisch
 * günstig: nur CSS-Transform + eine bereits vorhandene, leichte 3D-Szene.
 */
export function ProductCard({ item, priority = false }: { item: CatalogItem; priority?: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID);
  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -MAX_TILT_DEG * 2, y: px * MAX_TILT_DEG * 2 });
  }

  function resetTilt() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      style={{ perspective: "900px" }}
      className="group"
    >
      <Link
        href={`/shop/${item.slug}`}
        onClick={() => trackEvent("shop_product_click", { slug: item.slug, item: item.name })}
        className="block rounded-2xl border border-border-subtle bg-background-elevated p-5 transition-shadow focus-visible:ring-2 focus-visible:ring-accent-warm"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
          transition: prefersReducedMotion ? undefined : "transform 150ms ease-out",
        }}
      >
        <SculptureViewer
          parts={item.parts}
          colorHex={material.colorHex}
          className="h-48 w-full"
          autoRotateSpeed={priority ? 0.6 : 0.45}
        />
        <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">{item.name}</h3>
        <p className="text-sm text-foreground-muted">{item.tagline}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-medium text-accent-warm">ab {item.basePrice} €</span>
          <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
            {MATERIALS.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-label={`Vorschau in ${m.label}`}
                aria-pressed={m.id === materialId}
                onClick={(e) => {
                  e.preventDefault();
                  setMaterialId(m.id);
                }}
                className={`h-4 w-4 rounded-full border transition-transform focus-visible:scale-125 ${
                  m.id === materialId ? "scale-125 border-foreground" : "border-border-subtle hover:scale-110"
                }`}
                style={{ backgroundColor: m.colorHex }}
              />
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}
