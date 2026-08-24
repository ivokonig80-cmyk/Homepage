// Gemeinsamer Cookie-Consent-Store, geteilt zwischen Analytics.tsx (steuert
// das Laden von Clarity/GA4/Mixpanel) und LowPolyCat.tsx (steuert, ab wann
// die Katzen-Montage-Animation starten darf - siehe dort).
//
// Kleiner externer Store (statt setState in useEffect): liest/schreibt
// localStorage und benachrichtigt Abonnenten manuell, da `storage`-Events im
// selben Tab nicht feuern. Über useSyncExternalStore SSR-sicher (kein
// Hydration-Mismatch) und ohne das "setState synchron im Effect"-Antipattern
// konsumierbar.

const STORAGE_KEY = "ds-analytics-consent";

export type ConsentState = "unknown" | "granted" | "denied";

const listeners = new Set<() => void>();

// localStorage-Zugriff kann in manchen Browsern/Datenschutz-Einstellungen
// eine Exception werfen statt einfach leer zu sein. readConsent() laeuft
// ueber useSyncExternalStore synchron waehrend des Renderns in
// Analytics.tsx (im Root-Layout, siehe app/layout.tsx) UND in
// HeroCarousel.tsx - ungefangen wuerde das die GESAMTE Seite bei jedem
// Aufruf zum Absturz bringen, nicht nur eine einzelne Komponente. Fehlt
// die Zustimmung, gilt einfach "unknown" (Banner wird gezeigt, kein
// Tracking laedt) statt eines harten Fehlers.
export function readConsent(): ConsentState {
  if (typeof window === "undefined") return "unknown";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "granted" || stored === "denied" ? stored : "unknown";
  } catch {
    return "unknown";
  }
}

export function getServerSnapshot(): ConsentState {
  return "unknown";
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setConsent(value: "granted" | "denied") {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // localStorage nicht verfuegbar - Entscheidung gilt dann nur fuer den
    // aktuellen Seitenaufruf (Listener werden trotzdem benachrichtigt,
    // damit das Banner sofort verschwindet).
  }
  listeners.forEach((notify) => notify());
}
