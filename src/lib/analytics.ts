// Dünner Wrapper um Microsoft Clarity, Google Analytics (gtag) und Mixpanel
// (siehe components/analytics/Analytics.tsx für das Laden/Initialisieren
// nach Consent). Custom Events + Tags markieren die Funnel-Schritte
// (Seitenaufruf -> Konfigurator/Produkt -> Kaufen-Button -> Bestellung) als
// in allen drei Tools filterbare/segmentierbare Signale - zusätzlich zu
// Clarity's Heatmaps/Session-Recordings, GA4's Trafficquellen und
// Mixpanel's Funnel-/Retention-Analyse (drei bewusst unterschiedliche,
// sich ergänzende Perspektiven statt einer vierten Ansicht derselben Daten).
//
// No-op je Tool, wenn es noch nicht geladen/initialisiert ist (kein
// Consent, keine ID, Script noch nicht bereit) - ruft NICHT selbst zur
// Zustimmung auf.

import mixpanel from "mixpanel-browser";

type ClarityFn = (...args: unknown[]) => void;
type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    clarity?: ClarityFn;
    gtag?: GtagFn;
  }
}

let mixpanelReady = false;

// Das Mixpanel-Projekt liegt in der EU-Datenregion (bei Projekterstellung
// gewaehlt, nachtraeglich nicht aenderbar) - ohne api_host schickt der
// Browser-SDK Events standardmaessig an die US-Server, wo sie fuer ein
// EU-Projekt nicht ankommen (live beobachtet: "No connection found" trotz
// korrekt eingebundenem Projekt-Token). Falls das Projekt jemals in einer
// anderen Region liegt, hier anpassen.
const MIXPANEL_API_HOST = "https://api-eu.mixpanel.com";

export function initMixpanel(token: string) {
  if (mixpanelReady) return;
  mixpanel.init(token, {
    autocapture: false,
    track_pageview: true,
    persistence: "localStorage",
    api_host: MIXPANEL_API_HOST,
  });
  mixpanelReady = true;
}

/**
 * Verknüpft den vom Nutzer selbst gewählten Nickname (siehe OrderForm.tsx)
 * als durchgehende Mixpanel-Identität - einziger Ort, an dem eine
 * (freiwillige, anonyme) Kennung an ein Analytics-Tool weitergegeben wird.
 */
export function identifyUser(nickname: string) {
  if (!mixpanelReady || !nickname) return;
  mixpanel.identify(nickname);
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

  if (mixpanelReady) {
    mixpanel.track(name, tags);
  }
}
