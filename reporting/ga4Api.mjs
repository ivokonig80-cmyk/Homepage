// Wrapper um die offizielle Google-Analytics-Data-API-Client-Bibliothek
// (@google-analytics/data). Anders als Clarity liefert GA4 beliebige
// historische Zeiträume direkt auf Anfrage (kein 1-3-Tage-Limit) - deshalb
// braucht GA4 KEIN eigenes taegliches Snapshot-Archiv wie Clarity, sondern
// wird bei jeder Report-Anfrage live abgefragt (siehe generate-report.mjs).
//
// Auth zwei Wege (erster Treffer gewinnt):
// 1. GA4_SERVICE_ACCOUNT_JSON - kompletter JSON-Schluessel-Inhalt als
//    String in einer Env-Var (so liegt er als GitHub-Actions-Secret vor).
// 2. reporting/secrets/ga4-service-account.json - lokale Datei fuer
//    manuelle/lokale Laeufe (gitignored, siehe .gitignore).

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { readFile } from "node:fs/promises";
import path from "node:path";

const LOCAL_KEY_FILE = path.join(process.cwd(), "reporting", "secrets", "ga4-service-account.json");

async function buildClient() {
  if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON);
    return new BetaAnalyticsDataClient({ credentials });
  }
  try {
    await readFile(LOCAL_KEY_FILE);
    return new BetaAnalyticsDataClient({ keyFilename: LOCAL_KEY_FILE });
  } catch {
    return null;
  }
}

function rowsToObjects(response, dimensionNames, metricNames) {
  return (response.rows ?? []).map((row) => {
    const obj = {};
    dimensionNames.forEach((name, i) => (obj[name] = row.dimensionValues[i]?.value ?? ""));
    metricNames.forEach((name, i) => (obj[name] = Number(row.metricValues[i]?.value ?? 0)));
    return obj;
  });
}

async function runReport(client, propertyId, { startDate, endDate, dimensions = [], metrics, limit = 25, orderBys }) {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit,
    ...(orderBys ? { orderBys } : {}),
  });
  return rowsToObjects(response, dimensions, metrics);
}

const FUNNEL_EVENTS = [
  "cta_start_configurator",
  "shop_product_click",
  "product_view",
  "configurator_step_view",
  "sculpture_generation_started",
  "sculpture_generation_succeeded",
  "sculpture_generation_failed",
  "checkout_view",
  "buy_button_click",
  "order_completed",
];

/**
 * Fragt GA4 live fuer den angegebenen Zeitraum ab. Gibt null zurueck (statt
 * zu werfen), wenn keine Zugangsdaten/Property-ID konfiguriert sind - so
 * kann der Report ohne GA4-Abschnitt weiterlaufen, wenn GA4 (noch) nicht
 * eingerichtet ist, statt hart zu scheitern.
 */
export async function fetchGa4Data(startDate, endDate) {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return null;

  const client = await buildClient();
  if (!client) return null;

  const [overall, byPage, bySource, byEvent] = await Promise.all([
    runReport(client, propertyId, {
      startDate,
      endDate,
      metrics: ["sessions", "activeUsers", "engagementRate", "screenPageViews", "averageSessionDuration"],
    }),
    runReport(client, propertyId, {
      startDate,
      endDate,
      dimensions: ["pagePath"],
      metrics: ["sessions"],
      limit: 15,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    }),
    runReport(client, propertyId, {
      startDate,
      endDate,
      dimensions: ["sessionSource", "sessionMedium"],
      metrics: ["sessions"],
      limit: 10,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    }),
    runReport(client, propertyId, {
      startDate,
      endDate,
      dimensions: ["eventName"],
      metrics: ["eventCount"],
      limit: 50,
    }),
  ]);

  const byEventFiltered = byEvent.filter((row) => FUNNEL_EVENTS.includes(row.eventName));

  return {
    overall: overall[0] ?? null,
    byPage,
    bySource,
    byEvent: byEventFiltered,
  };
}
