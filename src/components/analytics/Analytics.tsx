"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { initMixpanel } from "@/lib/analytics";

const STORAGE_KEY = "ds-analytics-consent";
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

type ConsentState = "unknown" | "granted" | "denied";

// Kleiner externer Store für die Einwilligung (statt setState in
// useEffect): liest/schreibt localStorage und benachrichtigt Abonnenten
// manuell, da `storage`-Events im selben Tab nicht feuern. Über
// useSyncExternalStore lässt sich das SSR-sicher (kein Hydration-Mismatch)
// und ohne das "setState synchron im Effect"-Antipattern konsumieren.
const listeners = new Set<() => void>();

function readConsent(): ConsentState {
  if (typeof window === "undefined") return "unknown";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "granted" || stored === "denied" ? stored : "unknown";
}

function getServerSnapshot(): ConsentState {
  return "unknown";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setConsent(value: "granted" | "denied") {
  window.localStorage.setItem(STORAGE_KEY, value);
  listeners.forEach((notify) => notify());
}

/**
 * DSGVO-konforme Einwilligungssteuerung für Microsoft Clarity (Heatmaps +
 * Session-Recordings) und Google Analytics (gtag.js/GA4).
 *
 * - Ohne aktive Zustimmung wird KEIN Tracking-Script geladen - das
 *   Banner unten blockiert nichts anderes, aber beide Tools starten erst
 *   nach Klick auf "Zustimmen".
 * - Entscheidung wird in localStorage gemerkt, damit das Banner nicht bei
 *   jedem Seitenaufruf erneut erscheint.
 * - Ohne gesetzte NEXT_PUBLIC_CLARITY_PROJECT_ID,
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID bzw. NEXT_PUBLIC_MIXPANEL_TOKEN passiert
 *   für das jeweilige Tool gar nichts (auch nach Zustimmung) - so laufen
 *   alle drei unabhängig voneinander, bis ihre ID eingetragen ist (siehe
 *   .env.example).
 */
export function Analytics() {
  const consent = useSyncExternalStore(subscribe, readConsent, getServerSnapshot);

  useEffect(() => {
    if (consent === "granted" && MIXPANEL_TOKEN) {
      initMixpanel(MIXPANEL_TOKEN);
    }
  }, [consent]);

  return (
    <>
      {consent === "granted" && CLARITY_PROJECT_ID && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
        </Script>
      )}

      {consent === "granted" && GA_MEASUREMENT_ID && (
        <>
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');`}
          </Script>
        </>
      )}

      {consent === "unknown" && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie-Einwilligung"
          className="fixed inset-x-0 bottom-0 z-100 border-t border-border-subtle bg-background-elevated/95 px-6 py-4 shadow-lg backdrop-blur"
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground-muted">
              Wir würden gerne anonymisierte Analyse-Tools (Microsoft
              Clarity, Google Analytics und Mixpanel) für Heatmaps und
              Nutzungsstatistiken einsetzen, um diese Seite zu verbessern.
              Mehr dazu in unserer{" "}
              <Link href="/datenschutz" className="underline hover:text-foreground">
                Datenschutzerklärung
              </Link>
              .
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setConsent("denied")}
                className="rounded-full border border-border-subtle px-4 py-2 text-sm transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent-warm"
              >
                Ablehnen
              </button>
              <button
                type="button"
                onClick={() => setConsent("granted")}
                className="rounded-full bg-accent-warm px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent-warm"
              >
                Zustimmen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
