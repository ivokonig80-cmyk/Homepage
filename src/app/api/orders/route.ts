import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

// Demo-Bestellannahme OHNE echte Zahlung (siehe OrderForm.tsx): erfasst nur
// einen anonymen Nickname (E-Mail freiwillig, fuer eine persoenliche Kopie
// vom Betreiber) statt echter Name/Adresse-Daten - es wird ja ohnehin
// nichts verschickt. Fuer den echten Betrieb wuerde hier ein
// Payment-Provider UND eine echte Datenbank statt der lokalen Log-Datei
// stehen - das Log ist bewusst simpel gehalten und uebersteht keine
// Neu-Deploys.
const ORDERS_LOG = path.join(process.cwd(), ".data", "orders.log");

interface OrderPayload {
  nickname: string;
  email?: string;
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
    typeof b.nickname === "string" && b.nickname.trim().length > 0 &&
    (b.email === undefined || b.email === "" || (typeof b.email === "string" && /\S+@\S+\.\S+/.test(b.email))) &&
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
