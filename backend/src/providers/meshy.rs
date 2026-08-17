// Meshy-Implementierung des ImageTo3dProvider-Traits (siehe mod.rs).
//
// Fachliche Entscheidungen unverändert aus der ursprünglichen, flachen
// Version übernommen (jetzt hinter der gemeinsamen Schnittstelle):
// - `should_texture: false` - keine KI-Textur, die Metall-Farbe setzt
//   später das Frontend selbst auf das Mesh.
// - `should_remesh: true` + `target_polycount` - erzeugt zuverlässig den
//   Low-Poly-Look direkt bei der Generierung.
// - `topology: "triangle"` - Dreiecksnetz für die klassische Low-Poly-Optik.
//
// WICHTIG: Meshys kostenloser Plan hat keinen API-Zugang (nur Web-App) -
// diese Implementierung erfordert einen bezahlten Meshy-Account. Aktiv wird
// sie nur, wenn AI_PROVIDER=meshy gesetzt ist (Default ist "tripo", siehe
// mod.rs).

use super::{ImageTo3dProvider, NormalizedStatus, ProviderError, TaskStatus};
use async_trait::async_trait;
use base64::Engine;
use serde::{Deserialize, Serialize};

const MESHY_BASE_URL: &str = "https://api.meshy.ai";
const TARGET_POLYCOUNT: u32 = 1200;

pub struct MeshyProvider {
    client: reqwest::Client,
    api_key: String,
}

impl MeshyProvider {
    pub fn new(client: reqwest::Client, api_key: String) -> Self {
        Self { client, api_key }
    }
}

#[derive(Serialize)]
struct CreateTaskRequest {
    image_url: String,
    should_texture: bool,
    should_remesh: bool,
    topology: &'static str,
    target_polycount: u32,
    target_formats: Vec<&'static str>,
}

#[derive(Deserialize)]
struct CreateTaskResponse {
    result: String,
}

#[derive(Debug, Deserialize)]
struct ModelUrls {
    glb: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TaskErrorDetail {
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MeshyTask {
    status: String,
    progress: Option<u8>,
    model_urls: Option<ModelUrls>,
    thumbnail_url: Option<String>,
    task_error: Option<TaskErrorDetail>,
}

fn normalize_status(raw: &str) -> NormalizedStatus {
    match raw.to_ascii_uppercase().as_str() {
        "SUCCEEDED" => NormalizedStatus::Succeeded,
        "FAILED" | "CANCELED" | "CANCELLED" => NormalizedStatus::Failed,
        _ => NormalizedStatus::Processing,
    }
}

#[async_trait]
impl ImageTo3dProvider for MeshyProvider {
    async fn create_task(&self, image_bytes: &[u8], content_type: &str) -> Result<String, ProviderError> {
        let base64_data = base64::engine::general_purpose::STANDARD.encode(image_bytes);
        let data_uri = format!("data:{content_type};base64,{base64_data}");

        let body = CreateTaskRequest {
            image_url: data_uri,
            should_texture: false,
            should_remesh: true,
            topology: "triangle",
            target_polycount: TARGET_POLYCOUNT,
            target_formats: vec!["glb"],
        };

        let resp = self
            .client
            .post(format!("{MESHY_BASE_URL}/openapi/v1/image-to-3d"))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(ProviderError::Api { status, body });
        }

        let parsed: CreateTaskResponse = resp.json().await?;
        Ok(parsed.result)
    }

    async fn get_task(&self, task_id: &str) -> Result<TaskStatus, ProviderError> {
        let resp = self
            .client
            .get(format!("{MESHY_BASE_URL}/openapi/v1/image-to-3d/{task_id}"))
            .bearer_auth(&self.api_key)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(ProviderError::Api { status, body });
        }

        let task: MeshyTask = resp.json().await?;
        Ok(TaskStatus {
            status: normalize_status(&task.status),
            progress: task.progress,
            model_url: task.model_urls.and_then(|m| m.glb),
            thumbnail_url: task.thumbnail_url,
            error: task.task_error.and_then(|e| e.message),
        })
    }
}
