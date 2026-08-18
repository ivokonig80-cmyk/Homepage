# Analytics-Reporting

Baut aus Microsoft-Clarity-, Google-Analytics(GA4)- und Mixpanel-Daten plus
manuell abgelegten Heatmap-Screenshots einen einzigen, selbstständigen
HTML-Report zum Teilen mit Stakeholdern **ohne Zugang zu einem der drei
Tools** — per Mail als Anhang verschickbar, kein Login nötig. Alle drei
Quellen bleiben im Report klar getrennt und mit eigener Quellenangabe
ausgewiesen, nicht vermischt.

**Warum drei Tools statt eins?** Sie decken bewusst unterschiedliche,
sich ergänzende Perspektiven ab statt sich zu überschneiden:
- **Microsoft Clarity** — UX/Verhalten: Heatmaps, Session-Recordings, Rage-/Dead-Clicks
- **Google Analytics (GA4)** — Traffic/Marketing: Trafficquellen, Kanäle, Seitenaufrufe
- **Mixpanel** — Produkt-Analytics: Funnel-Conversion pro Schritt mit exakter
  Abbruchrate, Retention/Kohorten (kommen Nutzer nach einer Bestellung
  zurück?) — beides deckt GA4 laut aktuellem Stand nur eingeschränkt ab
  (Kohorten-Auswertung dort gedeckelt auf 15 Zeilen/60 Zellen, Sampling bei
  größeren Datenmengen, Kohorten nach Gerät statt echter Identität).

## Warum zwei Schritte (Snapshot + Report)?

Clarity liefert über die Data-Export-API **immer nur die letzten 1–3 Tage**
(`numOfDays=1|2|3`, hartes Limit — siehe
[offizielle Doku](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api)).
Es gibt keine Möglichkeit, sich nachträglich ein beliebiges historisches
Zeitfenster zu ziehen. Deshalb läuft täglich ein **Snapshot**, der die Daten
lokal ins Repo archiviert (`reporting/data/`) — der **Report-Generator**
baut daraus dann den gewünschten Zeitraum zusammen. Ohne laufende
Snapshot-Erfassung lässt sich ein Zeitraum im Nachhinein nicht mehr
rekonstruieren.

Heatmap-**Bilder** selbst kann Clarity über keine API exportieren, nur
Zahlen — die Screenshots müssen weiterhin manuell aus dem Dashboard
geschossen werden (siehe unten).

**Google Analytics (GA4) und Mixpanel ticken anders:** beide APIs erlauben
beliebige historische Zeiträume direkt auf Anfrage — kein 1-3-Tage-Limit
wie bei Clarity. Beide brauchen deshalb **kein** Snapshot-Archiv, sondern
werden bei jeder Report-Anfrage live abgefragt (`reporting/ga4Api.mjs`,
`reporting/mixpanelApi.mjs`).

## Einmalige Einrichtung

1. In Clarity: **Settings → Data Export → Generate new API token** (nur
   Projekt-Admins können das). Token sicher speichern.
2. Als GitHub-Actions-Secret hinterlegen: Repo → **Settings → Secrets and
   variables → Actions → New repository secret** → Name `CLARITY_API_TOKEN`,
   Wert = der Token. Der tägliche Snapshot
   (`.github/workflows/clarity-daily-snapshot.yml`) läuft danach automatisch.
3. Für lokale/manuelle Läufe: `reporting/.env.example` nach
   `reporting/.env` kopieren und den Token eintragen.
4. **Für GA4:** Google-Cloud-Projekt anlegen (falls dein Google-Konto Teil
   einer Organisation ist, die Dienstkontoschlüssel blockiert
   `iam.disableServiceAccountKeyCreation` — Google-Workspace-Standard —,
   ein Projekt unter einem **privaten** Google-Konto ohne Organisation
   anlegen), darin die **"Google Analytics Data API"** aktivieren, ein
   Dienstkonto ohne besondere Cloud-Rolle anlegen, JSON-Schlüssel
   herunterladen. Die Dienstkonto-E-Mail in GA4 unter **Verwaltung →
   Property-Zugriffsverwaltung** als **Betrachter** hinzufügen. Die
   GA4-Property-ID (Verwaltung → Property-Details, eine Zahl — nicht die
   Measurement-ID `G-XXXXXXXXXX`) sowie den JSON-Schlüssel als
   GitHub-Actions-Secrets hinterlegen (`GA4_PROPERTY_ID`,
   `GA4_SERVICE_ACCOUNT_JSON` = kompletter Dateiinhalt). Für lokale Läufe:
   Property-ID in `reporting/.env`, JSON-Datei unter
   `reporting/secrets/ga4-service-account.json` (gitignored, nie
   committen).
5. **Für Mixpanel:** Account auf mixpanel.com anlegen, Projekt erstellen
   (Region beachten — US/EU/Indien, bei Projekterstellung wählbar).
   Projekt-Token unter **Project Settings → Access Keys** kopieren (das ist
   der öffentliche, client-seitige Token für `NEXT_PUBLIC_MIXPANEL_TOKEN`,
   siehe `.env.example` im Repo-Root). Für die Report-API zusätzlich unter
   **Organization Settings → Service Accounts → Create** ein Dienstkonto
   anlegen — Username + Secret werden angezeigt (Secret nur einmal
   sichtbar, sofort sichern). Projekt-ID unter **Project Settings**
   notieren. Als GitHub-Actions-Secrets hinterlegen:
   `MIXPANEL_PROJECT_ID`, `MIXPANEL_SERVICE_ACCOUNT_USERNAME`,
   `MIXPANEL_SERVICE_ACCOUNT_SECRET` (optional `MIXPANEL_REGION` bei
   EU/Indien-Projekten). Für lokale Läufe: alles in `reporting/.env`.

   **Optional — Funnel-Conversion:** die Mixpanel-Funnels-API braucht einen
   vorher in der Mixpanel-UI angelegten Funnel-Report (kein Ad-hoc-Query
   möglich). In Mixpanel unter **Funnels → New Report** die Schritte
   festlegen (z. B. `cta_start_configurator` → `configurator_step_view` →
   `buy_button_click` → `order_completed`), speichern, die ID steht in der
   URL als `report-<ID>` — als Secret `MIXPANEL_FUNNEL_ID` hinterlegen. Ohne
   diese Variable wird der Funnel-Abschnitt im Report einfach
   übersprungen, der Rest läuft trotzdem.

## Täglicher Snapshot

Läuft automatisch per GitHub Action (05:00 UTC) und committet das Ergebnis
nach `reporting/data/<YYYY-MM-DD>.json`. Manuell auslösen: im GitHub-Repo
unter **Actions → Clarity Daily Snapshot → Run workflow**, oder lokal:

```
npm run report:snapshot
```

## Screenshots hinzufügen

Ablage-Konvention:

```
reporting/screenshots/<YYYY-MM-DD>/<beschreibender-name>.png
```

Der Dateiname wird automatisch zur Bildunterschrift im Report — z. B. wird
aus `heatmap-konfigurator-farbe.png` die Caption "Heatmap Konfigurator
Farbe". Unterstützt: `.png`, `.jpg`/`.jpeg`, `.webp`.

## Report erzeugen

```
npm run report:generate -- --last 7                        # letzte 7 Tage
npm run report:generate -- --from 2026-08-10 --to 2026-08-17
npm run report:generate                                    # alle vorhandenen Snapshots
```

Ergebnis liegt als einzelne HTML-Datei in `reporting/out/` (nicht
versioniert, jederzeit neu erzeugbar) — per Mail verschickbar. Auf Wunsch
kann daraus auch ein Google-Doc/PDF oder ein teilbarer Artifact-Link
gemacht werden.

## Mixpanel-Ratenlimit

Mixpanel erlaubt 60 Query-API-Aufrufe pro Stunde. Ein Report-Lauf braucht
davon ca. 12 (ein Aufruf je Funnel-Event für die Event-Zählungen, plus
Retention, plus Funnel) — für den täglichen automatischen Lauf unkritisch,
bei sehr häufigen manuellen Report-Anfragen (deutlich mehr als 5×/Stunde)
im Chat theoretisch relevant.

## Bekannte Einschränkung

Die genauen Feldnamen je Metrik (`ScrollDepth`, `RageClickCount`, …) sind in
Clarity's Doku nicht vollständig spezifiziert ("additional fields may be
included"). Der Report-Generator stellt deshalb alle vorhandenen Felder
generisch als Tabelle dar, statt einzelne Feldnamen hart anzunehmen — nach
dem ersten echten Lauf mit einem echten Token kann die Darstellung anhand
der tatsächlichen Response weiter verschönert werden.
