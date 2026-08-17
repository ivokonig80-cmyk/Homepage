#!/usr/bin/env node
// Ruft die Microsoft-Clarity-Data-Export-API einmal ab und speichert das
// Ergebnis lokal unter reporting/data/<YYYY-MM-DD>.json.
//
// Warum ueberhaupt archivieren? Clarity liefert ueber die API IMMER nur die
// letzten 1-3 Tage (numOfDays=1|2|3, hartes Limit, keine beliebige
// Vergangenheit abrufbar - siehe
// https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api).
// Ohne eigenes Archiv koennte man also nie einen Report fuer z.B. "die
// letzten drei Wochen" bauen. Dieses Skript laeuft taeglich per GitHub
// Action (.github/workflows/clarity-daily-snapshot.yml) und baut so genau
// dieses Archiv auf. Zwei Aufrufe pro Lauf (Gesamt + nach URL) bleiben weit
// unter dem Limit von 10 Anfragen/Tag.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

// Minimaler .env-Loader fuer lokale/manuelle Laeufe (kein dotenv-Package,
// um reporting/ bewusst ohne zusaetzliche npm-Abhaengigkeiten lauffaehig zu
// halten). Der automatische taegliche Lauf nutzt stattdessen direkt das
// GitHub-Actions-Secret CLARITY_API_TOKEN als Env-Var.
async function loadLocalEnv() {
  try {
    const raw = await readFile(path.join(process.cwd(), "reporting", ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  } catch {
    // Keine lokale .env vorhanden - kein Problem, z.B. in CI.
  }
}

const BASE_URL = "https://www.clarity.ms/export-data/api/v1/project-live-insights";

async function fetchClarity(token, params) {
  const url = new URL(BASE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Clarity API antwortete mit ${res.status}: ${body}`);
  }
  return res.json();
}

async function main() {
  await loadLocalEnv();
  const token = process.env.CLARITY_API_TOKEN;
  if (!token) {
    console.error(
      "CLARITY_API_TOKEN fehlt. Siehe reporting/README.md: Token in Clarity unter Settings -> Data Export erzeugen und als reporting/.env oder GitHub-Actions-Secret hinterlegen."
    );
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);

  const [overall, byUrl] = await Promise.all([
    fetchClarity(token, { numOfDays: 1 }),
    fetchClarity(token, { numOfDays: 1, dimension1: "URL" }),
  ]);

  const snapshot = { date: today, fetchedAt: new Date().toISOString(), overall, byUrl };

  const dir = path.join(process.cwd(), "reporting", "data");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${today}.json`);
  await writeFile(file, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Snapshot gespeichert: ${file}`);
}

main().catch((err) => {
  console.error("Snapshot fehlgeschlagen:", err.message);
  process.exit(1);
});
