// Client für das Rust-Backend (siehe backend/src/main.rs) - Foto hochladen,
// Task anstoßen, Status pollen. Basis-URL per Env-Var, damit lokal gegen
// localhost:8080 und in Produktion gegen den deployten Render-Service
// gezeigt werden kann, ohne Code-Änderung.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Vom Betreiber an Tester weitergegebener Code (siehe AccessGate.tsx) - schuetzt
// den kostenpflichtigen Foto-zu-3D-Endpunkt waehrend der Testphase vor
// unkontrolliertem Zugriff. Wird nur lokal gemerkt, nicht clientseitig
// geprueft - die eigentliche Pruefung macht das Backend (ACCESS_TOKEN).
export const ACCESS_TOKEN_STORAGE_KEY = "sculptureAccessToken";

export type SculptureTaskStatus = "processing" | "succeeded" | "failed";

export interface SculptureStatusResponse {
  status: SculptureTaskStatus;
  progress: number | null;
  modelUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
}

// localStorage-Zugriff kann in manchen Browsern/Datenschutz-Einstellungen
// (strikte Cookie-Blocker, restriktive Storage-Policies) eine Exception
// werfen statt einfach leer zu sein - ohne Absicherung wuerde das den
// gesamten Upload sofort abbrechen, noch bevor ein einziger Request
// rausgeht (live beobachtet: mehrere Browser inkl. Inkognito zeigten
// sofort einen Fehler, ohne dass das Backend je eine Anfrage sah). Faellt
// in diesem Fall auf eine reine In-Memory-Variable zurueck - der
// Zugangscode "haelt" dann nur fuer den aktuellen Seitenaufruf statt
// dauerhaft, was besser ist als ein kompletter Ausfall der Funktion.
let memoryAccessToken: string | null = null;

export function readAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? memoryAccessToken;
  } catch {
    return memoryAccessToken;
  }
}

export function writeAccessToken(value: string | null): void {
  memoryAccessToken = value;
  try {
    if (value === null) window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    else window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, value);
  } catch {
    // localStorage nicht verfuegbar - memoryAccessToken traegt die Session
    // zumindest fuer den aktuellen Seitenaufruf.
  }
}

function accessTokenHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? readAccessToken() : null;
  return token ? { "X-Access-Token": token } : {};
}

export async function createSculptureTask(files: File[]): Promise<string> {
  const form = new FormData();
  // Mehrere Felder mit demselben Namen "photo" - das Backend baut daraus
  // bei 2-4 Fotos eine Collage (siehe backend/src/collage.rs), bei genau
  // einem Foto bleibt das Verhalten unveraendert.
  for (const file of files) form.append("photo", file);
  const res = await fetch(`${API_BASE}/api/sculptures`, {
    method: "POST",
    headers: accessTokenHeaders(),
    body: form,
  });
  if (res.status === 401) {
    // Falscher/fehlender Code - lokal geloescht, damit AccessGate beim
    // naechsten Versuch wieder danach fragt statt den falschen Wert erneut
    // stillschweigend mitzuschicken.
    writeAccessToken(null);
    throw new Error("invalid_access_token");
  }
  if (!res.ok) {
    throw new Error(`create_sculpture_failed: ${res.status}`);
  }
  const data = (await res.json()) as { taskId: string };
  return data.taskId;
}

export async function getSculptureStatus(taskId: string): Promise<SculptureStatusResponse> {
  const res = await fetch(`${API_BASE}/api/sculptures/${taskId}`);
  if (!res.ok) {
    throw new Error(`get_sculpture_status_failed: ${res.status}`);
  }
  return (await res.json()) as SculptureStatusResponse;
}
