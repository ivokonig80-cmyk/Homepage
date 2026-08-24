"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { checkBrightness } from "@/lib/photoQuality";

const MAX_SIZE_MB = 20;
const MAX_PHOTOS = 4;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface StepUploadProps {
  files: File[];
  onFileAdded: (file: File) => void;
  onFileRemoved: (index: number) => void;
}

/**
 * Schritt 1: Foto-Upload. Ein Pflichtfoto (Dropzone) plus bis zu 3
 * optionale Zusatzfotos aus anderen Blickwinkeln - werden serverseitig zu
 * einer Collage zusammengesetzt (siehe backend/src/collage.rs), was
 * Halluzinationen an verdeckten Koerperteilen deutlich reduziert (live an
 * einem Testfoto beobachtet: ein liegender Hund mit unklarer Beinhaltung
 * aus nur einem Blickwinkel).
 *
 * Validiert bereits hier client-seitig fuer sofortiges Feedback - das
 * ersetzt NICHT die serverseitige Pruefung (siehe Konzept Abschnitt 6
 * "Sicherheit"). Der Dunkel-Check (photoQuality.ts) ist bewusst eine reine
 * Heuristik ohne KI-Aufruf - kein zusaetzlicher kostenpflichtiger Call bei
 * jedem Upload.
 */
export function StepUpload({ files, onFileAdded, onFileRemoved }: StepUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const describedById = useId();

  const validateAndAdd = useCallback(
    async (candidate: File | undefined) => {
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
      setChecking(true);
      try {
        const { ok } = await checkBrightness(candidate);
        if (!ok) {
          setError("Foto zu dunkel — bitte ein helleres Foto hochladen (siehe Tipps oben).");
          return;
        }
        onFileAdded(candidate);
      } catch {
        // Helligkeits-Check konnte nicht ausgefuehrt werden (z.B. Bild
        // liess sich nicht dekodieren) - lieber durchlassen als den Upload
        // an einer reinen Zusatzpruefung scheitern zu lassen.
        onFileAdded(candidate);
      } finally {
        setChecking(false);
      }
    },
    [onFileAdded]
  );

  const primaryPreviewUrl = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : null), [files]);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
        Lade ein Foto hoch und baue deine Low Poly Skulptur jetzt
      </h1>
      <p className="mt-2 text-foreground-muted">
        Am besten frontal fotografiert und gut beleuchtet — das ergibt das
        beste 3D-Ergebnis.
      </p>
      <ul className="mt-3 list-inside list-disc text-sm text-foreground-muted">
        <li>Gut beleuchtet, möglichst ohne harte Schatten</li>
        <li>Dein Tier/Objekt vollständig und gut sichtbar im Bild</li>
        <li>Einfacher, ruhiger Hintergrund</li>
        <li>
          Bis zu 3 weitere Fotos aus anderen Blickwinkeln verbessern das
          Ergebnis zusätzlich — besonders bei liegenden/teilweise verdeckten
          Motiven
        </li>
      </ul>

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
          validateAndAdd(e.dataTransfer.files[0]);
        }}
        className={`mt-6 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragActive
            ? "border-accent-warm bg-accent-warm/5"
            : "border-border-subtle hover:border-accent"
        }`}
      >
        {primaryPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryPreviewUrl}
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
          onChange={(e) => validateAndAdd(e.target.files?.[0])}
          aria-label="Foto des Haustiers auswählen"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">
            Zusätzliche Blickwinkel (optional, bis zu {MAX_PHOTOS - 1})
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {files.slice(1).map((f, i) => (
              <PhotoThumb key={i} file={f} onRemove={() => onFileRemoved(i + 1)} />
            ))}
            {files.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => addMoreInputRef.current?.click()}
                className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border-subtle text-xs text-foreground-muted transition-colors hover:border-accent"
              >
                <span className="text-lg leading-none">+</span>
                Foto
              </button>
            )}
          </div>
          <input
            ref={addMoreInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => {
              validateAndAdd(e.target.files?.[0]);
              e.target.value = "";
            }}
            aria-label="Weiteres Foto aus einem anderen Blickwinkel auswählen"
          />
        </div>
      )}

      <p id={describedById} className="mt-3 text-xs text-foreground-muted">
        JPG, PNG oder WebP, maximal {MAX_SIZE_MB} MB pro Foto. Deine Fotos
        werden nach der Verarbeitung automatisch wieder gelöscht (siehe
        Datenschutzhinweis).
      </p>
      {checking && <p className="mt-2 text-sm text-foreground-muted">Foto wird geprüft …</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function PhotoThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border-subtle">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Zusätzliches Blickwinkel-Foto" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Dieses Foto entfernen"
        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-xs leading-none text-foreground hover:bg-background"
      >
        ×
      </button>
    </div>
  );
}
