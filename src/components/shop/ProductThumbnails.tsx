"use client";

import Link from "next/link";
import { useRef } from "react";
import { SculptureViewer } from "@/components/three/SculptureViewer";
import { trackEvent } from "@/lib/analytics";
import { CATALOG, DEFAULT_MATERIAL_ID, MATERIALS } from "@/lib/catalog";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

/**
 * Miniatur-Leiste aller Motive unterhalb von Artikel + Formular - schneller
 * Direktwechsel zwischen Produktseiten, ohne über den Shop-Grid ("Stack")
 * zurückzugehen. Zeigt bewusst ALLE Motive inkl. dem aktuellen (hervorgehoben,
 * nicht klickbar), damit die Position im Katalog erkennbar bleibt.
 */
export function ProductThumbnails({ currentSlug }: { currentSlug: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const material = MATERIALS.find((m) => m.id === DEFAULT_MATERIAL_ID) ?? MATERIALS[0];

  function scrollByStep(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  }

  return (
    <section className="mt-16 border-t border-border-subtle pt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground-muted">Alle Motive</h2>
        <div className="hidden gap-1 sm:flex">
          <button
            type="button"
            onClick={() => scrollByStep(-1)}
            aria-label="Zurück"
            className="rounded-full p-1.5 text-foreground-muted transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent-warm"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={() => scrollByStep(1)}
            aria-label="Weiter"
            className="rounded-full p-1.5 text-foreground-muted transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent-warm"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CATALOG.map((other) => {
          const isCurrent = other.slug === currentSlug;

          if (isCurrent) {
            return (
              <div
                key={other.slug}
                aria-current="page"
                className="w-24 flex-shrink-0 snap-start rounded-xl border border-accent-warm bg-background-elevated p-2 text-center sm:w-28"
              >
                <SculptureViewer
                  parts={other.parts}
                  colorHex={material.colorHex}
                  className="h-16 w-full rounded-lg border border-stage-border bg-stage sm:h-20"
                  autoRotateSpeed={0}
                />
                <p className="mt-1 truncate text-xs font-medium text-foreground">{other.name}</p>
              </div>
            );
          }

          return (
            <Link
              key={other.slug}
              href={`/shop/${other.slug}`}
              onClick={() =>
                trackEvent("shop_product_click", { slug: other.slug, item: other.name, context: "thumbnails" })
              }
              className="w-24 flex-shrink-0 snap-start rounded-xl border border-border-subtle bg-background-elevated p-2 text-center transition-colors hover:border-accent sm:w-28"
            >
              <SculptureViewer
                parts={other.parts}
                colorHex={material.colorHex}
                className="h-16 w-full rounded-lg border border-stage-border bg-stage sm:h-20"
                autoRotateSpeed={0}
              />
              <p className="mt-1 truncate text-xs text-foreground-muted">{other.name}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
