#!/usr/bin/env node
// Baut aus den taeglichen Snapshots (reporting/data/*.json, siehe
// clarity-snapshot.mjs) und manuell abgelegten Screenshots
// (reporting/screenshots/<YYYY-MM-DD>/*.png) einen einzigen,
// selbststaendigen HTML-Report - Bilder sind als base64 eingebettet, es
// braucht also keinen Server und keinen Clarity-Login zum Ansehen.
//
// Aufruf:
//   node reporting/generate-report.mjs --last 7
//   node reporting/generate-report.mjs --from 2026-08-10 --to 2026-08-17
//   node reporting/generate-report.mjs                     (alles Vorhandene)

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "reporting", "data");
const SCREENSHOTS_DIR = path.join(process.cwd(), "reporting", "screenshots");
const OUTPUT_DIR = path.join(process.cwd(), "reporting", "out");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function loadSnapshots(from, to) {
  let files;
  try {
    files = await readdir(DATA_DIR);
  } catch {
    return [];
  }
  const snapshots = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const date = file.replace(".json", "");
    if (from && date < from) continue;
    if (to && date > to) continue;
    const raw = await readFile(path.join(DATA_DIR, file), "utf8");
    snapshots.push(JSON.parse(raw));
  }
  snapshots.sort((a, b) => a.date.localeCompare(b.date));
  return snapshots;
}

async function loadScreenshots(from, to) {
  let dateDirs;
  try {
    dateDirs = await readdir(SCREENSHOTS_DIR);
  } catch {
    return [];
  }
  const shots = [];
  for (const date of dateDirs) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (from && date < from) continue;
    if (to && date > to) continue;
    const dirPath = path.join(SCREENSHOTS_DIR, date);
    let files;
    try {
      files = await readdir(dirPath);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
      const buffer = await readFile(path.join(dirPath, file));
      const ext = path.extname(file).slice(1).toLowerCase();
      const mime = ext === "jpg" ? "jpeg" : ext;
      const slug = path.basename(file, path.extname(file));
      const caption = slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      shots.push({ date, caption, dataUri: `data:image/${mime};base64,${buffer.toString("base64")}` });
    }
  }
  shots.sort((a, b) => a.date.localeCompare(b.date));
  return shots;
}

// Die Clarity-API liefert je metricName ein Array "information" mit je nach
// Metrik unterschiedlichen Feldern (Doku: "Additional metrics and
// dimensions may be included in the full API response"). Statt einzelne
// Feldnamen hart zu verdrahten und beim ersten echten Response mit
// abweichendem Schema zu brechen, werden alle vorhandenen Felder generisch
// als Tabelle dargestellt.
function collectMetrics(snapshots, key) {
  const byMetric = new Map();
  for (const snap of snapshots) {
    const payload = snap[key];
    if (!Array.isArray(payload)) continue;
    for (const entry of payload) {
      const list = byMetric.get(entry.metricName) ?? [];
      list.push(...(entry.information ?? []));
      byMetric.set(entry.metricName, list);
    }
  }
  return byMetric;
}

function renderMetricTable(metricName, rows) {
  if (!rows.length) return "";
  const allKeys = new Set();
  rows.forEach((r) => Object.keys(r).forEach((k) => allKeys.add(k)));
  const keys = [...allKeys];
  return `
    <h3>${metricName}</h3>
    <div class="table-wrap"><table>
      <thead><tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${keys.map((k) => `<td>${r[k] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
}

function renderScreenshots(shots) {
  if (!shots.length) return '<p class="muted">Keine Screenshots für diesen Zeitraum abgelegt.</p>';
  return shots
    .map((s) => `<figure><img src="${s.dataUri}" alt="${s.caption}" /><figcaption>${s.caption} — ${s.date}</figcaption></figure>`)
    .join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let from = typeof args.from === "string" ? args.from : null;
  let to = typeof args.to === "string" ? args.to : null;
  if (args.last) {
    const end = new Date();
    to = isoDate(end);
    const start = new Date();
    start.setDate(start.getDate() - Number(args.last) + 1);
    from = isoDate(start);
  }

  const snapshots = await loadSnapshots(from, to);
  const screenshots = await loadScreenshots(from, to);

  if (!snapshots.length && !screenshots.length) {
    console.error(
      "Keine Daten für diesen Zeitraum gefunden. Lief reporting/clarity-snapshot.mjs schon mindestens einmal? " +
        "Liegen Screenshots in reporting/screenshots/<YYYY-MM-DD>/?"
    );
    process.exit(1);
  }

  const allDates = [...snapshots.map((s) => s.date), ...screenshots.map((s) => s.date)].sort();
  const rangeLabel = `${from ?? allDates[0]} bis ${to ?? allDates[allDates.length - 1]}`;

  const overallHtml = [...collectMetrics(snapshots, "overall").entries()]
    .map(([name, rows]) => renderMetricTable(name, rows))
    .join("\n");
  const byUrlHtml = [...collectMetrics(snapshots, "byUrl").entries()]
    .map(([name, rows]) => renderMetricTable(`${name} nach Seite`, rows))
    .join("\n");

  const generatedAt = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Deine Skulptur — Analytics Report</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; max-width: 960px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 28px; margin-bottom: 4px; }
  .subtitle { color: #666; margin-top: 0; }
  .meta { font-size: 13px; color: #888; margin-bottom: 32px; }
  h2 { margin-top: 40px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
  h3 { margin-top: 24px; font-size: 16px; }
  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin-top: 8px; }
  th, td { border: 1px solid #e2e2e2; padding: 6px 10px; text-align: left; }
  th { background: #f7f7f7; }
  figure { margin: 24px 0; }
  figure img { max-width: 100%; border: 1px solid #ddd; border-radius: 8px; }
  figcaption { font-size: 13px; color: #555; margin-top: 6px; }
  .muted { color: #888; font-style: italic; }
  .note { background: #fff8e6; border: 1px solid #f0d98c; border-radius: 8px; padding: 12px 16px; font-size: 13px; margin: 24px 0; }
</style>
</head>
<body>
  <h1>Deine Skulptur — Analytics Report</h1>
  <p class="subtitle">Zeitraum: ${rangeLabel} · Quelle: Microsoft Clarity</p>
  <p class="meta">Erstellt am ${generatedAt} · Testbetrieb ohne Kundenkonto, ohne echte Zahlung.</p>

  <div class="note">
    Hinweis zur Methodik: Clarity liefert über die API immer nur die letzten
    1–3 Tage. Dieser Report basiert daher auf täglich gespeicherten
    Snapshots (reporting/data/) statt einer Live-Abfrage für beliebige
    Zeiträume. Zeiträume vor Beginn der Snapshot-Erfassung lassen sich
    nachträglich nicht rekonstruieren.
  </div>

  <h2>Kennzahlen (gesamt)</h2>
  ${overallHtml || '<p class="muted">Keine Snapshot-Daten für diesen Zeitraum.</p>'}

  <h2>Nach Seite</h2>
  ${byUrlHtml || '<p class="muted">Keine Snapshot-Daten für diesen Zeitraum.</p>'}

  <h2>Heatmap-Screenshots</h2>
  ${renderScreenshots(screenshots)}
</body>
</html>`;

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outFile = path.join(OUTPUT_DIR, `report-${from ?? "alle"}-bis-${to ?? "heute"}.html`);
  await writeFile(outFile, html, "utf8");
  console.log(`Report gespeichert: ${outFile}`);
}

main().catch((err) => {
  console.error("Report-Erstellung fehlgeschlagen:", err.message);
  process.exit(1);
});
