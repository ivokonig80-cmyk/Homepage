"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";

// Seitenweites Schweiss-/Funken-Lichtfeld fuer die Wartezeit der KI-
// Generierung (siehe StepVorschau.tsx, 3-4 Minuten). Ersetzt die zwei
// schmalen WeldingSparksDecor-Spalten links/rechts der Stage durch ein
// grosszuegiger ueber den ganzen Viewport verteiltes Pendant zur "Schweissen"-
// Bildsprache der Startseite (Lichtbogen-Kern mit Glow, gebogene Funkenbahnen,
// Glut-Ambient) - siehe WeldArc/WeldSpark/WeldAmbient in
// src/components/landing/LowPolyMesh.tsx als stilistisches Vorbild. Bewusst
// eine eigene, einfachere zeitbasierte CSS-Animation statt echter
// Wiederverwendung: die Startseiten-Funktionen erwarten MotionValue-Props aus
// dem Scroll-/Facetten-Montage-System, das es im Konfigurator nicht gibt.

type SourceSize = "small" | "medium" | "large";

interface WeldSource {
  left: string;
  top: string;
  size: SourceSize;
  delay: string;
  flickerDuration: string;
}

interface Spark {
  sourceIndex: number;
  offsetLeft: string;
  size: SourceSize;
  delay: string;
  duration: string;
  drift: string;
  fall: string;
}

interface Ambient {
  left: string;
  top: string;
  size: string;
  delay: string;
  duration: string;
}

const SOURCE_CORE_PX: Record<SourceSize, number> = { small: 8, medium: 12, large: 18 };
const SPARK_DOT_PX: Record<SourceSize, number> = { small: 3, medium: 5, large: 8 };

const SOURCES: WeldSource[] = [
  { left: "6%", top: "18%", size: "medium", delay: "0s", flickerDuration: "0.55s" },
  { left: "14%", top: "68%", size: "large", delay: "0.2s", flickerDuration: "0.7s" },
  { left: "28%", top: "42%", size: "small", delay: "0.9s", flickerDuration: "0.5s" },
  { left: "88%", top: "22%", size: "medium", delay: "0.4s", flickerDuration: "0.6s" },
  { left: "80%", top: "72%", size: "large", delay: "0.65s", flickerDuration: "0.75s" },
  { left: "94%", top: "48%", size: "small", delay: "1.1s", flickerDuration: "0.5s" },
  { left: "50%", top: "8%", size: "small", delay: "1.4s", flickerDuration: "0.55s" },
  { left: "46%", top: "90%", size: "medium", delay: "0.75s", flickerDuration: "0.65s" },
];

const SPARKS: Spark[] = [
  { sourceIndex: 0, offsetLeft: "-4px", size: "small", delay: "0s", duration: "2.1s", drift: "-18px", fall: "180px" },
  { sourceIndex: 0, offsetLeft: "10px", size: "medium", delay: "0.5s", duration: "2.6s", drift: "14px", fall: "240px" },
  { sourceIndex: 1, offsetLeft: "0px", size: "large", delay: "0.15s", duration: "3.1s", drift: "-26px", fall: "300px" },
  { sourceIndex: 1, offsetLeft: "16px", size: "small", delay: "0.85s", duration: "1.9s", drift: "10px", fall: "160px" },
  { sourceIndex: 2, offsetLeft: "-8px", size: "medium", delay: "1.1s", duration: "2.4s", drift: "-12px", fall: "210px" },
  { sourceIndex: 3, offsetLeft: "6px", size: "small", delay: "0.3s", duration: "2s", drift: "16px", fall: "170px" },
  { sourceIndex: 3, offsetLeft: "-12px", size: "medium", delay: "1.3s", duration: "2.7s", drift: "-20px", fall: "260px" },
  { sourceIndex: 4, offsetLeft: "0px", size: "large", delay: "0.5s", duration: "3.3s", drift: "22px", fall: "320px" },
  { sourceIndex: 4, offsetLeft: "-18px", size: "small", delay: "1.6s", duration: "1.8s", drift: "-8px", fall: "150px" },
  { sourceIndex: 5, offsetLeft: "8px", size: "medium", delay: "0.7s", duration: "2.3s", drift: "12px", fall: "200px" },
  { sourceIndex: 6, offsetLeft: "-6px", size: "small", delay: "1.8s", duration: "2s", drift: "-10px", fall: "180px" },
  { sourceIndex: 7, offsetLeft: "10px", size: "medium", delay: "1s", duration: "2.5s", drift: "18px", fall: "230px" },
];

const AMBIENTS: Ambient[] = [
  { left: "10%", top: "30%", size: "34vw", delay: "0s", duration: "9s" },
  { left: "85%", top: "60%", size: "30vw", delay: "1.5s", duration: "10.5s" },
  { left: "48%", top: "82%", size: "26vw", delay: "3s", duration: "8s" },
];

const subscribeHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function ConfiguratorWeldingField({ className = "" }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const hasHydrated = useSyncExternalStore(
    subscribeHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot
  );

  if (hasHydrated && prefersReducedMotion) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    >
      <style>{`
        @keyframes cwf-arc-flicker {
          0%, 100% { opacity: 0.5; transform: scale(0.88); }
          15% { opacity: 1; transform: scale(1.2); }
          30% { opacity: 0.65; transform: scale(0.94); }
          45% { opacity: 0.95; transform: scale(1.08); }
          60% { opacity: 0.55; transform: scale(0.9); }
          80% { opacity: 0.9; transform: scale(1.12); }
        }
        @keyframes cwf-spark-fall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          8% { opacity: 1; }
          70% { opacity: 0.8; }
          100% { transform: translate(var(--cwf-drift), var(--cwf-fall)) rotate(70deg); opacity: 0; }
        }
        @keyframes cwf-ambient-drift {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.16; }
          50% { transform: translate(calc(-50% + 3vw), calc(-50% - 2vh)) scale(1.12); opacity: 0.26; }
        }
      `}</style>

      {AMBIENTS.map((a, i) => (
        <div
          key={`ambient-${i}`}
          className="absolute rounded-full"
          style={{
            left: a.left,
            top: a.top,
            width: a.size,
            height: a.size,
            background:
              "radial-gradient(circle, rgba(201,169,97,0.5) 0%, rgba(201,169,97,0.12) 45%, rgba(201,169,97,0) 72%)",
            filter: "blur(18px)",
            animation: `cwf-ambient-drift ${a.duration} ease-in-out ${a.delay} infinite`,
          }}
        />
      ))}

      {SOURCES.map((s, i) => (
        <div
          key={`source-${i}`}
          className="absolute rounded-full"
          style={{
            left: s.left,
            top: s.top,
            width: SOURCE_CORE_PX[s.size],
            height: SOURCE_CORE_PX[s.size],
            background: "radial-gradient(circle, #ffffff 0%, var(--accent-warm) 55%, transparent 100%)",
            animation: `cwf-arc-flicker ${s.flickerDuration} ease-in-out ${s.delay} infinite`,
            boxShadow:
              "0 0 10px 3px var(--accent-warm), 0 0 26px 10px rgba(201,169,97,0.4), 0 0 46px 18px rgba(166,237,246,0.12)",
          }}
        />
      ))}

      {SPARKS.map((sp, i) => {
        const source = SOURCES[sp.sourceIndex];
        return (
          <div
            key={`spark-${i}`}
            className="absolute rounded-full bg-accent-warm"
            style={{
              left: `calc(${source.left} + ${sp.offsetLeft})`,
              top: source.top,
              width: SPARK_DOT_PX[sp.size],
              height: SPARK_DOT_PX[sp.size],
              // @ts-expect-error -- CSS custom properties, kein Standard-Style-Feld
              "--cwf-drift": sp.drift,
              "--cwf-fall": sp.fall,
              animation: `cwf-spark-fall ${sp.duration} ease-in ${sp.delay} infinite`,
              boxShadow: "0 0 6px 2px rgba(201,169,97,0.85), 0 0 12px 4px rgba(233,252,255,0.25)",
            }}
          />
        );
      })}
    </div>
  );
}
