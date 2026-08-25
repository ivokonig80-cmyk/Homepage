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

mod collage;
mod mesh_check;
mod model_download;
mod providers;

use axum::{
    Json, Router,
    extract::{Multipart, Path, State},
    http::{HeaderMap, HeaderName, Method, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use providers::ImageTo3dProvider;
use serde::Serialize;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
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
    // Eigener Client fuer den QA-Download des fertigen Modells (siehe
    // model_download.rs) - getrennt vom providerinternen Client, damit
    // dessen Timeouts/Header unabhaengig bleiben.
    download_client: reqwest::Client,
    // Wohin jedes erfolgreich generierte Modell zur manuellen Pruefung
    // gespiegelt wird (siehe save_for_qa unten). Kein S3/Storage - siehe
    // Konzept: das ist bewusst nur ein lokaler QA-Ordner, kein Ersatz fuer
    // echtes Hosting, und ueberlebt auf Render ohne Persistent Disk keinen
    // Neu-Deploy.
    test_models_dir: PathBuf,
    // Verhindert, dass derselbe Task bei jedem Polling-Request (alle 3s vom
    // Frontend) erneut heruntergeladen wird, sobald er einmal SUCCESS
    // gemeldet hat.
    processed_tasks: Arc<Mutex<HashSet<String>>>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok(); // .env lokal optional, in Produktion echte Env-Vars

    // Kommagetrennte Liste statt einer einzelnen URL: das Frontend ist unter
    // mehreren Origins erreichbar (die Render-eigene onrender.com-URL UND
    // eine eingerichtete Custom-Domain) - eine davon zu vergessen bedeutet,
    // dass CORS dort ausnahmslos jede Anfrage blockiert (live beobachtet:
    // die Custom-Domain war ohne dass wir es wussten im Einsatz und wurde
    // deshalb dauerhaft blockiert, waehrend Tests direkt gegen die
    // onrender.com-URL nie ein Problem zeigten).
    let frontend_origins: Vec<_> = std::env::var("FRONTEND_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".to_string())
        .split(',')
        .map(|s| s.trim().parse().expect("FRONTEND_ORIGIN enthaelt eine ungueltige URL"))
        .collect();
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    let provider = providers::build_provider(reqwest::Client::new());
    // Relativ zum ueblichen Arbeitsverzeichnis beim lokalen Start (`cd
    // backend && cargo run`/das gebaute .exe) - liegt damit im selben
    // test-models/ neben dem Repo-Root, das schon fuer manuelle QA-Downloads
    // benutzt wird. Per Env-Var ueberschreibbar (z.B. fuer Render mit
    // Persistent Disk unter einem anderen Pfad).
    let test_models_dir = std::env::var("TEST_MODELS_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("../test-models"));
    let state = AppState {
        provider: Arc::new(provider),
        access_token: std::env::var("ACCESS_TOKEN").ok().filter(|s| !s.is_empty()),
        download_client: reqwest::Client::new(),
        test_models_dir,
        processed_tasks: Arc::new(Mutex::new(HashSet::new())),
    };

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(frontend_origins))
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE, HeaderName::from_static("x-access-token")]);

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

    // Bis zu 4 "photo"-Felder statt nur einem: optionale Zusatzfotos aus
    // anderen Blickwinkeln (siehe StepUpload.tsx) werden unten zu einer
    // Collage zusammengesetzt - mehr tatsaechliche Information fuer den
    // Provider statt Rateverfahren bei verdeckten Koerperteilen.
    let mut photos: Vec<(Vec<u8>, String)> = Vec::new();

    loop {
        let field = match multipart.next_field().await {
            Ok(Some(f)) => f,
            Ok(None) => break,
            Err(e) => return error_response(StatusCode::BAD_REQUEST, format!("Ungültige Anfrage: {e}")),
        };

        if field.name() != Some("photo") {
            continue;
        }

        let Some(field_content_type) = field.content_type().map(|s| s.to_string()) else {
            return error_response(StatusCode::BAD_REQUEST, "Fehlender Content-Type für ein Foto.");
        };
        let bytes = match field.bytes().await {
            Ok(bytes) => bytes.to_vec(),
            Err(e) => return error_response(StatusCode::BAD_REQUEST, format!("Foto konnte nicht gelesen werden: {e}")),
        };

        if !ALLOWED_CONTENT_TYPES.contains(&field_content_type.as_str()) {
            return error_response(
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "Nur JPG-, PNG- oder WebP-Bilder werden akzeptiert.",
            );
        }
        if bytes.len() > MAX_UPLOAD_BYTES {
            return error_response(StatusCode::PAYLOAD_TOO_LARGE, "Jedes Foto darf höchstens 20 MB groß sein.");
        }

        photos.push((bytes, field_content_type));
    }

    if photos.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "Kein Feld 'photo' in der Anfrage gefunden.");
    }
    if photos.len() > 4 {
        return error_response(StatusCode::BAD_REQUEST, "Höchstens 4 Fotos pro Skulptur.");
    }

    let (bytes, content_type) = if photos.len() == 1 {
        photos.into_iter().next().unwrap()
    } else {
        let raw: Vec<Vec<u8>> = photos.into_iter().map(|(b, _)| b).collect();
        match collage::build_collage(&raw) {
            Ok(png) => (png, "image/png".to_string()),
            Err(e) => return error_response(StatusCode::BAD_REQUEST, format!("Fotos konnten nicht zusammengefügt werden: {e}")),
        }
    };

    match state.provider.create_task(&bytes, &content_type).await {
        Ok(task_id) => {
            // Bewusst VOR dem Zurueckschicken geloggt: der Task ist bei
            // Tripo in diesem Moment bereits erstellt und abgerechnet. Geht
            // die Antwort selbst noch verloren (z.B. Verbindungsabbruch
            // durch einen Deploy-Wechsel mitten in der Anfrage), bleibt der
            // Task sonst fuer uns komplett unauffindbar, obwohl er bei
            // Tripo existiert - dieser Log-Eintrag ist dann die einzige
            // Spur, um ihn nachtraeglich manuell abzurufen.
            tracing::info!(task_id = %task_id, "3D-Task erstellt (Tripo-Credit abgebucht)");
            Json(CreateSculptureResponse { task_id }).into_response()
        }
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
        Ok(task) => {
            // Fire-and-forget: sobald ein Task zum ersten Mal SUCCESS meldet,
            // wird das Modell im Hintergrund heruntergeladen, auf Watertight
            // geprueft und in test_models_dir abgelegt - ohne die Antwort an
            // das Frontend zu verzoegern. `processed_tasks` verhindert, dass
            // das bei jedem weiteren Polling-Request (alle 3s) wiederholt
            // wird.
            if task.status == providers::NormalizedStatus::Succeeded {
                if let Some(model_url) = task.model_url.clone() {
                    let is_new = {
                        let mut seen = state.processed_tasks.lock().unwrap();
                        seen.insert(id.clone())
                    };
                    if is_new {
                        let client = state.download_client.clone();
                        let dir = state.test_models_dir.clone();
                        let task_id = id.clone();
                        tokio::spawn(async move {
                            save_for_qa(client, dir, task_id, model_url).await;
                        });
                    }
                }
            }

            Json(SculptureStatusResponse {
                status: task.status.as_str().to_string(),
                progress: task.progress,
                model_url: task.model_url,
                thumbnail_url: task.thumbnail_url,
                error: task.error,
            })
            .into_response()
        }
        Err(e) => {
            tracing::error!("Task-Status konnte nicht abgerufen werden: {e}");
            error_response(StatusCode::BAD_GATEWAY, "Status konnte nicht abgerufen werden.")
        }
    }
}

/// Laedt das fertige Modell robust herunter (siehe model_download.rs fuer
/// Chunk-/Retry-Details), prueft die Topologie (siehe mesh_check.rs) und legt
/// beides lokal ab - GLB plus JSON-Begleitbericht mit demselben Task-Id-
/// Praefix. Der Dateiname traegt das Watertight-Ergebnis sichtbar im Namen,
/// damit beim manuellen Durchsehen von test-models/ sofort auffaellt, welche
/// Modelle NICHT schweissbar waren (die eigentliche "halbe Figur"-Gefahr -
/// Tripos eigener SUCCESS-Status allein sagt das nicht aus, siehe
/// mesh_check.rs).
async fn save_for_qa(client: reqwest::Client, dir: PathBuf, task_id: String, model_url: String) {
    let bytes = match model_download::download_with_retry(&client, &model_url).await {
        Ok(b) => b,
        Err(e) => {
            tracing::error!(task_id = %task_id, error = %e, "QA-Download des Modells fehlgeschlagen");
            return;
        }
    };

    let report = mesh_check::check_glb(&bytes);
    let tag = match &report {
        Ok(r) if r.is_watertight => "watertight",
        Ok(_) => "NOTWATERTIGHT",
        Err(_) => "CHECKFAILED",
    };

    if let Err(e) = tokio::fs::create_dir_all(&dir).await {
        tracing::error!(error = %e, dir = %dir.display(), "test-models-Ordner konnte nicht angelegt werden");
        return;
    }

    let glb_path = dir.join(format!("{task_id}_{tag}.glb"));
    if let Err(e) = tokio::fs::write(&glb_path, &bytes).await {
        tracing::error!(task_id = %task_id, error = %e, "Modell konnte nicht in test-models/ gespeichert werden");
        return;
    }

    let downloaded_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let report_json = serde_json::json!({
        "taskId": task_id,
        "downloadedAtEpochSeconds": downloaded_at,
        "byteLen": bytes.len(),
        "meshReport": report.as_ref().ok(),
        "meshCheckError": report.as_ref().err().map(|e| e.to_string()),
    });
    let report_path = dir.join(format!("{task_id}_{tag}.json"));
    let _ = tokio::fs::write(
        &report_path,
        serde_json::to_vec_pretty(&report_json).unwrap_or_default(),
    )
    .await;

    match &report {
        Ok(r) if r.is_watertight => {
            tracing::info!(task_id = %task_id, triangles = r.triangle_count, "Modell wasserdicht, in test-models/ abgelegt");
        }
        Ok(r) => {
            tracing::warn!(
                task_id = %task_id,
                boundary_edges = r.boundary_edges,
                non_manifold_edges = r.non_manifold_edges,
                degenerate_triangles = r.degenerate_triangles,
                "Modell NICHT wasserdicht - siehe test-models/ fuer Details"
            );
        }
        Err(e) => {
            tracing::warn!(task_id = %task_id, error = %e, "Topologie-Check fehlgeschlagen");
        }
    }
}
