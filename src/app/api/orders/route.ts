import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

// Demo-Bestellannahme OHNE echte Zahlung (siehe StepCheckout/ProductConfigurator):
// erfasst die Bestellung server-seitig (Name/Adresse/Auswahl/Preis) und gibt
// eine Bestellnummer zurück, verarbeitet aber keine Zahlung. Für den echten
// Betrieb würde hier ein Payment-Provider (z.B. Stripe) UND eine echte
// Datenbank statt der lokalen Log-Datei stehen - das Log ist bewusst simpel
// gehalten, bis dieser Schritt ansteht, und übersteht keine Neu-Deploys.
const ORDERS_LOG = path.join(process.cwd(), ".data", "orders.log");

interface OrderPayload {
  name: string;
  email: string;
  street: string;
  zip: string;
  city: string;
  item: string;
  material: string;
  size: string;
  price: number;
  context: string;
}

function isValidPayload(body: unknown): body is OrderPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === "string" && b.name.trim().length > 0 &&
    typeof b.email === "string" && /\S+@\S+\.\S+/.test(b.email) &&
    typeof b.street === "string" && b.street.trim().length > 0 &&
    typeof b.zip === "string" && b.zip.trim().length > 0 &&
    typeof b.city === "string" && b.city.trim().length > 0 &&
    typeof b.item === "string" &&
    typeof b.material === "string" &&
    typeof b.size === "string" &&
    typeof b.price === "number" && b.price > 0 &&
    typeof b.context === "string"
  );
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
  };

  await mkdir(path.dirname(ORDERS_LOG), { recursive: true });
  await appendFile(ORDERS_LOG, JSON.stringify(record) + "\n", "utf8");

  return NextResponse.json({ orderId, status: "confirmed" });
}
