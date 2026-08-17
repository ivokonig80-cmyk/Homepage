"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_MATERIAL_ID, DEFAULT_SIZE_ID } from "@/lib/catalog";
import { useSculptureGeneration, type GenerationState } from "@/lib/useSculptureGeneration";

interface KonfiguratorContextValue {
  file: File | null;
  setFile: (file: File) => void;
  materialId: string;
  setMaterialId: (id: string) => void;
  sizeId: string;
  setSizeId: (id: string) => void;
  generation: GenerationState;
}

const KonfiguratorContext = createContext<KonfiguratorContextValue | null>(null);

/**
 * Hält den Zustand über alle Konfigurator-Schritte hinweg (die jetzt eigene
 * Routen sind, siehe app/konfigurator/[step]/page.tsx - für saubere,
 * pro-Schritt auswertbare Clarity-Heatmaps statt einer einzigen Seite mit
 * sechs komplett unterschiedlichen Bildschirmen). Als Layout-Kind bleibt
 * dieser Provider bei reinen Client-Navigationen zwischen den Schritten
 * gemountet, der Zustand geht dabei nicht verloren.
 *
 * Die Foto-zu-3D-Generierung wird hier zentral gestartet (sobald `file`
 * gesetzt wird), nicht erst im Vorschau-Schritt - so läuft sie im
 * Hintergrund bereits weiter, während der Nutzer noch auf dem Upload-Schritt
 * ist oder direkt weiterklickt.
 */
export function KonfiguratorProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID);
  const [sizeId, setSizeId] = useState(DEFAULT_SIZE_ID);
  const generation = useSculptureGeneration(file);

  return (
    <KonfiguratorContext.Provider
      value={{ file, setFile, materialId, setMaterialId, sizeId, setSizeId, generation }}
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
