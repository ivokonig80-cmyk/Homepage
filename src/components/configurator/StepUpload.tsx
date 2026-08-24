"use client";

import { useCallback, useId, useRef, useState } from "react";

const MAX_SIZE_MB = 20;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface StepUploadProps {
  file: File | null;
  onFileSelected: (file: File) => void;
}

/**
 * Schritt 1: Foto-Upload. Validiert Dateityp/-größe bereits hier
 * client-seitig für sofortiges Feedback - das ersetzt NICHT die
 * serverseitige Prüfung, die beim Anbinden des Backends dazukommt
 * (client-seitige Checks sind umgehbar, siehe Konzept Abschnitt 6
 * "Sicherheit").
 */
export function StepUpload({ file, onFileSelected }: StepUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const describedById = useId();

  const validateAndSet = useCallback(
    (candidate: File | undefined) => {
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
      onFileSelected(candidate);
    },
    [onFileSelected]
  );

  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
        Lade ein Foto hoch und baue deine Low Poly Skulptur jetzt
      </h1>
      <p className="mt-2 text-foreground-muted">
        Am besten frontal fotografiert und gut beleuchtet — das ergibt das
        beste 3D-Ergebnis.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-describedby={describedById}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          validateAndSet(e.dataTransfer.files[0]);
        }}
        className={`mt-8 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragActive
            ? "border-accent-warm bg-accent-warm/5"
            : "border-border-subtle hover:border-accent"
        }`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Vorschau des hochgeladenen Fotos"
            className="max-h-48 rounded-lg object-contain"
          />
        ) : (
          <>
            <p className="font-medium">Foto hierher ziehen</p>
            <p className="mt-1 text-sm text-foreground-muted">
              oder klicken, um eine Datei auszuwählen
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => validateAndSet(e.target.files?.[0])}
          aria-label="Foto des Haustiers auswählen"
        />
      </div>
      <p id={describedById} className="mt-2 text-xs text-foreground-muted">
        JPG, PNG oder WebP, maximal {MAX_SIZE_MB} MB. Dein Foto wird nach der
        Verarbeitung automatisch wieder gelöscht (siehe Datenschutzhinweis).
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
