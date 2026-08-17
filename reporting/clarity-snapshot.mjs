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

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { loadLocalEnv } from "./localEnv.mjs";

const BASE_URL = "https://www.clarity.ms/export-data/api/v1/project-live-insights";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 5_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchClarityOnce(token, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Clarity API hat innerhalb von ${REQUEST_TIMEOUT_MS / 1000}s nicht geantwortet.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 5xx-Antworten von Clarity (z.B. 504 Gateway Timeout - live beim ersten
 * Lauf beobachtet, offenbar ein kurzzeitiger Aussetzer auf Microsoft-
 * Seite) sind meist transient und werden mit ein paar Sekunden Abstand
 * erneut versucht. 4xx (falscher/abgelaufener Token, ungueltige Parameter,
 * Tageslimit erreicht) wird NICHT wiederholt - da hilft nur ein Eingriff
 * am Token/den Parametern, ein Retry aendert daran nichts.
 */
async function fetchClarity(token, params) {
  const url = new URL(BASE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Rufe ${url} ab... (Versuch ${attempt}/${MAX_ATTEMPTS})`);
    let res;
    try {
      res = await fetchClarityOnce(token, url);
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      console.warn(`... Netzwerkfehler (${err.message}), versuche erneut in ${RETRY_BASE_DELAY_MS * attempt}ms`);
      await sleep(RETRY_BASE_DELAY_MS * attempt);
      continue;
    }

    if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
      console.warn(`... ${res.status} (Server-Fehler bei Clarity), versuche erneut in ${RETRY_BASE_DELAY_MS * attempt}ms`);
      await sleep(RETRY_BASE_DELAY_MS * attempt);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Clarity API antwortete mit ${res.status}: ${body}`);
    }

    console.log(`... ${url} beantwortet mit ${res.status}`);
    return res.json();
  }
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

  // Nacheinander statt parallel - schont Clarity's Gateway und macht in den
  // Logs eindeutig erkennbar, welcher der beiden Aufrufe ggf. scheitert.
  const overall = await fetchClarity(token, { numOfDays: 1 });
  const byUrl = await fetchClarity(token, { numOfDays: 1, dimension1: "URL" });

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
