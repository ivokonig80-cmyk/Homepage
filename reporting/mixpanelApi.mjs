// Wrapper um die Mixpanel Query API. Anders als Clarity (nur 1-3 Tage
// rueckwirkend) und wie GA4 unterstuetzt Mixpanel beliebige historische
// Zeitraeume direkt auf Anfrage - auch hier also kein taegliches
// Snapshot-Archiv noetig, Live-Abfrage bei jeder Report-Anfrage.
//
// Auth: Service Account (empfohlener Weg laut Mixpanel-Doku) per HTTP
// Basic Auth, Zugangsdaten unter Organization Settings -> Service Accounts
// erzeugen (siehe reporting/README.md).
//
// Was Mixpanel hier beitraegt, das Clarity/GA4 nicht abdecken:
// - Retention/Kohorten: kommen Nutzer nach einer Bestellung jemals zurueck?
// - (optional) Funnel-Conversion pro Schritt mit exakter Abbruchrate -
//   braucht einen vorher in der Mixpanel-UI angelegten Funnel-Report
//   (funnel_id), da die Funnels-Query-API keine Ad-hoc-Definition erlaubt.
//
// Fehler werden bewusst NICHT stillschweigend verschluckt (frueherer Bug:
// jeder API-Fehler wurde intern gefangen und als "leer"/"nicht
// konfiguriert" dargestellt - live nicht mehr von einem echten Auth-/
// Parameterfehler zu unterscheiden). Stattdessen wird jeder Fehler
// geloggt UND als eigenes Feld zurueckgegeben, damit der Report die
// tatsaechliche Ursache anzeigen kann.

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

function regionHost() {
  const region = (process.env.MIXPANEL_REGION ?? "").toLowerCase();
  if (region === "eu") return "eu.mixpanel.com";
  if (region === "in") return "in.mixpanel.com";
  return "mixpanel.com";
}

function authHeader() {
  const username = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME;
  const secret = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET;
  const token = Buffer.from(`${username}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

async function mixpanelGet(path, params) {
  const url = new URL(`https://${regionHost()}/api/query${path}`);
  url.searchParams.set("project_id", process.env.MIXPANEL_PROJECT_ID);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, value);
  }

  console.log(`Rufe ${url} ab...`);
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} bei ${path}: ${body}`);
  }
  console.log(`... ${path} beantwortet mit ${res.status}`);
  return res.json();
}

async function fetchSegmentation(fromDate, toDate) {
  const results = {};
  const errors = [];
  for (const event of FUNNEL_EVENTS) {
    try {
      const data = await mixpanelGet("/segmentation", { event, from_date: fromDate, to_date: toDate, type: "general" });
      const series = data?.data?.values?.[event] ?? {};
      const total = Object.values(series).reduce((sum, n) => sum + Number(n || 0), 0);
      if (total > 0) results[event] = total;
    } catch (err) {
      console.warn(`Mixpanel-Segmentation fuer Event "${event}" fehlgeschlagen: ${err.message}`);
      errors.push(err.message);
    }
  }
  // Nur einen Beispiel-Fehler zurueckgeben (nicht 10x dieselbe Ursache) -
  // falls JEDES Event fehlschlaegt, ist das fast immer ein einziges
  // zugrundeliegendes Auth-/Parameterproblem, kein Zufall pro Event.
  return { results, error: results && Object.keys(results).length === 0 && errors.length ? errors[0] : null };
}

async function fetchRetention(fromDate, toDate) {
  try {
    const data = await mixpanelGet("/retention", {
      from_date: fromDate,
      to_date: toDate,
      born_event: "order_completed",
      unit: "day",
    });
    return { data, error: null };
  } catch (err) {
    console.warn(`Mixpanel-Retention fehlgeschlagen: ${err.message}`);
    return { data: null, error: err.message };
  }
}

async function fetchFunnel(fromDate, toDate) {
  const funnelId = process.env.MIXPANEL_FUNNEL_ID;
  if (!funnelId) return { data: null, error: null, configured: false };
  try {
    const data = await mixpanelGet("/funnels", { funnel_id: funnelId, from_date: fromDate, to_date: toDate });
    return { data, error: null, configured: true };
  } catch (err) {
    console.warn(`Mixpanel-Funnel (ID ${funnelId}) fehlgeschlagen: ${err.message}`);
    return { data: null, error: err.message, configured: true };
  }
}

export async function fetchMixpanelData(startDate, endDate) {
  if (!process.env.MIXPANEL_PROJECT_ID || !process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME || !process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET) {
    return null;
  }

  const [segmentation, retention, funnel] = await Promise.all([
    fetchSegmentation(startDate, endDate),
    fetchRetention(startDate, endDate),
    fetchFunnel(startDate, endDate),
  ]);

  return { segmentation, retention, funnel };
}
