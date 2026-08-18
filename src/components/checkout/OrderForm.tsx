"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { trackEvent, identifyUser } from "@/lib/analytics";

interface OrderFormProps {
  itemLabel: string;
  materialLabel: string;
  sizeLabel: string;
  totalPrice: number;
  eventContext: "konfigurator" | "shop";
}

type Status = "idle" | "submitting" | "success" | "error";

const emptyForm = { nickname: "", email: "" };

/**
 * Gemeinsames Bestellformular für Konfigurator- und Shop-Checkout. Sendet an
 * /api/orders - bewusst OHNE Zahlungsanbindung (siehe dort) und bewusst
 * ohne echte Name/Adresse-Abfrage: ein anonymer Nickname reicht, E-Mail ist
 * freiwillig (nur für eine persönliche Kopie vom Betreiber). Markiert
 * Kaufabsicht und Bestellabschluss als Analytics-Events, damit der Funnel
 * bis zum Kauf-Klick auswertbar ist.
 */
export function OrderForm({ itemLabel, materialLabel, sizeLabel, totalPrice, eventContext }: OrderFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<Status>("idle");
  const [orderId, setOrderId] = useState<string | null>(null);

  function update(field: keyof typeof emptyForm) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    trackEvent("buy_button_click", { context: eventContext, item: itemLabel, value: totalPrice });
    setStatus("submitting");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          item: itemLabel,
          material: materialLabel,
          size: sizeLabel,
          price: totalPrice,
          context: eventContext,
        }),
      });
      if (!res.ok) throw new Error("request_failed");
      const data = (await res.json()) as { orderId: string };
      setOrderId(data.orderId);
      setStatus("success");
      identifyUser(form.nickname);
      trackEvent("order_completed", { context: eventContext, orderId: data.orderId, value: totalPrice });
    } catch {
      setStatus("error");
    }
  }

  if (status === "success" && orderId) {
    return (
      <div
        role="status"
        className="mt-6 rounded-2xl border border-border-subtle bg-background-elevated px-6 py-6 text-center"
      >
        <p className="font-display text-lg font-semibold">Bestellung eingegangen!</p>
        <p className="mt-2 text-sm text-foreground-muted">
          Testmodus — es wurde kein echtes Geld abgebucht.
        </p>
        <p className="mt-1 text-xs text-foreground-muted">
          Bestellnummer: <span className="font-mono">{orderId}</span>
        </p>
        {form.email && (
          <p className="mt-2 text-xs text-foreground-muted">
            Du bekommst außerdem persönlich eine Kopie per E-Mail.
          </p>
        )}
        <a
          href="/ergebnisse.html"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-accent-warm underline hover:opacity-80"
        >
          Testergebnisse ansehen — so haben sich Besucher bisher verhalten
        </a>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-border-subtle bg-background px-4 py-2.5 text-sm outline-none transition-colors focus-visible:border-accent-warm focus-visible:ring-2 focus-visible:ring-accent-warm";

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
      <input
        required
        type="text"
        placeholder="Nickname (anonym, keine echten Daten nötig)"
        value={form.nickname}
        onChange={update("nickname")}
        className={inputClass}
      />
      <input
        type="email"
        placeholder="E-Mail (freiwillig — für eine Kopie von mir)"
        autoComplete="email"
        value={form.email}
        onChange={update("email")}
        className={inputClass}
      />

      <button
        type="submit"
        disabled={status === "submitting"}
        className="!mt-5 w-full rounded-full bg-accent-warm px-6 py-3 text-center font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? "Wird gesendet…" : "Jetzt bestellen (Testmodus, keine Zahlung)"}
      </button>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-400">
          Bestellung konnte nicht übermittelt werden. Bitte versuch es erneut.
        </p>
      )}
    </form>
  );
}
