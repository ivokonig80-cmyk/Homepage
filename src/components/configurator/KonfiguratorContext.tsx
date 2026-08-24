"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_MATERIAL_ID, DEFAULT_SIZE_ID } from "@/lib/catalog";
import { useSculptureGeneration, type GenerationState } from "@/lib/useSculptureGeneration";

const MAX_PHOTOS = 4;

interface KonfiguratorContextValue {
  /** 1-4 hochgeladene Fotos (erstes Pflicht, bis zu 3 weitere optionale
   * Blickwinkel - siehe StepUpload.tsx/collage.rs). */
  files: File[];
  addFile: (file: File) => void;
  removeFile: (index: number) => void;
  materialId: string;
  setMaterialId: (id: string) => void;
  sizeId: string;
  setSizeId: (id: string) => void;
  generation: GenerationState;
  /** Stoesst die KI-Generierung mit dem aktuellen Foto-Set an - explizit
   * beim Verlassen des Upload-Schritts aufgerufen (siehe
   * useSculptureGeneration.ts fuer die Begruendung, warum nicht mehr
   * automatisch beim ersten Foto). */
  startGeneration: () => void;
}

const KonfiguratorContext = createContext<KonfiguratorContextValue | null>(null);

/**
 * Hält den Zustand über alle Konfigurator-Schritte hinweg (die jetzt eigene
 * Routen sind, siehe app/konfigurator/[step]/page.tsx - für saubere,
 * pro-Schritt auswertbare Clarity-Heatmaps statt einer einzigen Seite mit
 * sechs komplett unterschiedlichen Bildschirmen). Als Layout-Kind bleibt
 * dieser Provider bei reinen Client-Navigationen zwischen den Schritten
 * gemountet, der Zustand geht dabei nicht verloren.
 */
export function KonfiguratorProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<File[]>([]);
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID);
  const [sizeId, setSizeId] = useState(DEFAULT_SIZE_ID);
  const { state: generation, start } = useSculptureGeneration();

  function addFile(file: File) {
    setFiles((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, file]));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function startGeneration() {
    start(files);
  }

  return (
    <KonfiguratorContext.Provider
      value={{ files, addFile, removeFile, materialId, setMaterialId, sizeId, setSizeId, generation, startGeneration }}
    >
      {children}
    </KonfiguratorContext.Provider>
  );
}

export function useKonfigurator() {
  const ctx = useContext(KonfiguratorContext);
  if (!ctx) {
    throw new Error("useKonfigurator muss innerhalb von KonfiguratorProvider verwendet werden.");
  }
  return ctx;
}
