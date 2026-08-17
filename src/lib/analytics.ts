// Dünner Wrapper um die Microsoft-Clarity-JS-API (siehe
// components/analytics/Analytics.tsx für das Laden des Scripts nach
// Consent). Custom Events + Tags markieren die Funnel-Schritte
// (Seitenaufruf -> Konfigurator/Produkt -> Kaufen-Button -> Bestellung) als
// in Clarity filterbare/segmentierbare Signale, zusätzlich zu den
// automatischen Heatmaps/Session-Recordings.
//
// No-op wenn Clarity noch nicht geladen ist (kein Consent, keine Project-ID,
// Script noch nicht initialisiert) - ruft NICHT selbst zur Zustimmung auf.

type ClarityFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

export function trackEvent(name: string, tags?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || typeof window.clarity !== "function") return;
  window.clarity("event", name);
  if (!tags) return;
  for (const [key, value] of Object.entries(tags)) {
    window.clarity("set", key, String(value));
  }
}
