// Anbindung an die Meshy Image-to-3D API (https://docs.meshy.ai).
//
// Wichtige bewusste Entscheidungen für den Low-Poly-Stil (siehe Konzept
// Abschnitt 4.2):
// - `should_texture: false` - wir wollen keine von der KI erzeugte
//   fotorealistische Textur, sondern legen die Metall-Farbe später selbst
//   im Frontend auf das Mesh (Material-Farbe tauschen statt neu rendern).
// - `should_remesh: true` + `target_polycount` - Meshy übernimmt das
//   Reduzieren der Polygonzahl direkt beim Erzeugen, das ergibt zuverlässig
//   den Low-Poly-Look, unabhängig davon, wie glatt/detailliert das
//   KI-Rohmesh sonst wäre. `target_polycount` ist bewusst ein Konstante,
//   die wir mit echten Testfotos noch feinjustieren müssen, sobald ein
//   bezahlter Account für echte Ergebnisse zur Verfügung steht (der
//   kostenlose Plan reicht zum Testen der Anbindung selbst).
// - `topology: "triangle"` - Dreiecksnetz ist die klassische Low-Poly-Optik.

use serde::{Deserialize, Serialize};

const MESHY_BASE_URL: &str = "https://api.meshy.ai";

/// Facettenanzahl des Zielmeshs. Meshy erlaubt 100-300.000 im Remesh-Modus;
/// dieser Wert ist ein erster, vernünftiger Startpunkt für einen sichtbar
/// facettierten, aber noch klar als Tier erkennbaren Look - siehe
/// Kommentar oben, muss visuell nachjustiert werden.
const TARGET_POLYCOUNT: u32 = 1200;

#[derive(Debug, thiserror::Error)]
pub enum MeshyError {
    #[error("Anfrage an Meshy fehlgeschlagen: {0}")]
    Request(#[from] reqwest::Error),
    #[error("Meshy antwortete mit Status {status}: {body}")]
    Api { status: u16, body: String },
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

/// Stößt eine Image-to-3D-Generierung an und gibt die Meshy-Task-ID zurück.
/// `image_data_uri` ist ein vollständiger Data-URI-String
/// (`data:image/jpeg;base64,...`) - Meshy akzeptiert das direkt als
/// `image_url`, wir müssen das Foto also nicht separat hosten.
pub async fn create_image_to_3d_task(
    client: &reqwest::Client,
    api_key: &str,
    image_data_uri: String,
) -> Result<String, MeshyError> {
    let body = CreateTaskRequest {
        image_url: image_data_uri,
        should_texture: false,
        should_remesh: true,
        topology: "triangle",
        target_polycount: TARGET_POLYCOUNT,
        target_formats: vec!["glb"],
    };

    let resp = client
        .post(format!("{MESHY_BASE_URL}/openapi/v1/image-to-3d"))
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let body = resp.text().await.unwrap_or_default();
        return Err(MeshyError::Api { status, body });
    }

    let parsed: CreateTaskResponse = resp.json().await?;
    Ok(parsed.result)
}

#[derive(Debug, Deserialize)]
pub struct ModelUrls {
    pub glb: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TaskErrorDetail {
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MeshyTask {
    pub status: String,
    pub progress: Option<u8>,
    pub model_urls: Option<ModelUrls>,
    pub thumbnail_url: Option<String>,
    pub task_error: Option<TaskErrorDetail>,
}

/// Fragt den aktuellen Stand einer Task ab (Polling, siehe
/// `GET /api/sculptures/:id` in main.rs).
pub async fn get_task(
    client: &reqwest::Client,
    api_key: &str,
    task_id: &str,
) -> Result<MeshyTask, MeshyError> {
    let resp = client
        .get(format!("{MESHY_BASE_URL}/openapi/v1/image-to-3d/{task_id}"))
        .bearer_auth(api_key)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let body = resp.text().await.unwrap_or_default();
        return Err(MeshyError::Api { status, body });
    }

    Ok(resp.json().await?)
}
