// Provider-Abstraktion für die Foto-zu-3D-Generierung. Der Nutzer sieht nur
// "deine Skulptur wird generiert" - welcher Anbieter (Meshy, Tripo3D, ...)
// dahintersteckt, ist reine Backend-Entscheidung über die Env-Var
// AI_PROVIDER (main.rs) und für das Frontend nicht sichtbar/relevant.
//
// Grund für Tripo3D als aktueller Standard-Anbieter: Meshys kostenloser
// Plan hat KEINEN API-Zugang (nur die Web-App) - man müsste sofort zahlen,
// nur um die Anbindung zu testen. Tripo3D bietet einen kostenlosen Basic-
// Tier mit sofortigem API-Key, ganz ohne Zahlung - genau richtig, um die
// komplette Strecke fertig zu entwickeln, bevor überhaupt Geld fließt.
// Meshy bleibt als zweite Implementierung erhalten und ist über die Env-Var
// jederzeit reaktivierbar (z.B. falls sich die Zahlungsfrage später klärt
// oder Tripo-Ergebnisse qualitativ nicht überzeugen).

use async_trait::async_trait;

#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    #[error("Anfrage fehlgeschlagen: {0}")]
    Request(#[from] reqwest::Error),
    #[error("API antwortete mit Status {status}: {body}")]
    Api { status: u16, body: String },
    #[error("Antwort konnte nicht gelesen werden: {0}")]
    UnexpectedResponse(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NormalizedStatus {
    Processing,
    Succeeded,
    Failed,
}

impl NormalizedStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            NormalizedStatus::Processing => "processing",
            NormalizedStatus::Succeeded => "succeeded",
            NormalizedStatus::Failed => "failed",
        }
    }
}

#[derive(Debug)]
pub struct TaskStatus {
    pub status: NormalizedStatus,
    pub progress: Option<u8>,
    pub model_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub error: Option<String>,
}

/// Gemeinsame Schnittstelle, die jeder Foto-zu-3D-Anbieter erfüllt.
/// `image_bytes`/`content_type` kommen 1:1 aus dem Multipart-Upload in
/// main.rs (bereits serverseitig auf Typ/Größe geprüft).
#[async_trait]
pub trait ImageTo3dProvider: Send + Sync {
    async fn create_task(&self, image_bytes: &[u8], content_type: &str) -> Result<String, ProviderError>;
    async fn get_task(&self, task_id: &str) -> Result<TaskStatus, ProviderError>;
}

pub mod meshy;
pub mod tripo;

/// Baut den konfigurierten Provider anhand der `AI_PROVIDER`-Env-Var
/// ("tripo" | "meshy", Default "tripo" - siehe Kommentar oben).
pub fn build_provider(client: reqwest::Client) -> Box<dyn ImageTo3dProvider> {
    let provider_name = std::env::var("AI_PROVIDER").unwrap_or_else(|_| "tripo".to_string());
    match provider_name.as_str() {
        "meshy" => {
            let api_key = std::env::var("MESHY_API_KEY")
                .expect("MESHY_API_KEY muss gesetzt sein, wenn AI_PROVIDER=meshy");
            Box::new(meshy::MeshyProvider::new(client, api_key))
        }
        "tripo" => {
            let api_key = std::env::var("TRIPO_API_KEY")
                .expect("TRIPO_API_KEY muss gesetzt sein, wenn AI_PROVIDER=tripo (Default)");
            Box::new(tripo::TripoProvider::new(client, api_key))
        }
        other => panic!("Unbekannter AI_PROVIDER '{other}' - erlaubt: 'tripo' (Default) oder 'meshy'"),
    }
}
