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
import { fetchGa4Data } from "./ga4Api.mjs";
import { fetchMixpanelData } from "./mixpanelApi.mjs";
import { loadLocalEnv } from "./localEnv.mjs";

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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- Zugriff auf die Rohdaten (Feldnamen anhand echter API-Antwort vom
// 17.08.2026 verifiziert, siehe reporting/README.md) ---------------------

function metricEntries(snapshots, key, metricName) {
  const rows = [];
  for (const snap of snapshots) {
    const payload = snap[key];
    if (!Array.isArray(payload)) continue;
    const match = payload.find((m) => m.metricName === metricName);
    if (match) rows.push(...(match.information ?? []));
  }
  return rows;
}

function sumField(snapshots, key, metricName, field) {
  return metricEntries(snapshots, key, metricName).reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function avgField(snapshots, key, metricName, field) {
  const rows = metricEntries(snapshots, key, metricName).filter((r) => r[field] != null);
  if (!rows.length) return null;
  return rows.reduce((total, row) => total + Number(row[field]), 0) / rows.length;
}

function aggregateByUrl(snapshots, metricName, field) {
  const totals = new Map();
  for (const row of metricEntries(snapshots, "byUrl", metricName)) {
    const url = row.Url ?? row.URL ?? "unbekannt";
    totals.set(url, (totals.get(url) ?? 0) + (Number(row[field]) || 0));
  }
  return [...totals.entries()]
    .map(([url, value]) => ({ url, value, path: shortenUrl(url) }))
    .sort((a, b) => b.value - a.value);
}

function shortenUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? "/ (Startseite)" : u.pathname;
  } catch {
    return url;
  }
}

function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return "–";
  return n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

// ---- Stat-Tiles (siehe dataviz-Skill: label + value, keine Legende noetig) ----

function renderStatTiles(tiles) {
  return `<div class="stat-grid">${tiles
    .map(
      (t) => `<div class="stat-tile">
        <div class="stat-value">${t.value}</div>
        <div class="stat-label">${t.label}</div>
      </div>`
    )
    .join("")}</div>`;
}

// ---- Horizontaler Balken-Chart (ein Merkmal = eine Farbe, keine Legende
// noetig - siehe dataviz-Skill marks-and-anatomy.md) ----------------------

function renderBarChart(rows, { valueSuffix = "" } = {}) {
  if (!rows.length) return '<p class="muted">Keine Daten für diesen Zeitraum.</p>';
  const top = rows.slice(0, 8);
  const max = Math.max(...top.map((r) => r.value), 1);
  const rowHeight = 34;
  const barHeight = 18;
  const labelWidth = 220;
  const chartWidth = 420;
  const width = labelWidth + chartWidth + 60;
  const height = top.length * rowHeight + 16;

  const bars = top
    .map((r, i) => {
      const y = 16 + i * rowHeight;
      const barLen = Math.max((r.value / max) * chartWidth, 2);
      return `
        <text x="${labelWidth - 10}" y="${y + barHeight / 2 + 4}" text-anchor="end" class="viz-label">${escapeHtml(r.path)}</text>
        <rect x="${labelWidth}" y="${y}" width="${barLen}" height="${barHeight}" rx="4" class="viz-bar" />
        <text x="${labelWidth + barLen + 8}" y="${y + barHeight / 2 + 4}" class="viz-value">${formatNumber(r.value)}${valueSuffix}</text>`;
    })
    .join("");

  return `
    <svg class="viz-root" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Balkendiagramm">
      <line x1="${labelWidth}" y1="0" x2="${labelWidth}" y2="${height}" class="viz-axis" />
      ${bars}
    </svg>`;
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
    .map((s) => `<figure><img src="${s.dataUri}" alt="${escapeHtml(s.caption)}" /><figcaption>${escapeHtml(s.caption)} — ${s.date}</figcaption></figure>`)
    .join("\n");
}

// ---- Kurze, regelbasierte Zusammenfassung - erfindet KEINEN Trend, wenn
// nur ein Tag Daten vorliegt (siehe Hinweis unten im Report selbst). ------

function renderNarrative(snapshots, { sessions, distinctUsers, avgScroll, rageClicks, deadClicks, topPage }) {
  if (!snapshots.length) return "";
  const dayCount = snapshots.length;
  const parts = [];

  parts.push(
    `Im gewählten Zeitraum (${dayCount} ${dayCount === 1 ? "Tag" : "Tage"} erfasst) gab es ${formatNumber(sessions)} Sitzungen von ${formatNumber(distinctUsers)} unterschiedlichen Nutzern.`
  );
  if (topPage) {
    parts.push(`Am meisten besucht: ${topPage.path} (${formatNumber(topPage.value)} Sitzungen).`);
  }
  if (avgScroll != null) {
    parts.push(`Im Schnitt wurde ${formatNumber(avgScroll)}% der Seite gescrollt.`);
  }
  if (deadClicks > 0) {
    parts.push(`${formatNumber(deadClicks)} Dead Clicks (Klicks auf nicht-interaktive Elemente) deuten auf mögliche Verwirrungspunkte hin.`);
  }
  if (rageClicks > 0) {
    parts.push(`${formatNumber(rageClicks)} Rage Clicks wurden erfasst — Stellen mit wiederholten frustrierten Klicks, einen Blick wert.`);
  }
  if (dayCount === 1) {
    parts.push("Hinweis: Basis ist bisher nur ein einzelner Tag — für belastbare Trends (steigend/fallend) sind mehr Tage Sammelzeit nötig.");
  }
  return parts.join(" ");
}

// ---- Google-Analytics-Abschnitt (eigene Quelle, eigener Block - siehe
// reporting/README.md: GA4 wird live abgefragt, nicht aus einem Snapshot-
// Archiv wie Clarity, deshalb hier separat statt vermischt) --------------

function shortenGa4Path(p) {
  return p === "/" ? "/ (Startseite)" : p;
}

function renderGa4Section(ga4) {
  if (!ga4) {
    return `<p class="muted">Google Analytics ist für diesen Report nicht konfiguriert (GA4_PROPERTY_ID bzw. Zugangsdaten fehlen) — siehe reporting/README.md.</p>`;
  }

  const o = ga4.overall ?? {};
  const statTilesHtml = renderStatTiles([
    { label: "Sitzungen", value: formatNumber(o.sessions) },
    { label: "Aktive Nutzer", value: formatNumber(o.activeUsers) },
    { label: "Seitenaufrufe", value: formatNumber(o.screenPageViews) },
    { label: "Engagement-Rate", value: o.engagementRate != null ? `${formatNumber(o.engagementRate * 100)}%` : "–" },
    { label: "Ø Sitzungsdauer", value: o.averageSessionDuration != null ? `${formatNumber(o.averageSessionDuration)}s` : "–" },
  ]);

  const byPageRows = (ga4.byPage ?? []).map((r) => ({ path: shortenGa4Path(r.pagePath), value: r.sessions }));
  const byPageChart = renderBarChart(byPageRows);

  const bySourceRows = (ga4.bySource ?? []).map((r) => ({
    path: `${r.sessionSource || "(direkt)"} / ${r.sessionMedium || "none"}`,
    value: r.sessions,
  }));
  const bySourceChart = renderBarChart(bySourceRows);

  const eventTable = (ga4.byEvent ?? []).length
    ? `<div class="table-wrap"><table>
        <thead><tr><th>Event</th><th>Anzahl</th></tr></thead>
        <tbody>${ga4.byEvent.map((r) => `<tr><td>${escapeHtml(r.eventName)}</td><td>${formatNumber(r.eventCount)}</td></tr>`).join("")}</tbody>
      </table></div>`
    : '<p class="muted">Keine Funnel-Events in diesem Zeitraum erfasst.</p>';

  return `
    ${statTilesHtml}
    <h3>Sitzungen nach Seite</h3>
    <div class="chart-card">${byPageChart}</div>
    <h3>Sitzungen nach Quelle / Medium</h3>
    <div class="chart-card">${bySourceChart}</div>
    <h3>Funnel-Events</h3>
    ${eventTable}`;
}

// ---- Mixpanel-Abschnitt (eigene Quelle, eigener Block) - liefert, was
// weder Clarity (UX/Heatmaps) noch GA4 (Traffic/Marketing) gut abdecken:
// Funnel-Conversion pro Schritt und Retention/Kohorten. Wie GA4 eine
// Live-Abfrage fuer den gewaehlten Zeitraum, kein Archiv noetig. ---------

function renderRetentionTable(retention) {
  if (!retention || typeof retention !== "object") {
    return '<p class="muted">Keine Retention-Daten für diesen Zeitraum (oder noch keine Bestellungen, an die sich eine Rückkehr messen ließe).</p>';
  }
  const cohortDates = Object.keys(retention).sort();
  if (!cohortDates.length) {
    return '<p class="muted">Keine Retention-Daten für diesen Zeitraum.</p>';
  }
  const maxIntervals = Math.max(...cohortDates.map((d) => (retention[d].counts ?? []).length));
  const intervalHeaders = Array.from({ length: maxIntervals }, (_, i) => `<th>Tag ${i}</th>`).join("");

  const rows = cohortDates
    .map((date) => {
      const cohort = retention[date];
      const cells = Array.from({ length: maxIntervals }, (_, i) => {
        const count = cohort.counts?.[i];
        const pct = count != null && cohort.first ? Math.round((count / cohort.first) * 100) : null;
        return `<td>${count != null ? `${formatNumber(count)}${pct != null ? ` (${pct}%)` : ""}` : "–"}</td>`;
      }).join("");
      return `<tr><td>${date}</td><td>${formatNumber(cohort.first)}</td>${cells}</tr>`;
    })
    .join("");

  return `
    <div class="table-wrap"><table>
      <thead><tr><th>Kohorte (erster "order_completed")</th><th>Kohortengröße</th>${intervalHeaders}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function renderFunnelChart(funnel) {
  if (!funnel?.data) {
    return '<p class="muted">Kein Funnel konfiguriert (MIXPANEL_FUNNEL_ID) — siehe reporting/README.md, wie man in der Mixpanel-UI einen Funnel-Report anlegt und dessen ID einträgt.</p>';
  }
  // Mixpanel liefert Funnel-Daten pro Tag im Zeitraum - fuer die
  // Gesamtansicht ueber den ganzen Zeitraum werden die Schritt-Counts
  // je Tag aufsummiert, statt nur den letzten Tag zu zeigen.
  const dayEntries = Object.values(funnel.data);
  if (!dayEntries.length) {
    return '<p class="muted">Keine Funnel-Daten für diesen Zeitraum.</p>';
  }
  const stepCount = Math.max(...dayEntries.map((d) => d.steps?.length ?? 0));
  const totals = Array.from({ length: stepCount }, () => 0);
  const labels = Array.from({ length: stepCount }, () => "");
  for (const day of dayEntries) {
    (day.steps ?? []).forEach((step, i) => {
      totals[i] += step.count ?? 0;
      if (step.goal) labels[i] = step.goal;
    });
  }
  const rows = totals.map((value, i) => ({ path: labels[i] || `Schritt ${i + 1}`, value }));
  return renderBarChart(rows);
}

function renderMixpanelSection(mixpanel) {
  if (!mixpanel) {
    return '<p class="muted">Mixpanel ist für diesen Report nicht konfiguriert (MIXPANEL_PROJECT_ID bzw. Service-Account-Zugangsdaten fehlen) — siehe reporting/README.md.</p>';
  }

  const segRows = Object.entries(mixpanel.segmentation ?? {})
    .map(([event, value]) => ({ path: event, value }))
    .sort((a, b) => b.value - a.value);

  return `
    <h3>Event-Zählungen</h3>
    <div class="chart-card">${renderBarChart(segRows)}</div>
    <h3>Retention — kommen Nutzer nach einer Bestellung zurück?</h3>
    ${renderRetentionTable(mixpanel.retention)}
    <h3>Funnel-Conversion</h3>
    ${renderFunnelChart(mixpanel.funnel)}`;
}

async function main() {
  await loadLocalEnv();
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
  const effectiveFrom = from ?? allDates[0] ?? isoDate(new Date());
  const effectiveTo = to ?? allDates[allDates.length - 1] ?? isoDate(new Date());
  const rangeLabel = `${effectiveFrom} bis ${effectiveTo}`;

  let ga4Data = null;
  let ga4Error = null;
  try {
    ga4Data = await fetchGa4Data(effectiveFrom, effectiveTo);
  } catch (err) {
    ga4Error = err.message;
    console.warn(`Google Analytics konnte nicht abgefragt werden: ${err.message}`);
  }

  let mixpanelData = null;
  let mixpanelError = null;
  try {
    mixpanelData = await fetchMixpanelData(effectiveFrom, effectiveTo);
  } catch (err) {
    mixpanelError = err.message;
    console.warn(`Mixpanel konnte nicht abgefragt werden: ${err.message}`);
  }

  // Kernzahlen
  const sessions = sumField(snapshots, "overall", "Traffic", "totalSessionCount");
  const distinctUsers = sumField(snapshots, "overall", "Traffic", "distinctUserCount");
  const avgScroll = avgField(snapshots, "overall", "ScrollDepth", "averageScrollDepth");
  const rageClicks = sumField(snapshots, "overall", "RageClickCount", "subTotal");
  const deadClicks = sumField(snapshots, "overall", "DeadClickCount", "subTotal");
  const pagesRanked = aggregateByUrl(snapshots, "Traffic", "totalSessionCount");
  const topPage = pagesRanked[0] ?? null;

  const statTilesHtml = renderStatTiles([
    { label: "Sitzungen", value: formatNumber(sessions) },
    { label: "Eindeutige Nutzer", value: formatNumber(distinctUsers) },
    { label: "Ø Scroll-Tiefe", value: avgScroll != null ? `${formatNumber(avgScroll)}%` : "–" },
    { label: "Rage Clicks", value: formatNumber(rageClicks) },
    { label: "Dead Clicks", value: formatNumber(deadClicks) },
  ]);

  const narrative = renderNarrative(snapshots, { sessions, distinctUsers, avgScroll, rageClicks, deadClicks, topPage });
  const barChartHtml = renderBarChart(pagesRanked, { valueSuffix: "" });

  // Alles jenseits der oben kuratierten Kennzahlen bleibt als generische
  // Tabelle sichtbar (Browser/Device/OS/Country/PageTitle/... siehe
  // reporting/README.md) - kein Datenverlust, nur nicht extra visualisiert.
  const CURATED = new Set(["Traffic", "ScrollDepth", "RageClickCount", "DeadClickCount"]);
  function collectRemaining(key) {
    const byMetric = new Map();
    for (const snap of snapshots) {
      const payload = snap[key];
      if (!Array.isArray(payload)) continue;
      for (const entry of payload) {
        if (key === "overall" && CURATED.has(entry.metricName)) continue;
        const list = byMetric.get(entry.metricName) ?? [];
        list.push(...(entry.information ?? []));
        byMetric.set(entry.metricName, list);
      }
    }
    return byMetric;
  }
  const remainingOverallHtml = [...collectRemaining("overall").entries()]
    .map(([name, rows]) => renderMetricTable(name, rows))
    .join("\n");

  const generatedAt = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Deine Skulptur — Analytics Report</title>
<style>
  :root {
    color-scheme: light;
    --surface-1: #fcfcfb;
    --page-plane: #f9f9f7;
    --text-primary: #0b0b0b;
    --text-secondary: #52514e;
    --text-muted: #898781;
    --gridline: #e1e0d9;
    --axis: #c3c2b7;
    --series-1: #2a78d6;
    --border: rgba(11,11,11,0.10);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      color-scheme: dark;
      --surface-1: #1a1a19;
      --page-plane: #0d0d0d;
      --text-primary: #ffffff;
      --text-secondary: #c3c2b7;
      --text-muted: #898781;
      --gridline: #2c2c2a;
      --axis: #383835;
      --series-1: #3987e5;
      --border: rgba(255,255,255,0.10);
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --surface-1: #1a1a19;
    --page-plane: #0d0d0d;
    --text-primary: #ffffff;
    --text-secondary: #c3c2b7;
    --text-muted: #898781;
    --gridline: #2c2c2a;
    --axis: #383835;
    --series-1: #3987e5;
    --border: rgba(255,255,255,0.10);
  }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 960px; margin: 0 auto; padding: 40px 24px; background: var(--page-plane); color: var(--text-primary); line-height: 1.5; }
  .back-link { display: inline-block; font-size: 13px; color: var(--text-secondary); text-decoration: none; margin-bottom: 16px; }
  .back-link:hover { color: var(--text-primary); }
  h1 { font-size: 28px; margin-bottom: 4px; }
  .subtitle { color: var(--text-secondary); margin-top: 0; }
  .meta { font-size: 13px; color: var(--text-muted); margin-bottom: 32px; }
  h2 { margin-top: 48px; border-bottom: 2px solid var(--gridline); padding-bottom: 8px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .source-tag { font-size: 12px; font-weight: 400; color: var(--text-muted); border: 1px solid var(--border); border-radius: 999px; padding: 2px 10px; }
  h3 { margin-top: 24px; font-size: 16px; color: var(--text-secondary); }
  .narrative { font-size: 15px; background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; margin-top: 16px; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px; }
  .stat-tile { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
  .stat-value { font-size: 28px; font-weight: 600; color: var(--text-primary); }
  .stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin-top: 8px; }
  th, td { border: 1px solid var(--gridline); padding: 6px 10px; text-align: left; }
  th { background: var(--surface-1); color: var(--text-secondary); }
  figure { margin: 24px 0; }
  figure img { max-width: 100%; border: 1px solid var(--border); border-radius: 8px; }
  figcaption { font-size: 13px; color: var(--text-secondary); margin-top: 6px; }
  .muted { color: var(--text-muted); font-style: italic; }
  .note { background: #fff8e6; border: 1px solid #f0d98c; border-radius: 8px; padding: 12px 16px; font-size: 13px; margin: 24px 0; color: #4a3a00; }
  .viz-root .viz-bar { fill: var(--series-1); }
  .viz-root .viz-axis { stroke: var(--axis); stroke-width: 1; }
  .viz-root .viz-label { fill: var(--text-secondary); font-size: 12px; }
  .viz-root .viz-value { fill: var(--text-primary); font-size: 12px; font-weight: 600; }
  .chart-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; margin-top: 16px; }
</style>
</head>
<body>
  <a href="/" class="back-link">← Zurück zur Startseite</a>
  <h1>Deine Skulptur — Analytics Report</h1>
  <p class="subtitle">Zeitraum: ${rangeLabel}</p>
  <p class="meta">Erstellt am ${generatedAt} · Danke fürs Testen — so haben sich Besucher bisher auf der Seite verhalten.</p>

  <h2>Microsoft Clarity <span class="source-tag">Quelle: Microsoft Clarity</span></h2>
  <div class="note">
    Hinweis zur Methodik: Clarity liefert über die API immer nur die letzten
    1–3 Tage. Dieser Abschnitt basiert daher auf täglich gespeicherten
    Snapshots (reporting/data/) statt einer Live-Abfrage für beliebige
    Zeiträume. Zeiträume vor Beginn der Snapshot-Erfassung lassen sich
    nachträglich nicht rekonstruieren.
  </div>

  <h3>Auf einen Blick</h3>
  <p class="narrative">${narrative}</p>
  ${statTilesHtml}

  <h3>Sitzungen nach Seite</h3>
  <div class="chart-card">${barChartHtml}</div>

  <h3>Heatmap-Screenshots</h3>
  ${renderScreenshots(screenshots)}

  <h3>Weitere Kennzahlen</h3>
  ${remainingOverallHtml || '<p class="muted">Keine weiteren Daten für diesen Zeitraum.</p>'}

  <h2>Google Analytics <span class="source-tag">Quelle: Google Analytics (GA4)</span></h2>
  <div class="note">
    Im Unterschied zu Clarity erlaubt GA4 beliebige historische Zeiträume
    direkt auf Anfrage — dieser Abschnitt ist eine Live-Abfrage für genau
    den oben gewählten Zeitraum, kein Archiv nötig.
  </div>
  ${ga4Error ? `<p class="muted">Google Analytics konnte nicht abgefragt werden: ${escapeHtml(ga4Error)}</p>` : renderGa4Section(ga4Data)}

  <h2>Mixpanel <span class="source-tag">Quelle: Mixpanel</span></h2>
  <div class="note">
    Ergänzt Clarity (UX/Heatmaps) und GA4 (Traffic/Marketing) um
    Produkt-Analytics: Funnel-Conversion pro Schritt und Retention — kommen
    Nutzer nach einer Bestellung zurück? Wie GA4 eine Live-Abfrage für den
    gewählten Zeitraum.
  </div>
  ${mixpanelError ? `<p class="muted">Mixpanel konnte nicht abgefragt werden: ${escapeHtml(mixpanelError)}</p>` : renderMixpanelSection(mixpanelData)}
</body>
</html>`;

  // --out erlaubt einen festen Zielpfad (z.B. public/ergebnisse.html, damit
  // Next.js die Datei automatisch unter einer stabilen URL ausliefert) -
  // ohne --out landet der Report wie bisher unter reporting/out/ mit einem
  // vom Zeitraum abgeleiteten Dateinamen.
  const outFile = typeof args.out === "string"
    ? path.join(process.cwd(), args.out)
    : path.join(OUTPUT_DIR, `report-${from ?? "alle"}-bis-${to ?? "heute"}.html`);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, html, "utf8");
  console.log(`Report gespeichert: ${outFile}`);
}

main().catch((err) => {
  console.error("Report-Erstellung fehlgeschlagen:", err.message);
  process.exit(1);
});
