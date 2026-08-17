interface StepPlaceholderProps {
  title: string;
  description: string;
}

/**
 * Platzhalter für Schritte, die als Nächstes gebaut werden (KI-Vorschau,
 * Farbwahl, Sockel, Platzierung, Checkout). Damit ist der komplette
 * Klick-Pfad durch den Konfigurator schon jetzt testbar (Progress-Bar,
 * Vor/Zurück), auch bevor die einzelnen Schritte fertig sind.
 */
export function StepPlaceholder({ title, description }: StepPlaceholderProps) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-foreground-muted">{description}</p>
      <div className="mt-8 rounded-2xl border border-dashed border-border-subtle px-6 py-16 text-sm text-foreground-muted">
        Dieser Schritt entsteht als Nächstes.
      </div>
    </div>
  );
}
