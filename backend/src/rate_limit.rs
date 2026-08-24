// Simpler In-Memory Sliding-Window-Rate-Limiter pro IP. Bewusst ohne
// zusaetzliche Crate (z.B. tower_governor) - der Bedarf ist minimal (ein
// einzelner kostenpflichtiger Endpunkt) und ein paar Zeilen Standardbibliothek
// sind leichter nachzuvollziehen als eine weitere Abhaengigkeit.
//
// Nur In-Memory: bei einem Neustart des Service (z.B. Deploy) wird der
// Zaehler zurueckgesetzt - fuer den hier verfolgten Zweck (Schutz der
// KI-Credits vor versehentlichem/absichtlichem Missbrauch durch einzelne
// Test-User) ausreichend, kein Anspruch auf verteiltes Rate-Limiting ueber
// mehrere Instanzen hinweg (der Service laeuft ohnehin mit `numInstances: 1`).

use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub struct RateLimiter {
    max_requests: u32,
    window: Duration,
    hits: Mutex<HashMap<IpAddr, Vec<Instant>>>,
}

impl RateLimiter {
    pub fn new(max_requests: u32, window: Duration) -> Self {
        Self {
            max_requests,
            window,
            hits: Mutex::new(HashMap::new()),
        }
    }

    /// true = Anfrage erlaubt (und gezaehlt), false = Limit erreicht.
    pub fn check(&self, ip: IpAddr) -> bool {
        let now = Instant::now();
        let mut hits = self.hits.lock().unwrap_or_else(|e| e.into_inner());
        let entry = hits.entry(ip).or_default();
        entry.retain(|&t| now.duration_since(t) < self.window);

        if entry.len() as u32 >= self.max_requests {
            return false;
        }
        entry.push(now);
        true
    }
}
