"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useSyncExternalStore } from "react";
import { getServerSnapshot, readConsent, subscribe } from "@/lib/consent";

/**
 * Low-Poly-Katzenkopf als handgesetztes Dreiecksnetz (Platzhalter-Artwork,
 * bis echte Meshy/Tripo-Renderings verfügbar sind).
 *
 * Bewusst übertriebene "Puzzle-Montage"-Animation auf Nutzerwunsch: Die
 * Facetten starten weit verstreut und rotiert und fügen sich beim
 * Herunterscrollen ODER beim Bewegen der Maus (jeweils allein schon
 * ausreichend) zum soliden Kopf zusammen.
 *
 * Montage startet erst NACH der Cookie-Consent-Entscheidung (siehe
 * src/lib/consent.ts) - vorher bleibt die Katze eingefroren im verstreuten
 * Ausgangszustand (Grundeinstellung beim Laden), egal wie viel Maus bewegt
 * wird. Jede Facette hat außerdem ihr eigenes, geseedetes Zeitfenster
 * innerhalb der Gesamt-Montage (statt dass alle synchron denselben
 * Fortschritt abbilden) plus einen seitlichen Schwebe-Versatz und
 * zusätzliches Trudeln während des Flugs - dadurch wirkt die Montage
 * unregelmäßig, wie herabfallende Blätter/Federn, die sich nach und nach zur
 * Katze zusammenfügen, statt dass alle Teile synchron geradlinig einfliegen.
 *
 * Sobald die Montage komplett abgeschlossen ist, passiert zweierlei: (1) die
 * dunklen Facetten-Umrandungen blenden aus - die Katze wirkt dann wie ein
 * durchgehend verschweisstes Stueck statt einzelner Dreiecke ("wasserdicht"),
 * (2) der gesamte Kopf bekommt eine sanfte 3D-Neigung (Perspective-Tilt),
 * die der Mausposition folgt - wirkt wie ein Blick, der der Maus folgt.
 * Dieses Muster (Montage -> Verschweissen -> Blick-Tilt) ist die Vorlage fuer
 * kuenftige Slides mit anderen Motiven.
 *
 * Montage ist absichtlich EINWEG (Ratchet, siehe `settled` unten): Ein
 * typischer Nutzer bewegt die Maus von der Adressleiste kommend zu einem
 * "Jetzt gestalten"-Button - bis die Maus dort ankommt, soll die Katze
 * bereits fertig montiert sein UND SO BLEIBEN (nur noch die leichte
 * Mausparallaxe obendrauf, kein Zurückfallen in den zerstreuten Zustand,
 * auch wenn sich die Maus danach nicht mehr bewegt oder man zurückscrollt).
 * Scroll-Montage ist bewusst kurz bemessen, damit sie beim normalen
 * Scroll-Tempo sicher abgeschlossen ist, bevor die Katze aus dem
 * Sichtbereich scrollt.
 *
 * WICHTIG: Wenn dieses Muster später für HAWK wiederverwendet wird, sollen
 * laut Absprache die Distanzen/Rotationen deutlich reduziert werden (siehe
 * SCATTER_DISTANCE/SCATTER_ROTATION unten) - hier ist es absichtlich groß.
 */

type Tone = "steel" | "steelLight" | "bronze";
type FacetDef = { points: string; tone: Tone };

const FACETS: FacetDef[] = [
  { points: "35,5 75,70 10,85", tone: "steel" },
  { points: "205,5 165,70 230,85", tone: "steel" },
  { points: "75,70 120,90 10,85", tone: "steelLight" },
  { points: "165,70 120,90 230,85", tone: "steelLight" },
  { points: "75,70 120,90 165,70", tone: "bronze" },
  { points: "10,85 120,90 60,150", tone: "steel" },
  { points: "10,85 60,150 5,165", tone: "steelLight" },
  { points: "230,85 120,90 180,150", tone: "steel" },
  { points: "230,85 180,150 235,165", tone: "steelLight" },
  { points: "120,90 60,150 120,140", tone: "bronze" },
  { points: "120,90 180,150 120,140", tone: "steelLight" },
  { points: "60,150 120,140 55,210", tone: "steel" },
  { points: "120,140 120,250 55,210", tone: "steelLight" },
  { points: "180,150 120,140 185,210", tone: "steel" },
  { points: "120,140 185,210 120,250", tone: "bronze" },
  { points: "5,165 60,150 55,210", tone: "steelLight" },
  { points: "235,165 180,150 185,210", tone: "steel" },
];

const TONE_FILL: Record<Tone, string> = {
  steel: "#7d8894",
  steelLight: "#aab4bf",
  bronze: "#c9a961",
};

const CENTER = { x: 120, y: 130 };
// Bezogen auf die viewBox (240x260), skaliert also mit der gerenderten
// Größe - bei der jetzt viel größeren Katze (siehe Hero.tsx: max-w-2xl statt
// vormals max-w-sm) würde der ursprüngliche Wert (340) Facetten weit über
// den sichtbaren Bereich hinaus verstreuen (vor allem im eingefrorenen
// Vor-Consent-Zustand jetzt klar sichtbar/ein Problem, siehe LowPolyCat
// Doku-Kommentar oben - vorher kaum bemerkt, da die Montage meist sofort
// losging).
const SCATTER_DISTANCE = 140;
const SCATTER_ROTATION_DEG = 340;
const SCROLL_ASSEMBLE_PX = 420; // kurz bemessen: muss VOR dem Wegscrollen fertig sein
const MOUSE_ASSEMBLE_PX = 560; // kumulierte Mausbewegung bis zur vollständigen Montage - bewusst hoch fuer ein langsameres, ruhigeres Zusammensetzen

function parsePoints(points: string): [number, number][] {
  return points.split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return [x, y];
  });
}

function centroid(points: [number, number][]): [number, number] {
  const n = points.length;
  const sx = points.reduce((s, p) => s + p[0], 0) / n;
  const sy = points.reduce((s, p) => s + p[1], 0) / n;
  return [sx, sy];
}

/** Deterministischer Pseudo-Zufall - muss zwischen Server- und
 * Client-Render identisch sein (kein Math.random, sonst Hydration-Mismatch
 * bei den statisch vorgerenderten Seiten). */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface FacetProps {
  facet: FacetDef;
  index: number;
  assembleProgress: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  /** Tether-Linie nur im Haupt-Rendering zeigen, nicht in der Spiegelung. */
  showTether?: boolean;
}

function Facet({ facet, index, assembleProgress, pointerX, pointerY, showTether }: FacetProps) {
  const points = parsePoints(facet.points);
  const [cx, cy] = centroid(points);
  const dx = cx - CENTER.x;
  const dy = cy - CENTER.y;
  const distFromCenter = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy, dx) + (seeded(index) - 0.5) * 1.6;
  const magnitude = SCATTER_DISTANCE * (0.65 + seeded(index + 50) * 1.1);

  const scatterX = Math.cos(angle) * magnitude;
  const scatterY = Math.sin(angle) * magnitude;
  const scatterRotate = (seeded(index + 100) - 0.5) * SCATTER_ROTATION_DEG;

  // Eigenes, geseedetes Zeitfenster je Facette innerhalb der Gesamt-Montage
  // (0-1) - manche setzen sich frueh zusammen, andere spaet, alle spaetestens
  // bei Gesamt-Fortschritt 1 fertig. "localArrive" ist der lokale Fortschritt
  // (0 = noch verstreut, 1 = angekommen) INNERHALB dieses Fensters.
  const staggerStart = seeded(index + 200) * 0.5;
  const staggerWidth = 0.35 + seeded(index + 300) * 0.25;
  const staggerEnd = Math.min(1, staggerStart + staggerWidth);
  const localArrive = useTransform(assembleProgress, [staggerStart, staggerEnd], [0, 1]);

  const baseX = useTransform(localArrive, (v) => scatterX * (1 - v));
  const baseY = useTransform(localArrive, (v) => scatterY * (1 - v));
  const baseRotate = useTransform(localArrive, (v) => scatterRotate * (1 - v));

  // Seitlicher Schwebe-Versatz (senkrecht zur Flugrichtung, nicht radial) +
  // zusaetzliches Trudeln waehrend des Flugs - beides exakt 0 an Start UND
  // Ziel (sin(0)=sin(pi)=0), am staerksten in der Flugmitte. Ergibt den
  // "Blatt im Wind"-Effekt statt einer geraden Linie.
  const perpUnitX = -scatterY / magnitude;
  const perpUnitY = scatterX / magnitude;
  const swayAmplitude = (seeded(index + 400) - 0.5) * 70;
  const tumbleAmplitude = (seeded(index + 600) - 0.5) * 90;
  const swayX = useTransform(localArrive, (v) => Math.sin(v * Math.PI) * perpUnitX * swayAmplitude);
  const swayY = useTransform(localArrive, (v) => Math.sin(v * Math.PI) * perpUnitY * swayAmplitude);
  const tumble = useTransform(localArrive, (v) => Math.sin(v * Math.PI) * tumbleAmplitude);
  const rotate = useTransform([baseRotate, tumble], (values: number[]) => values[0] + values[1]);

  // Vor der ersten Montage (noch verstreut) trotzdem sichtbar statt
  // unsichtbar - sonst waere die Katze waehrend der eingefrorenen
  // Vor-Consent-Phase (siehe LowPolyCat weiter unten) komplett unsichtbar.
  const opacity = useTransform(localArrive, [0, 1], [0.55, 1]);

  // "Wasserdicht"/verschweisst sobald komplett montiert: die dunklen
  // Facetten-Umrandungen (Stroke) blenden erst ganz am Ende der
  // GESAMT-Montage aus (nicht pro Facette - sonst waeren manche Nahtstellen
  // schon nahtlos, andere noch mit Rand, waehrend noch montiert wird). Da
  // alle Facetten spaetestens bei Gesamt-Fortschritt 1 exakt ihre
  // Original-Eckpunkte erreichen (kein Versatz/keine Rotation mehr), grenzen
  // benachbarte Facetten dann exakt aneinander - ohne Rand wirkt es wie ein
  // durchgehend verschweisstes Stueck statt einzelner Dreiecke.
  const strokeOpacity = useTransform(assembleProgress, [0.92, 1], [1, 0]);

  // Mausparallaxe pro Facette: waehrend die Katze noch nicht komplett
  // verschweisst ist, wackelt jedes Teil (je nach Abstand zum Zentrum
  // unterschiedlich stark) leicht mit der Maus mit - sobald verschweisst,
  // blendet das aus (parallaxFade), sonst wuerden die unterschiedlichen
  // Versaetze benachbarter Facetten wieder sichtbare Nahtstellen aufreissen.
  // Ab dann uebernimmt die einheitliche Kopf-Neigung (siehe LowPolyCat weiter
  // unten) die "Blick folgt der Maus"-Funktion als EIN zusammenhaengendes
  // Stueck statt einzeln wackelnder Teile.
  const parallaxFade = useTransform(assembleProgress, [0.9, 1], [1, 0]);
  const parallaxStrength = 14 + (distFromCenter / 130) * 20;
  const parallaxX = useTransform(
    [pointerX, parallaxFade],
    (values: number[]) => values[0] * parallaxStrength * values[1]
  );
  const parallaxY = useTransform(
    [pointerY, parallaxFade],
    (values: number[]) => values[0] * parallaxStrength * values[1]
  );
  const x = useTransform(
    [baseX, swayX, parallaxX],
    (values: number[]) => values[0] + values[1] + values[2]
  );
  const y = useTransform(
    [baseY, swayY, parallaxY],
    (values: number[]) => values[0] + values[1] + values[2]
  );

  // "Datentransfer"-Tether: eine leuchtende Linie von der aktuellen
  // Facetten-Position zu ihrem Zielpunkt - sichtbar während der Montage,
  // verschwindet danach wieder (siehe .cat-tether in globals.css für die
  // Strich-Fluss-Animation).
  const x1 = useTransform(x, (v) => cx + v);
  const y1 = useTransform(y, (v) => cy + v);
  const tetherOpacity = useTransform(localArrive, [0, 0.45, 0.85, 1], [0.25, 1, 0.7, 0]);

  return (
    <>
      {showTether && (
        <motion.line
          x1={x1}
          y1={y1}
          x2={cx}
          y2={cy}
          className="cat-tether"
          stroke="#5fd4ff"
          strokeWidth={0.6}
          style={{ opacity: tetherOpacity, filter: "drop-shadow(0 0 3px #5fd4ff)" }}
        />
      )}
      <motion.polygon
        points={facet.points}
        fill={TONE_FILL[facet.tone]}
        stroke="#0a0a0c"
        strokeWidth={0.75}
        style={{ x, y, rotate, opacity, strokeOpacity, transformOrigin: `${cx}px ${cy}px` }}
      />
    </>
  );
}

export function LowPolyCat({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  // Montage darf erst nach der Cookie-Consent-Entscheidung starten (egal ob
  // "Zustimmen" oder "Ablehnen") - vorher bleibt die Katze eingefroren im
  // verstreuten Ausgangszustand, siehe Gating unten.
  const consent = useSyncExternalStore(subscribe, readConsent, getServerSnapshot);
  const consentResolved = consent !== "unknown";

  const { scrollY } = useScroll();
  // Instantaner Montage-Anteil aus der Scroll-Position (folgt dem Scroll
  // direkt, kann also rein rechnerisch auch wieder sinken).
  const scrollAssemble = useTransform(scrollY, [0, SCROLL_ASSEMBLE_PX], [0, 1]);
  // Kumulierte Mausbewegung seit dem Laden der Seite - wird NIE
  // zurückgesetzt, nur mehr. Schon eine normale Bewegung von der
  // Adressleiste zu einem Button reicht deutlich aus.
  const mouseTravel = useMotionValue(0);
  const mouseAssemble = useTransform(mouseTravel, [0, MOUSE_ASSEMBLE_PX], [0, 1]);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  // Ratchet: hält den jeweils höchsten je erreichten Montage-Stand fest,
  // damit die Katze nach vollständiger Montage nicht wieder auseinanderfällt
  // (weder durch Zurückscrollen noch weil sich die Maus nicht mehr bewegt).
  const settled = useMotionValue(0);
  useAnimationFrame(() => {
    if (prefersReducedMotion || !consentResolved) return;
    const current = Math.max(scrollAssemble.get(), mouseAssemble.get());
    if (current > settled.get()) settled.set(current);
  });

  useEffect(() => {
    if (prefersReducedMotion || !consentResolved) return;
    let last: { x: number; y: number } | null = null;

    function handlePointerMove(e: PointerEvent) {
      pointerX.set(e.clientX / window.innerWidth - 0.5);
      pointerY.set(e.clientY / window.innerHeight - 0.5);
      if (last) {
        const delta = Math.hypot(e.clientX - last.x, e.clientY - last.y);
        mouseTravel.set(mouseTravel.get() + delta);
      }
      last = { x: e.clientX, y: e.clientY };
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [prefersReducedMotion, consentResolved, pointerX, pointerY, mouseTravel]);

  // "Blick folgt der Maus": sanfte 3D-Neigung des GESAMTEN Kopfes Richtung
  // Zeiger (nicht nur die per-Facette-Mausparallaxe von oben) - wacht erst
  // gegen Ende der Montage auf (tiltActive 0->1), damit es waehrend des
  // Zusammenfliegens nicht mit der Flugbewegung konkurriert.
  const tiltActive = useTransform(settled, [0.88, 1], [0, 1]);
  const rotateY = useTransform(
    [pointerX, tiltActive],
    (values: number[]) => values[0] * 22 * values[1]
  );
  const rotateX = useTransform(
    [pointerY, tiltActive],
    (values: number[]) => -values[0] * 14 * values[1]
  );

  if (prefersReducedMotion) {
    return (
      <svg
        viewBox="0 0 240 260"
        className={className}
        role="img"
        aria-label="Low-Poly-Illustration eines Katzenkopfs aus facettierten Dreiecken"
      >
        {FACETS.map((facet, i) => (
          <polygon
            key={i}
            points={facet.points}
            fill={TONE_FILL[facet.tone]}
            stroke="#0a0a0c"
            strokeWidth={0.75}
          />
        ))}
      </svg>
    );
  }

  return (
    <div className="relative" style={{ perspective: 900 }}>
      <motion.div
        className="relative"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        {/* Pulsierender blauer Umgebungs-Glow - "Hightech"-Atmosphäre hinter
            der Katze, per CSS animiert (siehe .cat-glow-pulse). */}
        <div
          aria-hidden
          className="cat-glow-pulse pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(closest-side, rgba(95,212,255,0.5), rgba(95,212,255,0.12) 55%, transparent 75%)",
            filter: "blur(28px)",
          }}
        />

        <svg
          viewBox="0 0 240 260"
          className={className}
          style={{ overflow: "visible", position: "relative" }}
          role="img"
          aria-label="Low-Poly-Illustration eines Katzenkopfs aus facettierten Dreiecken, die sich beim Scrollen oder bei Mausbewegung zusammensetzt und dann der Maus folgt"
        >
          {FACETS.map((facet, i) => (
            <Facet
              key={i}
              facet={facet}
              index={i}
              assembleProgress={settled}
              pointerX={pointerX}
              pointerY={pointerY}
              showTether
            />
          ))}
        </svg>

        {/* Spiegelung darunter - klassischer "Produktshot"-Effekt, per
            Verlaufsmaske ausgeblendet. Nutzt dieselben MotionValues wie oben,
            bleibt also automatisch synchron. Absolut positioniert (statt im
            normalen Fluss), damit sie keinen eigenen Layout-Platz beansprucht -
            sonst verdoppelt sie faktisch die Höhe der Katzen-Spalte, was bei
            der groß dimensionierten Katze den Vollbild-Hero sprengen würde. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-full mt-1 w-full opacity-25"
          style={{
            transform: "scaleY(-1)",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 65%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 65%)",
          }}
        >
          <svg viewBox="0 0 240 260" style={{ overflow: "visible", display: "block", width: "100%" }}>
            {FACETS.map((facet, i) => (
              <Facet
                key={i}
                facet={facet}
                index={i}
                assembleProgress={settled}
                pointerX={pointerX}
                pointerY={pointerY}
              />
            ))}
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
