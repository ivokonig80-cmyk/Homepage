import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, appendFile, readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Demo-Bestellannahme OHNE echte Zahlung (siehe OrderForm.tsx): erfasst nur
// einen anonymen Nickname (E-Mail freiwillig, fuer eine persoenliche Kopie
// vom Betreiber) statt echter Name/Adresse-Daten - es wird ja ohnehin
// nichts verschickt. Fuer den echten Betrieb wuerde hier ein
// Payment-Provider UND eine echte Datenbank statt der lokalen Log-Datei
// stehen - das Log ist bewusst simpel gehalten und uebersteht keine
// Neu-Deploys.
const ORDERS_LOG = path.join(process.cwd(), ".data", "orders.log");
// Taegliche Clarity-Snapshots aus reporting/clarity-snapshot.mjs (siehe
// dort) - der jeweils neueste wird unveraendert an jede Bestellung
// angehaengt, damit beim manuellen Durchsehen der Test-Bestellungen sofort
// erkennbar ist, wie die Traffic-/Verhaltenslage zum Bestellzeitpunkt war.
const ANALYTICS_SNAPSHOT_DIR = path.join(process.cwd(), "reporting", "data");

interface OrderPayload {
  nickname: string;
  email?: string;
  // Freiwillige Kurzumfrage im Bestellformular (siehe OrderForm.tsx,
  // Fragen 1-3) - rein informativ, keine der drei wird validiert/erzwungen.
  feedback?: string;
  age?: string;
  origin?: string;
  item: string;
  material: string;
  size: string;
  price: number;
  context: string;
  modelRef?: string;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isValidPayload(body: unknown): body is OrderPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.nickname === "string" && b.nickname.trim().length > 0 &&
    (b.email === undefined || b.email === "" || (typeof b.email === "string" && /\S+@\S+\.\S+/.test(b.email))) &&
    isOptionalString(b.feedback) &&
    isOptionalString(b.age) &&
    isOptionalString(b.origin) &&
    typeof b.item === "string" &&
    typeof b.material === "string" &&
    typeof b.size === "string" &&
    typeof b.price === "number" && b.price > 0 &&
    typeof b.context === "string" &&
    (b.modelRef === undefined || typeof b.modelRef === "string")
  );
}

// Bestmoeglich, kein harter Fehler: fehlt der Reporting-Ordner oder noch
// kein Snapshot (z.B. lokal ohne CLARITY_API_TOKEN, siehe reporting/README),
// bekommt die Bestellung trotzdem einen orderId - nur eben ohne
// Analytics-Anhang.
async function loadLatestAnalyticsSnapshot(): Promise<unknown | null> {
  try {
    const files = (await readdir(ANALYTICS_SNAPSHOT_DIR)).filter((f) => f.endsWith(".json")).sort();
    const latest = files.at(-1);
    if (!latest) return null;
    const raw = await readFile(path.join(ANALYTICS_SNAPSHOT_DIR, latest), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

  const orderId = randomUUID();
  const record = {
    orderId,
    createdAt: new Date().toISOString(),
    ...body,
    analyticsSnapshot: await loadLatestAnalyticsSnapshot(),
  };

  await mkdir(path.dirname(ORDERS_LOG), { recursive: true });
  await appendFile(ORDERS_LOG, JSON.stringify(record) + "\n", "utf8");

  return NextResponse.json({ orderId, status: "confirmed" });
}
