"use client";

import { useEffect, useRef, useState } from "react";
import { createSculptureTask, getSculptureStatus } from "@/lib/sculptureApi";
import { trackEvent } from "@/lib/analytics";

const POLL_INTERVAL_MS = 3000;
// Grobe Obergrenze, ab der wir dem Nutzer lieber ehrlich "hat nicht
// geklappt" statt endlos "wird generiert..." zeigen.
const MAX_POLL_MS = 5 * 60 * 1000;

export type GenerationStatus = "idle" | "uploading" | "processing" | "succeeded" | "failed";

export interface GenerationState {
  status: GenerationStatus;
  progress: number | null;
  modelUrl: string | null;
  error: string | null;
}

const IDLE_STATE: GenerationState = { status: "idle", progress: null, modelUrl: null, error: null };

/**
 * Stößt die Tripo-Generierung an, sobald ein Foto gesetzt wird (in
 * KonfiguratorProvider genutzt, läuft dadurch schon während der Nutzer
 * Farbe/Größe wählt weiter im Hintergrund) und pollt bis Ergebnis oder
 * Fehler/Timeout. Jedes File wird nur einmal angestoßen, auch wenn die
 * Komponente durch Routenwechsel zwischen den Konfigurator-Schritten neu
 * rendert.
 */
export function useSculptureGeneration(file: File | null): GenerationState {
  const [state, setState] = useState<GenerationState>(IDLE_STATE);
  const startedForFile = useRef<File | null>(null);

  useEffect(() => {
    if (!file) {
      startedForFile.current = null;
      setState(IDLE_STATE);
      return;
    }
    if (startedForFile.current === file) return;
    startedForFile.current = file;
    const currentFile = file;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();

    async function poll(taskId: string) {
      if (cancelled) return;
      if (Date.now() - startedAt > MAX_POLL_MS) {
        setState({ status: "failed", progress: null, modelUrl: null, error: "Zeitüberschreitung bei der Generierung." });
        trackEvent("sculpture_generation_failed", { reason: "timeout" });
        return;
      }
      try {
        const result = await getSculptureStatus(taskId);
        if (cancelled) return;
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
        timer = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
      } catch {
        // Transientes Netzwerkproblem beim Pollen selbst - weiter versuchen,
        // der MAX_POLL_MS-Check oben fängt ein echtes Hängenbleiben ab.
        timer = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
      }
    }

    async function start() {
      setState({ status: "uploading", progress: null, modelUrl: null, error: null });
      trackEvent("sculpture_generation_started");
      try {
        const taskId = await createSculptureTask(currentFile);
        if (cancelled) return;
        setState((s) => ({ ...s, status: "processing" }));
        timer = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setState({ status: "failed", progress: null, modelUrl: null, error: "Foto konnte nicht hochgeladen werden." });
        trackEvent("sculpture_generation_failed", { reason: "upload_error" });
      }
    }

    start();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [file]);

  return state;
}
