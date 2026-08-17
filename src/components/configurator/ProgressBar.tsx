import { CONFIGURATOR_STEPS } from "@/lib/configurator-steps";

interface ProgressBarProps {
  currentIndex: number;
}

/**
 * Fortschrittsanzeige des Konfigurators. `aria-current="step"` markiert
 * den aktiven Schritt für Screenreader (Barrierefreiheit, siehe Konzept
 * Abschnitt 6) - rein visuelle Hervorhebung reicht dafür nicht aus.
 */
export function ProgressBar({ currentIndex }: ProgressBarProps) {
  return (
    <ol
      aria-label="Fortschritt im Konfigurator"
      className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-6 pt-8"
    >
      {CONFIGURATOR_STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <li key={step.id} className="flex flex-1 flex-col items-center gap-2">
            <span
              aria-current={isActive ? "step" : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                isActive
                  ? "border-accent-warm bg-accent-warm text-background"
                  : isDone
                    ? "border-accent-warm/60 text-accent-warm"
                    : "border-border-subtle text-foreground-muted"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`hidden text-center text-xs sm:block ${
                isActive ? "text-foreground" : "text-foreground-muted"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
