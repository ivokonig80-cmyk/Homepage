#!/usr/bin/env node
// Erzeugt automatisch einen Screenshot der Material-Auswahl auf der
// Shop-Produktseite und markiert das laut Mixpanel-Daten meistgewaehlte
// Material. Ersetzt das manuelle Abfotografieren von Clarity's
// Heatmap-Ansicht: Clarity's Heatmap baut ihr Hintergrundbild aus einem
// automatischen DOM-Snapshot, der Canvas-/WebGL-Inhalte (unsere 3D-Vorschau)
// oft nicht sauber einfaengt. Playwright rendert stattdessen die echte,
// live gehostete Seite und markiert direkt im DOM per CSS - kein separates
// Bildbearbeitungs-Tool noetig.
//
// Aufruf: node reporting/material-heatmap-screenshot.mjs

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fetchMixpanelData } from "./mixpanelApi.mjs";
import { loadLocalEnv } from "./localEnv.mjs";

const SITE_BASE_URL = process.env.SITE_BASE_URL ?? "https://polinova.store";
const PRODUCT_SLUG = process.env.HEATMAP_PRODUCT_SLUG ?? "baer";
const LOOKBACK_DAYS = 90;

// Muss mit der Reihenfolge von MATERIALS in src/lib/catalog.ts
// uebereinstimmen - identifiziert den n-ten Material-Button per Index
// statt per Label-Text (robuster gegenueber Preis-Zusaetzen im Buttontext).
const MATERIAL_IDS_IN_ORDER = ["anthrazit", "rohstahl", "messing", "kupfer"];

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  await loadLocalEnv();

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - LOOKBACK_DAYS);

  let mixpanelData;
  try {
    mixpanelData = await fetchMixpanelData(isoDate(from), isoDate(to));
  } catch (err) {
    console.warn(`Mixpanel-Abfrage fuer Material-Beliebtheit fehlgeschlagen: ${err.message}`);
    return;
  }
  if (!mixpanelData) {
    console.log("Mixpanel nicht konfiguriert - kein Heatmap-Screenshot erzeugt.");
    return;
  }

  const shopCounts = mixpanelData.materialPopularity?.shop ?? {};
  const entries = Object.entries(shopCounts);
  if (!entries.length) {
    console.log('Noch keine "material_select"-Events (Kontext: shop) vorhanden - kein Heatmap-Screenshot erzeugt.');
    return;
  }

  entries.sort((a, b) => b[1] - a[1]);
  const [winningMaterialId, winningCount] = entries[0];
  const totalClicks = entries.reduce((sum, [, count]) => sum + count, 0);
  const winningIndex = MATERIAL_IDS_IN_ORDER.indexOf(winningMaterialId);
  if (winningIndex === -1) {
    console.warn(`Unbekannte Material-ID "${winningMaterialId}" - MATERIAL_IDS_IN_ORDER in diesem Skript pruefen.`);
    return;
  }
  console.log(
    `Meistgewaehltes Material im Shop: ${winningMaterialId} (${winningCount} von ${totalClicks} Klicks insgesamt)`
  );

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    const url = `${SITE_BASE_URL}/shop/${PRODUCT_SLUG}`;
    console.log(`Oeffne ${url} ...`);
    await page.goto(url, { waitUntil: "load" });

    const materialFieldset = page.locator("fieldset", { has: page.locator("legend", { hasText: "Material" }) });
    await materialFieldset.waitFor({ state: "visible" });

    const winningButton = materialFieldset.locator("button").nth(winningIndex);
    await winningButton.evaluate((el) => {
      el.style.outline = "3px solid #f5c451";
      el.style.outlineOffset = "2px";
      el.style.boxShadow = "0 0 0 6px rgba(245,196,81,0.28)";
      el.style.borderRadius = "999px";
      const badge = document.createElement("span");
      badge.textContent = "★ Beliebteste Wahl";
      badge.style.marginLeft = "8px";
      badge.style.fontSize = "11px";
      badge.style.fontWeight = "700";
      badge.style.color = "#f5c451";
      badge.style.whiteSpace = "nowrap";
      el.insertAdjacentElement("afterend", badge);
    });

    const dateDir = isoDate(new Date());
    const outDir = path.join(process.cwd(), "reporting", "screenshots", dateDir);
    await mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, `heatmap-shop-${PRODUCT_SLUG}-material.png`);
    await materialFieldset.screenshot({ path: outFile });
    console.log(`Heatmap-Screenshot gespeichert: ${outFile}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Material-Heatmap-Screenshot fehlgeschlagen:", err.message);
  process.exit(1);
});
