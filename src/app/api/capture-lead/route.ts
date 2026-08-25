import { NextResponse } from "next/server";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

// Erfasst Besucher-Eingaben/-Konfiguration VOR einem abgeschlossenen
// Checkout (eingetippte E-Mail, erreichter Konfigurator-Schritt inkl.
// gewaehlter Optionen) - im selben lokalen Test-Ordner wie die generierten
// Modelle (siehe backend: test-models/), damit sich auch abgebrochene
// Durchlaeufe waehrend der Testphase nachvollziehen lassen. Gleiches
// Speicher-Muster wie .data/orders.log (siehe /api/orders) fuer
// abgeschlossene Bestellungen, nur eben schon VOR dem Abschluss.
const CAPTURE_LOG = path.join(process.cwd(), "test-models", "visitor-inputs.log");

interface CapturePayload {
  type: "email_entered" | "step_reached";
  [key: string]: unknown;
}

function isValidPayload(body: unknown): body is CapturePayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return b.type === "email_entered" || b.type === "step_reached";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const record = { capturedAt: new Date().toISOString(), ...body };

  await mkdir(path.dirname(CAPTURE_LOG), { recursive: true });
  await appendFile(CAPTURE_LOG, JSON.stringify(record) + "\n", "utf8");

  return NextResponse.json({ ok: true });
}
