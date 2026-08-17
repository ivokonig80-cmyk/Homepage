// Dünner Wrapper um die Microsoft-Clarity- und Google-Analytics(gtag)-JS-
// APIs (siehe components/analytics/Analytics.tsx für das Laden der Scripts
// nach Consent). Custom Events + Tags markieren die Funnel-Schritte
// (Seitenaufruf -> Konfigurator/Produkt -> Kaufen-Button -> Bestellung) als
// in beiden Tools filterbare/segmentierbare Signale, zusätzlich zu Clarity's
// automatischen Heatmaps/Session-Recordings.
//
// No-op je Tool, wenn es noch nicht geladen ist (kein Consent, keine
// Projekt-/Measurement-ID, Script noch nicht initialisiert) - ruft NICHT
// selbst zur Zustimmung auf.

type ClarityFn = (...args: unknown[]) => void;
type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    clarity?: ClarityFn;
    gtag?: GtagFn;
  }
}

export function trackEvent(name: string, tags?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;

  if (typeof window.clarity === "function") {
    window.clarity("event", name);
    if (tags) {
      for (const [key, value] of Object.entries(tags)) {
        window.clarity("set", key, String(value));
      }
    }
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", name, tags ?? {});
  }
}
