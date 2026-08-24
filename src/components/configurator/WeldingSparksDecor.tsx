// Dezente Ladezeit-Unterhaltung neben der 3D-Stage waehrend der KI-
// Generierung (siehe StepVorschau.tsx, dauert live 3-4 Minuten). Bewusst
// nur CSS/SVG, kein Three.js/WebGL und keine neue Dependency - ein
// flackernder Lichtbogen-Punkt plus ein paar fallende Funken pro Spalte,
// in Endlosschleife. Rein dekorativ (aria-hidden), keine Interaktion.

const SPARKS = [
  { left: "20%", delay: "0s", duration: "1.6s", drift: "-6px" },
  { left: "55%", delay: "0.35s", duration: "1.9s", drift: "8px" },
  { left: "40%", delay: "0.7s", duration: "1.4s", drift: "-3px" },
  { left: "70%", delay: "1.05s", duration: "2.1s", drift: "5px" },
  { left: "30%", delay: "1.4s", duration: "1.7s", drift: "4px" },
];

export function WeldingSparksDecor({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`relative w-14 overflow-hidden ${className}`}>
      <style>{`
        @keyframes welding-arc-flicker {
          0%, 100% { opacity: 0.55; transform: scale(0.9); }
          15% { opacity: 1; transform: scale(1.15); }
          30% { opacity: 0.7; transform: scale(0.95); }
          45% { opacity: 0.95; transform: scale(1.05); }
          60% { opacity: 0.6; transform: scale(0.9); }
          80% { opacity: 0.9; transform: scale(1.1); }
        }
        @keyframes welding-spark-fall {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          8% { opacity: 1; }
          100% { transform: translateY(220px) translateX(var(--spark-drift)); opacity: 0; }
        }
      `}</style>

      {/* Lichtbogen-Quelle */}
      <div
        className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-warm"
        style={{
          animation: "welding-arc-flicker 0.6s ease-in-out infinite",
          boxShadow: "0 0 12px 4px var(--accent-warm), 0 0 28px 10px rgba(201,169,97,0.35)",
        }}
      />

      {/* Fallende Funken */}
      {SPARKS.map((s, i) => (
        <div
          key={i}
          className="absolute top-1/2 h-1 w-1 rounded-full bg-accent-warm"
          style={{
            left: s.left,
            // @ts-expect-error -- CSS custom property, kein Standard-Style-Feld
            "--spark-drift": s.drift,
            animation: `welding-spark-fall ${s.duration} ease-in ${s.delay} infinite`,
            boxShadow: "0 0 4px 1px rgba(201,169,97,0.8)",
          }}
        />
      ))}
    </div>
  );
}
