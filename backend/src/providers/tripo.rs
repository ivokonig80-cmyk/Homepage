// Tripo3D-Implementierung des ImageTo3dProvider-Traits (siehe mod.rs).
// Aktueller Standard-Anbieter (AI_PROVIDER=tripo), weil der kostenlose
// Basic-Tier sofortigen API-Zugang ohne Zahlung bietet.
//
// Schema empirisch verifiziert (14.08.2026) anhand des offiziellen Python-
// SDKs "tripo3d" (PyPI, Quelle: github.com/VAST-AI-Research/tripo-python-sdk)
// und live gegen die echte API getestet:
// - Base-URL: https://api.tripo3d.ai/v2/openapi
// - Bilder werden NICHT als base64-data-URI übergeben (das ergab den zuerst
//   live beobachteten Fehler `400 "The request body is malformed"`),
//   sondern müssen zuerst separat hochgeladen werden:
//   POST /upload (multipart/form-data, Feldname "file") ->
//   {"code":0,"data":{"image_token":"<token>"}}
// - Task-Erstellung: POST /task mit
//   {"type":"image_to_model","file":{"type":"jpg|png|webp","file_token":"<token>"},
//    "face_limit":2000,"smart_low_poly":true,"texture":false,"pbr":false}
//   -> {"code":0,"data":{"task_id":"<id>"}}
//   WICHTIG (live beobachtet 24.08.2026): ohne "smart_low_poly":true liefert
//   Tripo trotz gesetztem face_limit ein dicht rekonstruiertes Mesh (~100.000
//   Dreiecke statt der gewuenschten grossflaechigen Facetten) - face_limit
//   allein dezimiert offenbar nicht sichtbar. Laut Tripo-Doku
//   (docs.tripo3d.ai) braucht "hand-crafted"-Low-Poly-Topologie explizit
//   smart_low_poly=true; der sinnvolle face_limit-Bereich dafuer ist dann
//   1000-20000 (kostet +10 Credits pro Task).
// - Task-Status: GET /task/{id} -> {"code":0,"data":{"status":"...",
//   "progress":0-100,"output":{"model":...,"base_model":...,"pbr_model":...,
//   "rendered_image":...}}}. Status-Werte: QUEUED, RUNNING, SUCCESS, FAILED,
//   CANCELLED, UNKNOWN, BANNED, EXPIRED.
// Trotzdem bleibt das Auslesen der Modell-URL defensiv (mehrere Feldnamen
// probiert) als zusätzliches Sicherheitsnetz, falls Tripo das Schema
// zwischen API-Versionen leicht variiert.

use super::{ImageTo3dProvider, NormalizedStatus, ProviderError, TaskStatus};
use async_trait::async_trait;
use serde::Serialize;
use serde_json::Value;

const TRIPO_BASE_URL: &str = "https://api.tripo3d.ai/v2/openapi";

/// Tripos Äquivalent zu Meshys `target_polycount` heißt `face_limit`
/// (-1 = adaptiv/kein festes Limit). Wir setzen bewusst eine feste Zahl, um
/// denselben Low-Poly-Look wie beim Meshy-Pfad zu erhalten. Nur zusammen mit
/// `smart_low_poly: true` wirksam (siehe Datei-Kommentar oben) - deren
/// empfohlener Wertebereich ist 1000-20000.
///
/// 1000 (statt z.B. 2000) bewusst als unterster von Tripo noch als
/// zuverlaessig dokumentierter Wert gewaehlt: Die eigene Marken-Optik ist
/// deutlich reduzierter als das bei 2000 erzeugte Ergebnis (~2000 Dreiecke,
/// live getestet) - siehe die vorhandenen Referenzen im Projekt
/// (public/hero-source/Lady-Gaga-Geometric-Low-Poly-Bust0000.jpg als grobe
/// Stil-Referenz, heroSlides.ts mit nur ~40 handgesetzten Facetten pro
/// Hero-Motiv, catalog.ts mit je 5-10 grob zusammengesetzten Grundkoerpern
/// pro Katalog-Figur). Tripo warnt in der eigenen Doku aber explizit vor
/// Fehlschlaegen bei komplexeren Motiven, wenn smart_low_poly mit Werten
/// UNTER 1000 kombiniert wird - 1000 ist daher die Untergrenze, die noch
/// zuverlaessig funktionieren soll, auch wenn sie ueber dem eigentlichen
/// Stil-Ziel liegt.
const FACE_LIMIT: i32 = 1000;

pub struct TripoProvider {
    client: reqwest::Client,
    api_key: String,
}

impl TripoProvider {
    pub fn new(client: reqwest::Client, api_key: String) -> Self {
        Self { client, api_key }
    }
}

#[derive(Serialize)]
struct FilePayload {
    #[serde(rename = "type")]
    file_type: String,
    file_token: String,
}

#[derive(Serialize)]
struct CreateTaskRequest {
    #[serde(rename = "type")]
    task_type: &'static str,
    file: FilePayload,
    face_limit: i32,
    smart_low_poly: bool,
    texture: bool,
    pbr: bool,
}

/// Content-Type aus dem Upload ("image/jpeg" etc.) -> Kurzform, wie Tripo
/// sie für `file.type` erwartet (laut verfügbarer, teils widersprüchlicher
/// Doku - TODO nach Live-Test prüfen/anpassen).
fn short_image_type(content_type: &str) -> &'static str {
    match content_type {
        "image/png" => "png",
        "image/webp" => "webp",
        _ => "jpg",
    }
}

fn normalize_status(raw: &str) -> NormalizedStatus {
    match raw.to_ascii_lowercase().as_str() {
        "success" | "succeeded" => NormalizedStatus::Succeeded,
        "failed" | "cancelled" | "canceled" | "banned" | "expired" => NormalizedStatus::Failed,
        // "queued" | "running" | alles Unbekannte -> weiter pollen
        _ => NormalizedStatus::Processing,
    }
}

impl TripoProvider {
    /// Schritt 1: Foto separat hochladen (Tripo akzeptiert beim
    /// Task-Erstellen keine base64-data-URI, siehe Kommentar oben) und den
    /// dabei vergebenen `image_token` zurückgeben.
    async fn upload_image(&self, image_bytes: &[u8], content_type: &str) -> Result<String, ProviderError> {
        let filename = format!("photo.{}", short_image_type(content_type));
        let part = reqwest::multipart::Part::bytes(image_bytes.to_vec())
            .file_name(filename)
            .mime_str(content_type)
            .map_err(|e| ProviderError::UnexpectedResponse(e.to_string()))?;
        let form = reqwest::multipart::Form::new().part("file", part);

        let resp = self
            .client
            .post(format!("{TRIPO_BASE_URL}/upload"))
            .bearer_auth(&self.api_key)
            .multipart(form)
            .send()
            .await?;

        let status_code = resp.status();
        let raw: Value = resp
            .json()
            .await
            .map_err(|e| ProviderError::UnexpectedResponse(e.to_string()))?;
        tracing::debug!(response = %raw, "Tripo upload_image Rohantwort");

        if !status_code.is_success() {
            return Err(ProviderError::Api {
                status: status_code.as_u16(),
                body: raw.to_string(),
            });
        }

        raw.get("data")
            .and_then(|d| d.get("image_token"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| {
                ProviderError::UnexpectedResponse(format!(
                    "Konnte image_token nicht aus Tripo-Upload-Antwort lesen: {raw}"
                ))
            })
    }
}

#[async_trait]
impl ImageTo3dProvider for TripoProvider {
    async fn create_task(&self, image_bytes: &[u8], content_type: &str) -> Result<String, ProviderError> {
        let image_token = self.upload_image(image_bytes, content_type).await?;

        let body = CreateTaskRequest {
            task_type: "image_to_model",
            file: FilePayload {
                file_type: short_image_type(content_type).to_string(),
                file_token: image_token,
            },
            face_limit: FACE_LIMIT,
            smart_low_poly: true,
            texture: false,
            pbr: false,
        };

        let resp = self
            .client
            .post(format!("{TRIPO_BASE_URL}/task"))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;

        let status_code = resp.status();
        let raw: Value = resp
            .json()
            .await
            .map_err(|e| ProviderError::UnexpectedResponse(e.to_string()))?;
        tracing::debug!(response = %raw, "Tripo create_task Rohantwort");

        if !status_code.is_success() {
            return Err(ProviderError::Api {
                status: status_code.as_u16(),
                body: raw.to_string(),
            });
        }

        let task_id = raw
            .get("data")
            .and_then(|d| d.get("task_id"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| {
                ProviderError::UnexpectedResponse(format!(
                    "Konnte task_id nicht aus Tripo-Antwort lesen: {raw}"
                ))
            })?;

        Ok(task_id.to_string())
    }

    async fn get_task(&self, task_id: &str) -> Result<TaskStatus, ProviderError> {
        let resp = self
            .client
            .get(format!("{TRIPO_BASE_URL}/task/{task_id}"))
            .bearer_auth(&self.api_key)
            .send()
            .await?;

        let status_code = resp.status();
        let raw: Value = resp
            .json()
            .await
            .map_err(|e| ProviderError::UnexpectedResponse(e.to_string()))?;
        tracing::debug!(response = %raw, "Tripo get_task Rohantwort");

        if !status_code.is_success() {
            return Err(ProviderError::Api {
                status: status_code.as_u16(),
                body: raw.to_string(),
            });
        }

        let data = raw.get("data").unwrap_or(&raw);

        let raw_status = data.get("status").and_then(|v| v.as_str()).unwrap_or("");
        let status = normalize_status(raw_status);

        let progress = data
            .get("progress")
            .and_then(|v| v.as_u64())
            .map(|p| p as u8);

        // Modell-URL: mehrere bekannte/vermutete Feldnamen aus unterschiedlichen
        // Tripo-Quellen - erster Treffer gewinnt. TODO nach Live-Test: auf den
        // tatsächlich bestätigten Pfad reduzieren.
        let output = data.get("output");
        let model_url = output
            .and_then(|o| o.get("pbr_model"))
            .or_else(|| output.and_then(|o| o.get("model")))
            .or_else(|| output.and_then(|o| o.get("base_model")))
            .or_else(|| data.get("pbr_model_url"))
            .or_else(|| data.get("model_mesh").and_then(|m| m.get("url")))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let thumbnail_url = output
            .and_then(|o| o.get("rendered_image"))
            .or_else(|| data.get("thumbnail_url"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let error = data
            .get("error")
            .or_else(|| data.get("message"))
            .and_then(|v| v.as_str())
            .filter(|_| status == NormalizedStatus::Failed)
            .map(|s| s.to_string());

        Ok(TaskStatus {
            status,
            progress,
            model_url,
            thumbnail_url,
            error,
        })
    }
}
