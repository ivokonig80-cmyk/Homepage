// Bewusst getrennt von analytics.ts (Mixpanel/Clarity, aggregiert extern):
// dieser Helper schreibt Rohdaten einzelner Besucher (E-Mail-Eingaben,
// Konfigurator-Fortschritt) lokal in test-models/visitor-inputs.log - auch
// wenn der Besucher NIE bis zum Checkout kommt (siehe /api/orders fuer das
// Pendant bei abgeschlossenen Bestellungen). Fire-and-forget: darf den
// eigentlichen Nutzerfluss nie blockieren oder unterbrechen, deshalb ohne
// await im Aufrufer und mit verschlucktem Fehler.
export function captureLead(payload: Record<string, unknown>): void {
  fetch("/api/capture-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Best-effort QA-Logging - ein Fehlschlag hier darf den Besucher nie
    // stören.
  });
}
