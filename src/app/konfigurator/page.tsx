"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { ProgressBar } from "@/components/configurator/ProgressBar";
import { StepUpload } from "@/components/configurator/StepUpload";
import { StepVorschau } from "@/components/configurator/StepVorschau";
import { StepFarbe } from "@/components/configurator/StepFarbe";
import { StepSockel } from "@/components/configurator/StepSockel";
import { StepPlatzierung } from "@/components/configurator/StepPlatzierung";
import { StepCheckout } from "@/components/configurator/StepCheckout";
import { CONFIGURATOR_STEPS } from "@/lib/configurator-steps";
import { DEFAULT_MATERIAL_ID, DEFAULT_SIZE_ID, MATERIALS, SIZES } from "@/lib/catalog";

export default function KonfiguratorPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [materialId, setMaterialId] = useState(DEFAULT_MATERIAL_ID);
  const [sizeId, setSizeId] = useState(DEFAULT_SIZE_ID);

  const currentStep = CONFIGURATOR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === CONFIGURATOR_STEPS.length - 1;
  const canProceed = currentStep.id !== "upload" || file !== null;

  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[1];

  useEffect(() => {
    trackEvent("configurator_step_view", { step: currentStep.id, stepIndex });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-border-subtle/60 px-6 py-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          Deine<span className="text-accent-warm">Skulptur</span>
        </Link>
      </div>

      <ProgressBar currentIndex={stepIndex} />

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        {currentStep.id === "upload" && <StepUpload file={file} onFileSelected={setFile} />}
        {currentStep.id === "vorschau" && (
          <StepVorschau colorHex={material.colorHex} scale={size.scale} />
        )}
        {currentStep.id === "farbe" && (
          <StepFarbe materialId={materialId} onMaterialChange={setMaterialId} scale={size.scale} />
        )}
        {currentStep.id === "sockel" && (
          <StepSockel materialId={materialId} sizeId={sizeId} onSizeChange={setSizeId} />
        )}
        {currentStep.id === "platzierung" && (
          <StepPlatzierung materialId={materialId} sizeId={sizeId} />
        )}
        {currentStep.id === "checkout" && (
          <StepCheckout materialId={materialId} sizeId={sizeId} />
        )}
      </main>

      <div className="mx-auto flex w-full max-w-xl items-center justify-between px-6 pb-12">
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst}
          className="rounded-full border border-border-subtle px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent disabled:opacity-40"
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.min(CONFIGURATOR_STEPS.length - 1, i + 1))}
          disabled={isLast || !canProceed}
          className="rounded-full bg-accent-warm px-6 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.03] disabled:pointer-events-none disabled:opacity-40"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
