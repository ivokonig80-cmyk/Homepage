"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform } from "framer-motion";

// Seitenweites Schweiss-/Funken-Lichtfeld fuer den gesamten Foto-zu-Modell-
// Erstellungsprozess (Drop-Box in StepUpload.tsx UND Wartezeit in
// StepVorschau.tsx). Bildsprache abgeglichen gegen public/hero-source/:
// lichtbogenschweissen.jpg, Metall-Schutzgas-Schweißen.jpg,
// 34989030-welding-with-sparks.avif - heller weiss-blauer Kern (vereinzelt),
// Funkenbahnen in Boegen statt gerader Linien, unscharfe Bokeh-Punkte.
//
// "Teile" (angelehnt an die Low-Poly-Facetten-Optik) fallen EINMALIG von
// oben herein und bleiben liegen (kein Endlos-Loop mehr) - faehrt der
// Besucher mit der Maus darueber, fliegen sie kurz hoch und sinken danach
// wieder zurueck (siehe FallingPart unten). Eigenstaendige, einfache
// Umsetzung; WeldArc/WeldSpark/SharedMaterialSource in
// src/components/landing/LowPolyMesh.tsx dienten nur als stilistisches,
// nicht technisches Vorbild (deren Funktionen haengen am Scroll-/Facetten-
// Montage-System, das es im Konfigurator nicht gibt).

type SourceSize = "small" | "medium" | "large";
type SparkHue = "warm" | "cool";

interface WeldSource {
  id: string;
  left: string;
  top: string;
  size: SourceSize;
  hue: SparkHue;
  // Statt eines kurzen, staendig wiederholten Flacker-Zyklus: eine kurze
  // Aufblitz-Flanke, danach lang gedimmt bis zum naechsten Loop. delay/
  // duration sind bewusst an je einen zugehoerigen Funken angelehnt (siehe
  // SPARKS unten), damit das Aufblitzen wirkt, als kaeme es vom Abgang
  // dieses Funkens - nicht als mechanisches Dauerflackern.
  delay: string;
  cycleDuration: string;
}

interface Spark {
  sourceId: string;
  offsetLeft: string;
  size: SourceSize;
  delay: string;
  duration: string;
  drift: string;
  arc: string;
  fall: string;
}

interface Ambient {
  left: string;
  top: string;
  size: string;
  delay: string;
  duration: string;
}

interface PartSpec {
  id: number;
  leftPercent: number;
  startTopPercent: number;
  restTopPercent: number;
  size: number;
  rotateStart: number;
  rotateRest: number;
  delay: number;
  fallDurationSeconds: number;
  shape: "tri" | "quad";
}

const SOURCE_CORE_PX: Record<SourceSize, number> = { small: 8, medium: 12, large: 18 };
const SPARK_DOT_PX: Record<SourceSize, number> = { small: 3, medium: 5, large: 8 };
const HUE_CORE: Record<SparkHue, string> = {
  warm: "radial-gradient(circle, #ffffff 0%, var(--accent-warm) 55%, transparent 100%)",
  cool: "radial-gradient(circle, #ffffff 0%, #a6edf6 50%, transparent 100%)",
};
const HUE_GLOW: Record<SparkHue, string> = {
  warm: "0 0 10px 3px var(--accent-warm), 0 0 26px 10px rgba(201,169,97,0.4), 0 0 46px 18px rgba(166,237,246,0.12)",
  cool: "0 0 10px 3px #a6edf6, 0 0 26px 10px rgba(166,237,246,0.45), 0 0 46px 18px rgba(201,169,97,0.15)",
};

// Punkt 3: das blaue Licht links neben der Drop Box (frueher hier "s2",
// hue "cool") ist jetzt warm. Punkt 4: sechs neue, durchweg kleine Lichter
// ("s9"-"s14") ergaenzt.
const SOURCES: WeldSource[] = [
  { id: "s1", left: "6%", top: "18%", size: "medium", hue: "warm", delay: "0.4s", cycleDuration: "4.2s" },
  { id: "s2", left: "14%", top: "68%", size: "large", hue: "warm", delay: "1.1s", cycleDuration: "5.4s" },
  { id: "s3", left: "90%", top: "38%", size: "small", hue: "warm", delay: "2.3s", cycleDuration: "3.6s" },
  { id: "s4", left: "88%", top: "22%", size: "medium", hue: "warm", delay: "0.8s", cycleDuration: "4.8s" },
  { id: "s5", left: "84%", top: "72%", size: "large", hue: "warm", delay: "1.6s", cycleDuration: "5.9s" },
  { id: "s6", left: "94%", top: "48%", size: "small", hue: "cool", delay: "2.9s", cycleDuration: "3.9s" },
  { id: "s7", left: "10%", top: "8%", size: "small", hue: "warm", delay: "3.4s", cycleDuration: "4.4s" },
  { id: "s8", left: "90%", top: "90%", size: "medium", hue: "warm", delay: "0.2s", cycleDuration: "5.1s" },
  { id: "s9", left: "85%", top: "10%", size: "small", hue: "warm", delay: "1.9s", cycleDuration: "3.3s" },
  { id: "s10", left: "6%", top: "60%", size: "small", hue: "warm", delay: "2.6s", cycleDuration: "4.7s" },
  { id: "s11", left: "92%", top: "30%", size: "small", hue: "warm", delay: "0.6s", cycleDuration: "3.8s" },
  { id: "s12", left: "14%", top: "78%", size: "small", hue: "cool", delay: "3.1s", cycleDuration: "4.1s" },
  { id: "s13", left: "8%", top: "50%", size: "small", hue: "warm", delay: "1.3s", cycleDuration: "5.6s" },
  { id: "s14", left: "16%", top: "12%", size: "small", hue: "warm", delay: "2.1s", cycleDuration: "3.5s" },
];

// Punkt 5: Faelle deutlich langsamer als zuvor (duration ~+50%). "arc" bleibt
// der seitliche Ausschlag auf halbem Weg fuer die Bogen-/Schleifenbahn.
const SPARKS: Spark[] = [
  { sourceId: "s1", offsetLeft: "-4px", size: "small", delay: "0.4s", duration: "3.4s", drift: "-18px", arc: "-32px", fall: "180px" },
  { sourceId: "s1", offsetLeft: "10px", size: "medium", delay: "1.0s", duration: "4.0s", drift: "14px", arc: "28px", fall: "240px" },
  { sourceId: "s2", offsetLeft: "0px", size: "large", delay: "1.1s", duration: "4.6s", drift: "-26px", arc: "-46px", fall: "300px" },
  { sourceId: "s2", offsetLeft: "16px", size: "small", delay: "1.9s", duration: "3.1s", drift: "10px", arc: "22px", fall: "160px" },
  { sourceId: "s3", offsetLeft: "-8px", size: "medium", delay: "2.3s", duration: "3.8s", drift: "-12px", arc: "-20px", fall: "210px" },
  { sourceId: "s4", offsetLeft: "6px", size: "small", delay: "0.8s", duration: "3.3s", drift: "16px", arc: "30px", fall: "170px" },
  { sourceId: "s4", offsetLeft: "-12px", size: "medium", delay: "2.0s", duration: "4.2s", drift: "-20px", arc: "-34px", fall: "260px" },
  { sourceId: "s5", offsetLeft: "0px", size: "large", delay: "1.6s", duration: "4.9s", drift: "22px", arc: "40px", fall: "320px" },
  { sourceId: "s5", offsetLeft: "-18px", size: "small", delay: "2.8s", duration: "3.0s", drift: "-8px", arc: "-14px", fall: "150px" },
  { sourceId: "s6", offsetLeft: "8px", size: "medium", delay: "2.9s", duration: "3.7s", drift: "12px", arc: "24px", fall: "200px" },
  { sourceId: "s7", offsetLeft: "-6px", size: "small", delay: "3.4s", duration: "3.2s", drift: "-10px", arc: "-18px", fall: "180px" },
  { sourceId: "s8", offsetLeft: "10px", size: "medium", delay: "0.2s", duration: "4.1s", drift: "18px", arc: "32px", fall: "230px" },
  { sourceId: "s3", offsetLeft: "4px", size: "small", delay: "3.5s", duration: "3.5s", drift: "-14px", arc: "-24px", fall: "190px" },
  { sourceId: "s6", offsetLeft: "-10px", size: "small", delay: "1.5s", duration: "2.9s", drift: "9px", arc: "16px", fall: "140px" },
  { sourceId: "s9", offsetLeft: "0px", size: "small", delay: "1.9s", duration: "3.1s", drift: "10px", arc: "18px", fall: "150px" },
  { sourceId: "s10", offsetLeft: "6px", size: "small", delay: "2.6s", duration: "3.4s", drift: "-12px", arc: "-20px", fall: "170px" },
  { sourceId: "s11", offsetLeft: "-4px", size: "small", delay: "0.6s", duration: "2.8s", drift: "8px", arc: "14px", fall: "140px" },
  { sourceId: "s12", offsetLeft: "8px", size: "small", delay: "3.1s", duration: "3.6s", drift: "-10px", arc: "-16px", fall: "160px" },
  { sourceId: "s13", offsetLeft: "-6px", size: "small", delay: "1.3s", duration: "3.9s", drift: "12px", arc: "22px", fall: "180px" },
  { sourceId: "s14", offsetLeft: "4px", size: "small", delay: "2.1s", duration: "3.0s", drift: "-8px", arc: "-14px", fall: "150px" },
];

const AMBIENTS: Ambient[] = [
  { left: "8%", top: "30%", size: "22vw", delay: "0s", duration: "9s" },
  { left: "90%", top: "60%", size: "20vw", delay: "1.5s", duration: "10.5s" },
  { left: "10%", top: "88%", size: "18vw", delay: "3s", duration: "8s" },
  { left: "88%", top: "15%", size: "16vw", delay: "2.2s", duration: "7s" },
  { left: "6%", top: "82%", size: "14vw", delay: "0.8s", duration: "8.5s" },
];

// Punkt 1: fallen nur EINMAL und bleiben liegen (siehe FallingPart). Ausser-
// dem kommen laufend neue hinzu statt nur dieser festen Startgruppe (siehe
// spawnRandomPart/MAX_PARTS unten). Groessere Dreiecke ergaenzt (bis 48px).
// Ausschliesslich in den seitlichen Raendern (leftPercent <= 16 oder >= 84) -
// siehe Datei-Kommentar oben: die Animation soll komplett im Hintergrund
// bleiben, nicht ueber der Drop Box/Vorschau-Buehne in der Mitte.
// Ueber die volle Hoehe verteilt, inkl. der aeussersten Raender oben/unten
// (~5%/~97%) - je 8 Stueck links/rechts statt vorher 7, mit mehr Abstand
// zueinander ("mehr verteilen").
const INITIAL_PARTS: PartSpec[] = [
  { id: 0, leftPercent: 6, startTopPercent: -10, restTopPercent: 5, size: 20, rotateStart: -20, rotateRest: 14, delay: 0.3, fallDurationSeconds: 3.2, shape: "tri" },
  { id: 1, leftPercent: 18, startTopPercent: -14, restTopPercent: 18, size: 16, rotateStart: 40, rotateRest: -8, delay: 1.4, fallDurationSeconds: 3.6, shape: "quad" },
  { id: 2, leftPercent: 3, startTopPercent: -18, restTopPercent: 32, size: 42, rotateStart: 15, rotateRest: -10, delay: 4.0, fallDurationSeconds: 4.2, shape: "tri" },
  { id: 3, leftPercent: 13, startTopPercent: -16, restTopPercent: 46, size: 18, rotateStart: 5, rotateRest: -18, delay: 2.1, fallDurationSeconds: 3.9, shape: "quad" },
  { id: 4, leftPercent: 2, startTopPercent: -10, restTopPercent: 59, size: 14, rotateStart: -50, rotateRest: 6, delay: 2.7, fallDurationSeconds: 3.0, shape: "tri" },
  { id: 5, leftPercent: 20, startTopPercent: -22, restTopPercent: 72, size: 36, rotateStart: 10, rotateRest: -22, delay: 0.6, fallDurationSeconds: 4.4, shape: "quad" },
  { id: 6, leftPercent: 9, startTopPercent: -12, restTopPercent: 85, size: 24, rotateStart: -35, rotateRest: 18, delay: 2.5, fallDurationSeconds: 3.4, shape: "tri" },
  { id: 7, leftPercent: 16, startTopPercent: -16, restTopPercent: 97, size: 15, rotateStart: 45, rotateRest: -20, delay: 3.9, fallDurationSeconds: 3.8, shape: "quad" },
  { id: 8, leftPercent: 94, startTopPercent: -12, restTopPercent: 6, size: 22, rotateStart: -25, rotateRest: 20, delay: 0.9, fallDurationSeconds: 3.3, shape: "quad" },
  { id: 9, leftPercent: 81, startTopPercent: -20, restTopPercent: 19, size: 44, rotateStart: 25, rotateRest: -30, delay: 3.3, fallDurationSeconds: 4.5, shape: "tri" },
  { id: 10, leftPercent: 98, startTopPercent: -14, restTopPercent: 33, size: 16, rotateStart: 60, rotateRest: -12, delay: 1.9, fallDurationSeconds: 3.5, shape: "quad" },
  { id: 11, leftPercent: 87, startTopPercent: -24, restTopPercent: 47, size: 48, rotateStart: -14, rotateRest: 22, delay: 3.6, fallDurationSeconds: 5.0, shape: "tri" },
  { id: 12, leftPercent: 99, startTopPercent: -16, restTopPercent: 60, size: 20, rotateStart: 30, rotateRest: -16, delay: 1.1, fallDurationSeconds: 3.7, shape: "quad" },
  { id: 13, leftPercent: 80, startTopPercent: -18, restTopPercent: 73, size: 28, rotateStart: 8, rotateRest: -28, delay: 4.8, fallDurationSeconds: 4.0, shape: "tri" },
  { id: 14, leftPercent: 92, startTopPercent: -10, restTopPercent: 86, size: 17, rotateStart: -40, rotateRest: 10, delay: 2.0, fallDurationSeconds: 3.1, shape: "quad" },
  { id: 15, leftPercent: 83, startTopPercent: -14, restTopPercent: 98, size: 25, rotateStart: 18, rotateRest: -35, delay: 3.1, fallDurationSeconds: 4.1, shape: "tri" },
];

const PART_FILL = "linear-gradient(135deg, #e9d6a8 0%, var(--accent-warm) 55%, #7a5f2e 100%)";
// Abstand (in Prozent des Viewports), innerhalb dessen ein Voruebergang des
// Zeigers als "Treffer" zaehlt (siehe FallingPart/REQUIRED_PASSES unten).
// Groesszuegiger als zuvor ("empfindlicher fuer die Maus") - reagiert schon,
// bevor der Zeiger exakt auf dem Teil sitzt.
const HOVER_RADIUS_PERCENT = 22;
// Nicht schon beim ersten Drueberfahren abheben: erst wenn der Zeiger
// innerhalb von PASS_WINDOW_MS mehrfach (REQUIRED_PASSES) in die Naehe
// kommt - also ein paar Mal direkt hintereinander drueberfaehrt statt nur
// einmal vorbeizustreifen - schiesst das Teil nach oben. Schwelle bewusst
// niedriger als anfangs (2 statt 3 Treffer, groesseres Zeitfenster) fuer
// mehr Empfindlichkeit, aber weiterhin kein Sofort-Ausloesen bei blossem
// Vorbeistreifen.
const REQUIRED_PASSES = 2;
const PASS_WINDOW_MS = 1100;
// Wie lange nach dem Ausloesen gewartet wird, bevor das Teil aus dem State
// entfernt wird (siehe onLaunched) - grosszuegig genug, dass die schnelle
// Feder es bei LAUNCH_STIFFNESS/-DAMPING sichtbar bis ausserhalb des
// Fensters getragen hat, bevor es verschwindet.
const LAUNCH_REMOVE_DELAY_MS = 550;

// "Kontinuierlich weitere fallen lassen" statt nur der festen Startgruppe:
// alle SPAWN_INTERVAL_MS kommt ein neues Teil hinzu, bis MAX_PARTS erreicht
// ist (Obergrenze aus Performance-Gruenden - DOM-Knoten + Motion-Werte pro
// Teil summieren sich sonst ueber eine mehrminuetige Generierungs-Wartezeit
// unbegrenzt auf). Deutliche Praeferenz fuer groessere Dreiecke (siehe
// Anfrage), Vierecke bleiben als Abwechslung erhalten.
const MAX_PARTS = 42;
const SPAWN_INTERVAL_MS = 4200;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnRandomPart(id: number): PartSpec {
  const onLeftSide = Math.random() < 0.5;
  const leftPercent = onLeftSide ? randomBetween(2, 20) : randomBetween(80, 98);
  const isTriangle = Math.random() < 0.75;
  const size = isTriangle ? randomBetween(30, 50) : randomBetween(14, 26);
  return {
    id,
    leftPercent,
    startTopPercent: randomBetween(-26, -10),
    restTopPercent: randomBetween(4, 98),
    size,
    rotateStart: randomBetween(-60, 60),
    rotateRest: randomBetween(-30, 30),
    delay: 0,
    fallDurationSeconds: randomBetween(3.4, 5.2),
    shape: isTriangle ? "tri" : "quad",
  };
}

const subscribeHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

/** Faellt einmalig von oben herein und bleibt am Ruheplatz liegen. Erst wenn
 * der Zeiger innerhalb kurzer Zeit mehrfach in die Naehe kommt (siehe
 * REQUIRED_PASSES/PASS_WINDOW_MS) - ein einzelnes Vorbeistreifen reicht
 * bewusst nicht -, schiesst es komplett nach oben aus dem Fenster und wird
 * danach entfernt; der Aufrufer (onLaunched) haengt sofort ein frisches Teil
 * an, damit staendig Nachschub faellt. Gezaehlt wird jeder Uebergang von
 * "ausserhalb" zu "innerhalb" des Radius (nicht kontinuierliche Naehe), ein
 * Wischen also, kein Halten. */
function FallingPart({
  part,
  pointerXPercent,
  pointerYPercent,
  onLaunched,
}: {
  part: PartSpec;
  pointerXPercent: ReturnType<typeof useMotionValue<number>>;
  pointerYPercent: ReturnType<typeof useMotionValue<number>>;
  onLaunched: (id: number) => void;
}) {
  const distance = useTransform([pointerXPercent, pointerYPercent], (values: number[]) => {
    const [px, py] = values;
    if (px < -900) return 9999;
    const dx = part.leftPercent - px;
    const dy = part.restTopPercent - py;
    return Math.hypot(dx, dy);
  });
  const shootTarget = useMotionValue(0);
  // Deutlich straffer/leichter als zuvor ("schneller reagieren") - die
  // Feder beschleunigt das Teil merklich zuegiger auf dem Weg nach oben.
  const springLiftY = useSpring(shootTarget, { stiffness: 320, damping: 18, mass: 0.3 });

  const wasInsideRef = useRef(false);
  const passTimestampsRef = useRef<number[]>([]);
  const launchedRef = useRef(false);
  const removeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useMotionValueEvent(distance, "change", (latest) => {
    const isInside = latest <= HOVER_RADIUS_PERCENT;
    if (isInside && !wasInsideRef.current && !launchedRef.current) {
      const now = Date.now();
      const recentPasses = passTimestampsRef.current.filter((t) => now - t < PASS_WINDOW_MS);
      recentPasses.push(now);
      passTimestampsRef.current = recentPasses;
      if (recentPasses.length >= REQUIRED_PASSES) {
        launchedRef.current = true;
        // Weit genug ueber die tatsaechliche Fensterhoehe hinaus, damit das
        // Teil unabhaengig von seiner Ruheposition komplett verschwindet,
        // bevor es aus dem State entfernt wird.
        shootTarget.set(-(window.innerHeight + part.restTopPercent * 10 + 200));
        removeTimeoutRef.current = setTimeout(() => onLaunched(part.id), LAUNCH_REMOVE_DELAY_MS);
      }
    }
    wasInsideRef.current = isInside;
  });

  useEffect(() => () => clearTimeout(removeTimeoutRef.current), []);

  const clip =
    part.shape === "tri"
      ? "polygon(50% 0%, 100% 100%, 0% 100%)"
      : "polygon(15% 0%, 100% 15%, 85% 100%, 0% 85%)";

  return (
    <motion.div
      className="absolute"
      data-cwf-part={part.id}
      style={{
        left: `${part.leftPercent}%`,
        width: part.size,
        height: part.size,
        y: springLiftY,
        background: PART_FILL,
        clipPath: clip,
        boxShadow: "0 0 8px 1px rgba(201,169,97,0.5)",
      }}
      initial={{ top: `${part.startTopPercent}%`, opacity: 0, rotate: part.rotateStart }}
      animate={{ top: `${part.restTopPercent}%`, opacity: 1, rotate: part.rotateRest }}
      transition={{ duration: part.fallDurationSeconds, delay: part.delay, ease: "easeIn" }}
    />
  );
}

export function ConfiguratorWeldingField({ className = "" }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const hasHydrated = useSyncExternalStore(
    subscribeHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot
  );
  // -1000 als "kein Zeiger in der Naehe"-Sentinel statt null, damit die
  // Distanzrechnung in FallingPart ein einfacher Zahlenvergleich bleiben kann.
  const pointerXPercent = useMotionValue(-1000);
  const pointerYPercent = useMotionValue(-1000);
  const [parts, setParts] = useState<PartSpec[]>(INITIAL_PARTS);
  const nextPartIdRef = useRef(INITIAL_PARTS.length);

  // Ein weggeschossenes Teil wird entfernt UND sofort durch ein frisches
  // ersetzt ("immer neue hinterher") - unabhaengig vom periodischen
  // Spawn-Timer unten, der weiterhin zusaetzlich im Hintergrund fuer
  // Nachschub sorgt.
  function handlePartLaunched(id: number) {
    setParts((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length >= MAX_PARTS) return remaining;
      return [...remaining, spawnRandomPart(nextPartIdRef.current++)];
    });
  }

  // Lauscht auf window statt auf dem eigenen (pointer-events-none) Overlay -
  // sonst wuerde jedes davorliegende Element (Buttons, Dropzone, Formular)
  // die Bewegungserkennung per Hit-Testing blockieren, sobald die Maus
  // darueber steht. Da das Overlay ohnehin den ganzen Viewport abdeckt,
  // entspricht window.innerWidth/-Height exakt seiner Flaeche.
  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      pointerXPercent.set((e.clientX / window.innerWidth) * 100);
      pointerYPercent.set((e.clientY / window.innerHeight) * 100);
    }
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [pointerXPercent, pointerYPercent]);

  // Laufend neue Teile nachkommen lassen (siehe MAX_PARTS/SPAWN_INTERVAL_MS
  // oben), damit das Bild ueber eine mehrminuetige Wartezeit nicht nach der
  // Startgruppe statisch wirkt. Bewusst erst NACH dem Mounten (useEffect) -
  // Math.random() waere sonst ein Server/Client-Hydration-Mismatch.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const timer = setInterval(() => {
      setParts((prev) => {
        if (prev.length >= MAX_PARTS) return prev;
        return [...prev, spawnRandomPart(nextPartIdRef.current++)];
      });
    }, SPAWN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [prefersReducedMotion]);

  if (hasHydrated && prefersReducedMotion) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    >
      <style>{`
        @keyframes cwf-arc-flicker {
          0% { opacity: 0.32; transform: scale(0.82); }
          4% { opacity: 1; transform: scale(1.3); }
          12% { opacity: 0.4; transform: scale(0.88); }
          100% { opacity: 0.32; transform: scale(0.82); }
        }
        @keyframes cwf-spark-fall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          8% { opacity: 1; }
          45% { transform: translate(var(--cwf-arc), calc(var(--cwf-fall) * 0.4)) rotate(35deg); }
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

      {SOURCES.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: s.left,
            top: s.top,
            width: SOURCE_CORE_PX[s.size],
            height: SOURCE_CORE_PX[s.size],
            background: HUE_CORE[s.hue],
            animation: `cwf-arc-flicker ${s.cycleDuration} ease-out ${s.delay} infinite`,
            boxShadow: HUE_GLOW[s.hue],
          }}
        />
      ))}

      {SPARKS.map((sp, i) => {
        const source = SOURCES.find((s) => s.id === sp.sourceId)!;
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
              "--cwf-arc": sp.arc,
              "--cwf-fall": sp.fall,
              animation: `cwf-spark-fall ${sp.duration} ease-in ${sp.delay} infinite`,
              boxShadow: "0 0 6px 2px rgba(201,169,97,0.85), 0 0 12px 4px rgba(233,252,255,0.25)",
            }}
          />
        );
      })}

      {parts.map((part) => (
        <FallingPart
          key={part.id}
          part={part}
          pointerXPercent={pointerXPercent}
          pointerYPercent={pointerYPercent}
          onLaunched={handlePartLaunched}
        />
      ))}
    </div>
  );
}
