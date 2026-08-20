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

export function readConsent(): ConsentState {
  if (typeof window === "undefined") return "unknown";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "granted" || stored === "denied" ? stored : "unknown";
}

export function getServerSnapshot(): ConsentState {
  return "unknown";
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setConsent(value: "granted" | "denied") {
  window.localStorage.setItem(STORAGE_KEY, value);
  listeners.forEach((notify) => notify());
}
