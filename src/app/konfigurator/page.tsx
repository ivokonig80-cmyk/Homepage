import { redirect } from "next/navigation";

// /konfigurator selbst ist kein eigener Schritt - jeder Einstieg (z.B. der
// Hero-CTA) landet auf dem ersten echten Schritt, damit jede Konfigurator-
// Seite eine eindeutige, für Clarity-Heatmaps auswertbare URL hat (siehe
// [step]/page.tsx).
export default function KonfiguratorEntryPage() {
  redirect("/konfigurator/upload");
}
