"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSculptureTask, getSculptureStatus } from "@/lib/sculptureApi";
import { trackEvent } from "@/lib/analytics";

const POLL_INTERVAL_MS = 3000;
// Grobe Obergrenze, ab der wir dem Nutzer lieber ehrlich "hat nicht
// geklappt" statt endlos "wird generiert..." zeigen. Grosszuegig ueber der
// live beobachteten Dauer mit smart_low_poly (~3-4 Minuten statt der
// vorherigen ~30s ohne smart_low_poly, siehe providers/tripo.rs) bemessen.
const MAX_POLL_MS = 7 * 60 * 1000;

export type GenerationStatus = "idle" | "uploading" | "processing" | "succeeded" | "failed";

export interface GenerationState {
  status: GenerationStatus;
  progress: number | null;
  modelUrl: string | null;
  error: string | null;
}

const IDLE_STATE: GenerationState = { status: "idle", progress: null, modelUrl: null, error: null };

/**
 * Stößt die Tripo-Generierung an - NICHT mehr automatisch beim ersten Foto
 * (siehe KonfiguratorContext.tsx), sondern explizit per `start(files)`,
 * aufgerufen beim Verlassen des Upload-Schritts. Grund: mit optionalen
 * Zusatzfotos (bis zu 4, siehe StepUpload.tsx) wuerde ein Auto-Start beim
 * ersten Foto einen (kostenpflichtigen!) Tripo-Task ausloesen, bevor der
 * Nutzer weitere Blickwinkel-Fotos ueberhaupt hinzugefuegt hat - doppelt
 * abgerechnete/verworfene Tasks waeren die Folge. `start` ist idempotent
 * fuer dieselbe Files-Array-Referenz (verhindert Doppel-Start bei
 * mehrfachem Klick) und bricht einen noch laufenden vorherigen Versuch
 * sauber ab, falls der Nutzer zurueckgeht und ein neues Foto-Set waehlt.
 */
export function useSculptureGeneration(): { state: GenerationState; start: (files: File[]) => void } {
  const [state, setState] = useState<GenerationState>(IDLE_STATE);
  const startedForFilesRef = useRef<File[] | null>(null);
  // Erhoehter Token macht jeden vorherigen Lauf ungueltig (statt eines
  // einzelnen "cancelled"-Flags) - so koennen mehrere aufeinanderfolgende
  // start()-Aufrufe (neues Foto-Set nach Zurueck-Navigation) sich nicht
  // gegenseitig ueberschreiben.
  const tokenRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      tokenRef.current += 1;
      clearTimeout(timerRef.current);
    };
  }, []);

  const start = useCallback((files: File[]) => {
    if (files.length === 0) return;
    if (startedForFilesRef.current === files) return;
    startedForFilesRef.current = files;

    const myToken = (tokenRef.current += 1);
    clearTimeout(timerRef.current);
    const startedAt = Date.now();

    async function poll(taskId: string) {
      if (tokenRef.current !== myToken) return;
      if (Date.now() - startedAt > MAX_POLL_MS) {
        setState({ status: "failed", progress: null, modelUrl: null, error: "Zeitüberschreitung bei der Generierung." });
        trackEvent("sculpture_generation_failed", { reason: "timeout" });
        return;
      }
      try {
        const result = await getSculptureStatus(taskId);
        if (tokenRef.current !== myToken) return;
        if (result.status === "succeeded" && result.modelUrl) {
          setState({ status: "succeeded", progress: 100, modelUrl: result.modelUrl, error: null });
          trackEvent("sculpture_generation_succeeded");
          return;
        }
        if (result.status === "failed") {
          setState({
            status: "failed",
            progress: null,
            modelUrl: null,
            error: result.error ?? "Die Generierung ist fehlgeschlagen.",
          });
          trackEvent("sculpture_generation_failed", { reason: "provider_error" });
          return;
        }
        setState((s) => ({ ...s, status: "processing", progress: result.progress ?? s.progress }));
        timerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
      } catch {
        // Transientes Netzwerkproblem beim Pollen selbst - weiter versuchen,
        // der MAX_POLL_MS-Check oben fängt ein echtes Hängenbleiben ab.
        timerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
      }
    }

    async function begin() {
      setState({ status: "uploading", progress: null, modelUrl: null, error: null });
      trackEvent("sculpture_generation_started", { photoCount: files.length });
      try {
        const taskId = await createSculptureTask(files);
        if (tokenRef.current !== myToken) return;
        setState((s) => ({ ...s, status: "processing" }));
        timerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
      } catch (err) {
        if (tokenRef.current !== myToken) return;
        const isInvalidToken = err instanceof Error && err.message === "invalid_access_token";
        setState({
          status: "failed",
          progress: null,
          modelUrl: null,
          error: isInvalidToken
            ? "Zugangscode fehlt oder ist falsch. Bitte Seite neu laden und erneut eingeben."
            : "Foto konnte nicht hochgeladen werden.",
        });
        trackEvent("sculpture_generation_failed", { reason: isInvalidToken ? "invalid_access_token" : "upload_error" });
      }
    }

    begin();
  }, []);

  return { state, start };
}
