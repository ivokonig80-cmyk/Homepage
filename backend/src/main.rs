// Backend-Skelett für "Deine Skulptur" - komplett eigenständiges Projekt,
// bewusst getrennt von HAWK/mcp-server (siehe Konzept), bis beide Projekte
// offiziell zusammengeführt werden. Übernimmt für diesen Schritt:
// Foto-Upload-Endpunkt + Foto-zu-3D-Anbindung (Job anstoßen + pollen) über
// eine austauschbare Provider-Abstraktion (Tripo3D standardmäßig, Meshy
// optional - siehe providers/mod.rs für die Begründung).
//
// Noch NICHT enthalten (bewusst, siehe Aufgabenliste): Postgres-Anbindung
// (Bestellungen/Warenkorb), Stripe-Checkout, Low-Poly-Nachbearbeitung übers
// reine Remeshing hinaus. Kommt in den nächsten Schritten dazu.

mod providers;

use axum::{
    Json, Router,
    extract::{Multipart, Path, State},
    http::{HeaderMap, Method, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use providers::ImageTo3dProvider;
use serde::Serialize;
use std::sync::Arc;
use tower_http::cors::{AllowOrigin, CorsLayer};

const MAX_UPLOAD_BYTES: usize = 20 * 1024 * 1024; // 20 MB, identisch zum Frontend-Limit
const ALLOWED_CONTENT_TYPES: [&str; 3] = ["image/jpeg", "image/png", "image/webp"];

#[derive(Clone)]
struct AppState {
    provider: Arc<Box<dyn ImageTo3dProvider>>,
    // Optionaler geteilter Zugangscode fuer die Testphase (siehe
    // AccessGate.tsx im Frontend) - schuetzt /api/sculptures vor
    // unkontrolliertem, kostenpflichtigem Zugriff. None = Pruefung
    // deaktiviert (kein ACCESS_TOKEN gesetzt).
    access_token: Option<String>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok(); // .env lokal optional, in Produktion echte Env-Vars

    let frontend_origin =
        std::env::var("FRONTEND_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    let provider = providers::build_provider(reqwest::Client::new());
    let state = AppState {
        provider: Arc::new(provider),
        access_token: std::env::var("ACCESS_TOKEN").ok().filter(|s| !s.is_empty()),
    };

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(frontend_origin.parse().expect("FRONTEND_ORIGIN ist keine gültige URL")))
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/sculptures", post(create_sculpture))
        .route("/api/sculptures/{id}", get(get_sculpture))
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port))
        .await
        .expect("Port konnte nicht gebunden werden");
    tracing::info!("Backend läuft auf http://localhost:{port}");
    axum::serve(listener, app).await.expect("Server abgestürzt");
}

async fn health() -> &'static str {
    "ok"
}

#[derive(Serialize)]
struct CreateSculptureResponse {
    #[serde(rename = "taskId")]
    task_id: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

fn error_response(status: StatusCode, message: impl Into<String>) -> Response {
    (status, Json(ErrorResponse { error: message.into() })).into_response()
}

/// Schritt 1 des Konfigurators: Foto entgegennehmen, serverseitig validieren
/// (Dateityp/Größe - client-seitige Prüfung im Frontend ist nur für sofortiges
/// Feedback, kein Sicherheitsmechanismus, siehe Konzept Abschnitt 6) und als
/// Meshy-Image-to-3D-Task anstoßen.
async fn create_sculpture(State(state): State<AppState>, headers: HeaderMap, mut multipart: Multipart) -> Response {
    if let Some(expected) = &state.access_token {
        let provided = headers.get("x-access-token").and_then(|v| v.to_str().ok());
        if provided != Some(expected.as_str()) {
            return error_response(StatusCode::UNAUTHORIZED, "Ungültiger oder fehlender Zugangscode.");
        }
    }

    let mut photo_bytes: Option<Vec<u8>> = None;
    let mut content_type: Option<String> = None;

    loop {
        let field = match multipart.next_field().await {
            Ok(Some(f)) => f,
            Ok(None) => break,
            Err(e) => return error_response(StatusCode::BAD_REQUEST, format!("Ungültige Anfrage: {e}")),
        };

        if field.name() != Some("photo") {
            continue;
        }

        content_type = field.content_type().map(|s| s.to_string());
        match field.bytes().await {
            Ok(bytes) => photo_bytes = Some(bytes.to_vec()),
            Err(e) => return error_response(StatusCode::BAD_REQUEST, format!("Foto konnte nicht gelesen werden: {e}")),
        }
    }

    let Some(bytes) = photo_bytes else {
        return error_response(StatusCode::BAD_REQUEST, "Kein Feld 'photo' in der Anfrage gefunden.");
    };
    let Some(content_type) = content_type else {
        return error_response(StatusCode::BAD_REQUEST, "Fehlender Content-Type für das Foto.");
    };

    if !ALLOWED_CONTENT_TYPES.contains(&content_type.as_str()) {
        return error_response(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            "Nur JPG-, PNG- oder WebP-Bilder werden akzeptiert.",
        );
    }
    if bytes.len() > MAX_UPLOAD_BYTES {
        return error_response(StatusCode::PAYLOAD_TOO_LARGE, "Das Foto darf höchstens 20 MB groß sein.");
    }

    match state.provider.create_task(&bytes, &content_type).await {
        Ok(task_id) => Json(CreateSculptureResponse { task_id }).into_response(),
        Err(e) => {
            tracing::error!("3D-Task konnte nicht erstellt werden: {e}");
            error_response(StatusCode::BAD_GATEWAY, "Die 3D-Generierung konnte nicht gestartet werden.")
        }
    }
}

#[derive(Serialize)]
struct SculptureStatusResponse {
    status: String,
    progress: Option<u8>,
    #[serde(rename = "modelUrl")]
    model_url: Option<String>,
    #[serde(rename = "thumbnailUrl")]
    thumbnail_url: Option<String>,
    error: Option<String>,
}

/// Wird vom Frontend gepollt (Schritt 2: "KI-Generierung"), bis
/// `status: "succeeded"` mit `modelUrl` zurückkommt. Die Normalisierung auf
/// ein für das Frontend stabiles Status-Set passiert bereits im jeweiligen
/// Provider (providers/meshy.rs, providers/tripo.rs).
async fn get_sculpture(State(state): State<AppState>, Path(id): Path<String>) -> Response {
    match state.provider.get_task(&id).await {
        Ok(task) => Json(SculptureStatusResponse {
            status: task.status.as_str().to_string(),
            progress: task.progress,
            model_url: task.model_url,
            thumbnail_url: task.thumbnail_url,
            error: task.error,
        })
        .into_response(),
        Err(e) => {
            tracing::error!("Task-Status konnte nicht abgerufen werden: {e}");
            error_response(StatusCode::BAD_GATEWAY, "Status konnte nicht abgerufen werden.")
        }
    }
}
