// Client für das Rust-Backend (siehe backend/src/main.rs) - Foto hochladen,
// Task anstoßen, Status pollen. Basis-URL per Env-Var, damit lokal gegen
// localhost:8080 und in Produktion gegen den deployten Render-Service
// gezeigt werden kann, ohne Code-Änderung.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type SculptureTaskStatus = "processing" | "succeeded" | "failed";

export interface SculptureStatusResponse {
  status: SculptureTaskStatus;
  progress: number | null;
  modelUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
}

export async function createSculptureTask(file: File): Promise<string> {
  const form = new FormData();
  form.append("photo", file);
  const res = await fetch(`${API_BASE}/api/sculptures`, { method: "POST", body: form });
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
