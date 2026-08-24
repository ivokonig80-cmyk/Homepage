"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SculptureViewer } from "@/components/three/SculptureViewer";
import { PlacementCanvas } from "./PlacementCanvas";
import { CATALOG, MATERIALS, SIZES } from "@/lib/catalog";

const PLACEHOLDER_ITEM = CATALOG.find((item) => item.slug === "katze") ?? CATALOG[0];
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 20;

interface StepPlatzierungProps {
  materialId: string;
  sizeId: string;
  modelUrl?: string;
}

export function StepPlatzierung({ materialId, sizeId, modelUrl }: StepPlatzierungProps) {
  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[1];

  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Object-URL wird direkt aus dem File abgeleitet (kein setState-in-Effect
  // nötig) - der Effekt darunter kümmert sich nur noch ums Aufräumen.
  const backgroundUrl = useMemo(
    () => (backgroundFile ? URL.createObjectURL(backgroundFile) : null),
    [backgroundFile]
  );

  useEffect(() => {
    return () => {
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    };
  }, [backgroundUrl]);

  const handleSnapshot = useCallback((dataUrl: string) => {
    setSnapshotUrl(dataUrl);
  }, []);

  function handleFile(candidate: File | undefined) {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("Bitte lade ein JPG-, PNG- oder WebP-Bild hoch.");
      return;
    }
    if (candidate.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Die Datei darf höchstens ${MAX_SIZE_MB} MB groß sein.`);
      return;
    }
    setError(null);
    setBackgroundFile(candidate);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
        Platziere deine Kunst bereits jetzt
      </h1>
      <p className="mt-2 text-foreground-muted">
        Lade ein Foto deines Gartens oder deiner Terrasse hoch und platziere
        deine Skulptur darauf. (Platzhalter-Form, siehe Vorschau-Schritt.)
      </p>

      {/* Unsichtbarer Snapshot-Renderer: erzeugt einmalig ein PNG der
          aktuellen Skulptur (Farbe/Größe aus den vorigen Schritten), das
          danach als frei platzierbarer Sticker auf dein Foto gelegt wird. */}
      {!snapshotUrl && (
        <div className="sr-only" aria-hidden>
          <SculptureViewer
            {...(modelUrl ? { modelUrl } : { parts: PLACEHOLDER_ITEM.parts })}
            colorHex={material.colorHex}
            scale={size.scale}
            autoRotateSpeed={0}
            className="h-40 w-40"
            onSnapshot={handleSnapshot}
          />
        </div>
      )}

      {!backgroundUrl ? (
        <label className="mt-8 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-subtle px-6 py-10 text-center transition-colors hover:border-accent">
          <p className="font-medium">Foto deines Gartens/deiner Terrasse hierher ziehen</p>
          <p className="mt-1 text-sm text-foreground-muted">
            oder klicken, um eine Datei auszuwählen
          </p>
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
            aria-label="Foto für die Platzierung auswählen"
          />
        </label>
      ) : snapshotUrl ? (
        <div className="mt-8">
          <PlacementCanvas backgroundUrl={backgroundUrl} stickerUrl={snapshotUrl} />
          <button
            type="button"
            onClick={() => setBackgroundFile(null)}
            className="mt-4 text-sm text-foreground-muted underline hover:text-foreground"
          >
            Anderes Foto wählen
          </button>
        </div>
      ) : (
        <p className="mt-8 text-sm text-foreground-muted">Skulptur wird vorbereitet …</p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
