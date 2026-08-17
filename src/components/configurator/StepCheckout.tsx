"use client";

import { useEffect } from "react";
import { MATERIALS, SIZES } from "@/lib/catalog";
import { OrderForm } from "@/components/checkout/OrderForm";
import { trackEvent } from "@/lib/analytics";

// Basispreis für individuelle (foto-basierte) Skulpturen - unabhängig vom
// Katalog-Grundpreis der vorgefertigten Modelle in lib/catalog.ts.
const CUSTOM_BASE_PRICE = 279;

interface StepCheckoutProps {
  materialId: string;
  sizeId: string;
}

export function StepCheckout({ materialId, sizeId }: StepCheckoutProps) {
  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[1];
  const totalPrice = CUSTOM_BASE_PRICE + material.priceDelta + size.priceDelta;

  useEffect(() => {
    trackEvent("checkout_view", { context: "konfigurator", value: totalPrice });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
        Bestellung abschließen
      </h1>
      <p className="mt-2 text-foreground-muted">
        Sicherer Checkout (Testmodus) — es wird kein echtes Geld abgebucht.
      </p>

      <div className="mt-8 space-y-2 rounded-2xl border border-border-subtle bg-background-elevated px-6 py-5 text-left text-sm">
        <div className="flex justify-between">
          <span className="text-foreground-muted">Material</span>
          <span>{material.label}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-muted">Größe</span>
          <span>{size.label}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-border-subtle pt-3 font-display text-lg font-semibold">
          <span>Gesamtpreis</span>
          <span>{totalPrice} €</span>
        </div>
      </div>

      <OrderForm
        itemLabel="Individuelle Skulptur"
        materialLabel={material.label}
        sizeLabel={size.label}
        totalPrice={totalPrice}
        eventContext="konfigurator"
      />
    </div>
  );
}
