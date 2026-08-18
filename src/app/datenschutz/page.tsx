import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — Deine Skulptur",
};

export default function DatenschutzPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Datenschutzerklärung
        </h1>
        <p className="mt-3 text-sm text-foreground-muted">
          Diese Seite ist ein Entwurf für das laufende Projekt und ersetzt
          keine rechtliche Prüfung. Vor einem echten Live-Betrieb sollte sie
          von fachkundiger Stelle geprüft und um die konkreten
          Verantwortlichen-Angaben ergänzt werden (siehe Platzhalter unten).
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            1. Verantwortlicher
          </h2>
          <p className="text-foreground-muted">
            [Name, Anschrift und Kontaktdaten des Betreibers — wird vor dem
            Livegang ergänzt.]
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            2. Hochgeladene Fotos
          </h2>
          <p className="text-foreground-muted">
            Im Konfigurator hochgeladene Fotos werden ausschließlich zur
            Erzeugung des 3D-Modells an unseren KI-Dienstleister
            übertragen und nach Abschluss der Verarbeitung automatisch
            gelöscht. Es findet keine dauerhafte Speicherung der Originalfotos
            und keine Weitergabe zu anderen Zwecken statt.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            3. Analyse-Tools (Heatmaps)
          </h2>
          <p className="text-foreground-muted">
            Mit Ihrer Einwilligung über das Cookie-Banner setzen wir
            Microsoft Clarity, Google Analytics und Mixpanel ein, um
            anonymisierte Nutzungsstatistiken zu erstellen — Heatmaps und
            Sitzungsaufzeichnungen (Clarity), Besucherherkunft (Google
            Analytics) sowie Funnel- und Wiederkehr-Auswertungen (Mixpanel).
            Wenn Sie im Bestellformular einen Nickname angeben, wird dieser
            als anonyme Kennung an Mixpanel übermittelt, um Ihre
            Interaktionen über mehrere Besuche hinweg zusammenzuführen — es
            werden dabei keine echten Namen oder sonstigen Klardaten
            verarbeitet. Die Erhebung startet erst nach aktiver Zustimmung —
            ohne Zustimmung wird kein Analyse-Script geladen. Ihre
            Entscheidung wird lokal in Ihrem Browser gespeichert und lässt
            sich jederzeit ändern, indem Sie die Browserdaten dieser Seite
            löschen und die Seite neu laden.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            4. Bestellung &amp; Zahlung
          </h2>
          <p className="text-foreground-muted">
            Der Bestellprozess befindet sich aktuell im Testbetrieb: es ist
            kein Zahlungsanbieter angebunden, es findet keine echte Zahlung
            statt, und es werden keine echten Namen oder Adressen abgefragt —
            ein anonymer Nickname genügt. Eine E-Mail-Adresse ist freiwillig
            und wird nur erfasst, wenn Sie persönlich eine Kopie vom
            Betreiber erhalten möchten.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            5. Ihre Rechte
          </h2>
          <p className="text-foreground-muted">
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung und
            Einschränkung der Verarbeitung Ihrer Daten sowie ein
            Widerspruchsrecht gegen die Verarbeitung. Wenden Sie sich dazu an
            die oben genannte verantwortliche Stelle.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
