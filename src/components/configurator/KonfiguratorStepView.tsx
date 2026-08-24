"use client";

import { useEffect } from "react";
import { StepUpload } from "@/components/configurator/StepUpload";
import { StepVorschau } from "@/components/configurator/StepVorschau";
import { StepFarbe } from "@/components/configurator/StepFarbe";
import { StepSockel } from "@/components/configurator/StepSockel";
import { StepPlatzierung } from "@/components/configurator/StepPlatzierung";
import { StepCheckout } from "@/components/configurator/StepCheckout";
import { useKonfigurator } from "@/components/configurator/KonfiguratorContext";
import { MATERIALS, SIZES } from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";
import type { ConfiguratorStepId } from "@/lib/configurator-steps";

export function KonfiguratorStepView({ step }: { step: ConfiguratorStepId }) {
  const { files, addFile, removeFile, materialId, setMaterialId, sizeId, setSizeId, generation } = useKonfigurator();

  useEffect(() => {
    trackEvent("configurator_step_view", { step });
  }, [step]);

  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[1];
  const modelUrl = generation.status === "succeeded" ? (generation.modelUrl ?? undefined) : undefined;

  switch (step) {
    case "upload":
      return <StepUpload files={files} onFileAdded={addFile} onFileRemoved={removeFile} />;
    case "vorschau":
      return <StepVorschau colorHex={material.colorHex} scale={size.scale} generation={generation} />;
    case "farbe":
      return (
        <StepFarbe materialId={materialId} onMaterialChange={setMaterialId} scale={size.scale} modelUrl={modelUrl} />
      );
    case "sockel":
      return (
        <StepSockel materialId={materialId} sizeId={sizeId} onSizeChange={setSizeId} modelUrl={modelUrl} />
      );
    case "platzierung":
      return <StepPlatzierung materialId={materialId} sizeId={sizeId} modelUrl={modelUrl} />;
    case "checkout":
      return <StepCheckout materialId={materialId} sizeId={sizeId} modelUrl={modelUrl} />;
  }
}
