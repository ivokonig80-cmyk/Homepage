// Wrapper um Mixpanel's Raw-Data-Export-API. Bewusst NICHT die Query-API
// (Segmentation/Retention/Funnels) - die ist laut Mixpanel-Doku auf
// bezahlte Growth-/Enterprise-Plaene beschraenkt und lieferte auf dem
// kostenlosen Plan live durchgaengig leere Ergebnisse ohne Fehlermeldung.
// Die Raw-Export-API ist dagegen auf jedem Plan (auch Free) verfuegbar -
// Event-Zaehlungen, Retention und Funnel-Conversion werden deshalb hier
// selbst aus den rohen Einzel-Events berechnet, statt Mixpanel's fertige
// Auswertung abzufragen. Nebeneffekt: kein vorher in der Mixpanel-UI
// angelegter Funnel-Report mehr noetig (MIXPANEL_FUNNEL_ID wird nicht mehr
// verwendet, das Secret kann bestehen bleiben, wird aber ignoriert).
//
// Bekannte Einschraenkung: Mixpanel fuehrt anonyme und identifizierte
// Sitzungen serverseitig zusammen (ID-Merging nach identify(), siehe
// src/lib/analytics.ts - der Nickname wird erst bei Bestellabschluss
// gesetzt). Diese eigene Auswertung repliziert dieses Merging NICHT,
// arbeitet also direkt mit der distinct_id aus den Rohdaten - kann die
// Funnel-Conversion bis zu "order_completed" dadurch leicht unterschaetzen
// (fruehe Schritte laufen anonym, erst danach unter dem Nickname).

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

// Sequenz fuer die Funnel-Berechnung - bewusst eine Teilmenge der
// Kern-Kaufstrecke (nicht alle FUNNEL_EVENTS, sonst waeren z.B. die drei
// sculpture_generation_*-Events als parallele statt sequenzielle Schritte
// falsch eingeordnet).
const FUNNEL_SEQUENCE = ["cta_start_configurator", "configurator_step_view", "buy_button_click", "order_completed"];

function regionHost() {
  const region = (process.env.MIXPANEL_REGION ?? "").toLowerCase();
  if (region === "eu") return "data-eu.mixpanel.com";
  if (region === "in") return "data-in.mixpanel.com";
  return "data.mixpanel.com";
}

function authHeader() {
  const username = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME;
  const secret = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET;
  const token = Buffer.from(`${username}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Laedt alle Rohdaten-Events unserer bekannten Funnel-Events im Zeitraum in
 * einem einzigen Aufruf (JSONL - eine Zeile pro Event). Deutlich sparsamer
 * als die alte Segmentation-Loesung mit einer Anfrage pro Event.
 */
async function fetchRawEvents(fromDate, toDate) {
  const url = new URL(`https://${regionHost()}/api/2.0/export`);
  url.searchParams.set("project_id", process.env.MIXPANEL_PROJECT_ID);
  url.searchParams.set("from_date", fromDate);
  url.searchParams.set("to_date", toDate);
  url.searchParams.set("event", JSON.stringify(FUNNEL_EVENTS));
  url.searchParams.set("limit", "100000");

  console.log(`Rufe ${url} ab...`);
  const res = await fetch(url, { headers: { Authorization: authHeader(), Accept: "text/plain" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} beim Raw-Export: ${body}`);
  }

  const text = await res.text();
  console.log(`... Raw-Export beantwortet mit ${res.status}, ${text.trim() ? text.trim().split("\n").length : 0} Zeilen`);

  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .map((row) => ({
      event: row.event,
      distinctId: row.properties?.distinct_id ?? row.properties?.$device_id ?? "unbekannt",
      time: row.properties?.time ? Number(row.properties.time) * 1000 : null,
    }))
    .filter((e) => e.time != null);
}

function computeEventCounts(events) {
  const counts = {};
  for (const e of events) {
    counts[e.event] = (counts[e.event] ?? 0) + 1;
  }
  return counts;
}

/**
 * Kohorte = Tag des ersten "order_completed" pro distinct_id. Fuer jeden
 * folgenden Tag wird gezaehlt, wie viele dieser Nutzer an dem Tag
 * IRGENDEIN Event ausgeloest haben (einfache Aktivitaets-Retention, wie
 * Mixpanel's eigener "birth"-Retention-Typ per Default arbeitet).
 */
function computeRetention(events, bornEvent = "order_completed") {
  const dayMs = 24 * 60 * 60 * 1000;
  const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

  const firstBornByUser = new Map();
  for (const e of events) {
    if (e.event !== bornEvent) continue;
    const existing = firstBornByUser.get(e.distinctId);
    if (!existing || e.time < existing) firstBornByUser.set(e.distinctId, e.time);
  }
  if (!firstBornByUser.size) return {};

  const activityDaysByUser = new Map();
  for (const e of events) {
    const set = activityDaysByUser.get(e.distinctId) ?? new Set();
    set.add(isoDay(e.time));
    activityDaysByUser.set(e.distinctId, set);
  }

  const cohorts = {};
  for (const [user, bornTime] of firstBornByUser) {
    const cohortDay = isoDay(bornTime);
    const bornDayStart = new Date(cohortDay + "T00:00:00Z").getTime();
    const cohort = cohorts[cohortDay] ?? { first: 0, counts: [] };
    cohort.first += 1;
    const activityDays = activityDaysByUser.get(user) ?? new Set();
    for (let offset = 0; offset < 14; offset++) {
      const dayLabel = isoDay(bornDayStart + offset * dayMs);
      cohort.counts[offset] = (cohort.counts[offset] ?? 0) + (activityDays.has(dayLabel) ? 1 : 0);
    }
    cohorts[cohortDay] = cohort;
  }
  return cohorts;
}

/**
 * Einfache sequenzielle Funnel-Zaehlung: ein distinct_id "erreicht" Schritt
 * i, wenn ein Event fuer Schritt i mit Zeitstempel >= dem gewaehlten
 * Zeitstempel fuer Schritt i-1 existiert (erstes passendes Event je
 * Schritt, chronologisch vorwaerts).
 */
function computeFunnel(events, sequence) {
  const byUser = new Map();
  for (const e of events) {
    const list = byUser.get(e.distinctId) ?? [];
    list.push(e);
    byUser.set(e.distinctId, list);
  }
  for (const list of byUser.values()) list.sort((a, b) => a.time - b.time);

  const stepCounts = sequence.map(() => 0);
  for (const list of byUser.values()) {
    let cursor = -Infinity;
    for (let i = 0; i < sequence.length; i++) {
      const hit = list.find((e) => e.event === sequence[i] && e.time >= cursor);
      if (!hit) break;
      stepCounts[i] += 1;
      cursor = hit.time;
    }
  }
  return sequence.map((event, i) => ({ path: event, value: stepCounts[i] }));
}

export async function fetchMixpanelData(startDate, endDate) {
  if (!process.env.MIXPANEL_PROJECT_ID || !process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME || !process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET) {
    return null;
  }

  console.log(`Mixpanel-Rohdaten-Export fuer Zeitraum ${startDate} bis ${endDate} (Region: ${regionHost()}, Projekt: ${process.env.MIXPANEL_PROJECT_ID})`);

  const events = await fetchRawEvents(startDate, endDate);

  return {
    eventCounts: computeEventCounts(events),
    retention: computeRetention(events),
    funnel: computeFunnel(events, FUNNEL_SEQUENCE),
    totalEvents: events.length,
  };
}
