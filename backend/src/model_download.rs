// Robuster Stream-Download fuer die von Tripo bereitgestellte Modell-Datei.
// Zwei Gruende, warum das nicht einfach `reqwest::get(...).bytes()` sein
// darf: (1) Tripos Signed-URL traegt eine Ablauf-Policy im Query-String
// (live bestaetigt: laeuft am Erstellungstag um Mitternacht UTC ab) - das
// Modell muss also zeitnah abgeholt werden. (2) Ein mitten im Stream
// abgebrochener Download wuerde sonst ein unbemerkt abgeschnittenes GLB im
// Test-Ordner hinterlassen (siehe Konzept: genau das fuehrt zu den "halben
// Figuren"). Deshalb: Bytes werden Chunk fuer Chunk gelesen, die
// tatsaechlich empfangene Laenge gegen Content-Length geprueft, und bei
// Abbruch per HTTP-Range-Request ab dem letzten empfangenen Byte
// weitergemacht statt komplett neu zu starten (Tripos S3-Presigned-URLs
// unterstuetzen Range-Requests).

use futures_util::StreamExt;

const MAX_ATTEMPTS: u32 = 4; // 1 regulaerer Versuch + 3 Range-Retries

#[derive(Debug, thiserror::Error)]
pub enum DownloadError {
    #[error("Anfrage fehlgeschlagen: {0}")]
    Request(#[from] reqwest::Error),
    #[error("Download nach {attempts} Versuchen unvollstaendig ({received} von {expected} Bytes)")]
    Incomplete {
        attempts: u32,
        received: usize,
        expected: usize,
    },
}

pub async fn download_with_retry(client: &reqwest::Client, url: &str) -> Result<Vec<u8>, DownloadError> {
    let mut buffer: Vec<u8> = Vec::new();
    let mut expected_len: Option<usize> = None;
    let mut last_err: Option<reqwest::Error> = None;

    for attempt in 1..=MAX_ATTEMPTS {
        let mut request = client.get(url);
        if !buffer.is_empty() {
            // Ab dem letzten tatsaechlich empfangenen Byte weitermachen statt
            // von vorn - spart Bandbreite und vermeidet, bei wiederholten
            // Abbruechen nie fertig zu werden.
            request = request.header("Range", format!("bytes={}-", buffer.len()));
        }

        let response = match request.send().await {
            Ok(r) => r,
            Err(e) => {
                tracing::warn!(attempt, error = %e, "Modell-Download-Anfrage fehlgeschlagen, wiederhole");
                last_err = Some(e);
                continue;
            }
        };

        if expected_len.is_none() {
            // Bei einem Range-Retry ist Content-Length nur die Restlaenge -
            // deshalb wird die Gesamtlaenge einmalig beim ersten Versuch
            // festgehalten (buffer ist zu diesem Zeitpunkt noch leer).
            expected_len = response
                .headers()
                .get(reqwest::header::CONTENT_LENGTH)
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<usize>().ok());
        }

        let mut stream = response.bytes_stream();
        let mut stream_broke = false;
        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(bytes) => buffer.extend_from_slice(&bytes),
                Err(e) => {
                    tracing::warn!(
                        attempt,
                        error = %e,
                        received_so_far = buffer.len(),
                        "Chunk-Verlust waehrend Download, wiederhole ab letztem Byte"
                    );
                    stream_broke = true;
                    break;
                }
            }
        }

        if stream_broke {
            continue;
        }

        match expected_len {
            Some(expected) if buffer.len() != expected => {
                tracing::warn!(
                    attempt,
                    received = buffer.len(),
                    expected,
                    "Unvollstaendiger Download (Content-Length-Abgleich), wiederhole"
                );
                continue;
            }
            _ => return Ok(buffer),
        }
    }

    if let Some(e) = last_err {
        if buffer.is_empty() {
            return Err(e.into());
        }
    }
    Err(DownloadError::Incomplete {
        attempts: MAX_ATTEMPTS,
        received: buffer.len(),
        expected: expected_len.unwrap_or(0),
    })
}
