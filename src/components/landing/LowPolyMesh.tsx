"use client";

import { motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";

/**
 * Low-Poly-Motiv als handgesetztes Dreiecksnetz (Platzhalter-Artwork, bis
 * echte Meshy/Tripo-Renderings verfügbar sind) - generalisiert aus der
 * urspünglich katzenspezifischen Komponente, damit dasselbe Muster für
 * beliebige Motive (Katze, Person, Nachttisch, Kaktus, ...) wiederverwendbar
 * ist (siehe HeroCarousel.tsx).
 *
 * Ablauf: Facetten starten weit verstreut/rotiert, fügen sich zusammen
 * (gesteuert über die von außen übergebene `progress`-MotionValue, 0 =
 * verstreut, 1 = fertig), jede Facette mit eigenem geseedeten Zeitfenster
 * plus seitlichem Schwebe-Versatz und Trudeln ("Blatt im Wind" statt gerader
 * Linie). Sobald komplett montiert: Facetten-Umrandungen blenden aus (wirkt
 * verschweißt/wasserdicht), danach neigt sich der gesamte Kopf sanft der
 * Mausposition entgegen (wie ein Blick, der der Maus folgt).
 *
 * `progress` ist bewusst ein Prop (keine interne Scroll/Maus-Logik mehr) -
 * dadurch kann eine übergeordnete Komponente (HeroCarousel) sowohl die
 * organische Erstmontage (Maus/Scroll) als auch programmatische
 * Sprengen/Neu-Aufbau-Übergänge beim Slide-Wechsel steuern, indem sie
 * denselben Wert einfach in die andere Richtung animiert - da `progress`
 * rein aus dem aktuellen Zahlenwert abgeleitet wird (keine Richtungslogik),
 * läuft eine Rückwärts-Animation (1→0) automatisch wie die Montage
 * rückwärts ab, ganz ohne Sonderfall-Code hier.
 *
 * WICHTIG: Wenn dieses Muster für andere Kontexte (z.B. HAWK) wiederverwendet
 * wird, sollen laut Absprache die Distanzen/Rotationen deutlich reduziert
 * werden (siehe `scatterDistance`/SCATTER_ROTATION_DEG) - hier bewusst groß.
 */

export type Tone = "steel" | "steelLight" | "bronze";
export type FacetDef = { points: string; tone: Tone };

const TONE_FILL: Record<Tone, string> = {
  steel: "#7d8894",
  steelLight: "#aab4bf",
  bronze: "#c9a961",
};

const SCATTER_ROTATION_DEG = 340;

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
  center: { x: number; y: number };
  scatterDistance: number;
  progress: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  /** Tether-Linie nur im Haupt-Rendering zeigen, nicht in der Spiegelung. */
  showTether?: boolean;
}

function Facet({ facet, index, center, scatterDistance, progress, pointerX, pointerY, showTether }: FacetProps) {
  const points = parsePoints(facet.points);
  const [cx, cy] = centroid(points);
  const dx = cx - center.x;
  const dy = cy - center.y;
  const distFromCenter = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy, dx) + (seeded(index) - 0.5) * 1.6;
  const magnitude = scatterDistance * (0.65 + seeded(index + 50) * 1.1);

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
  const localArrive = useTransform(progress, [staggerStart, staggerEnd], [0, 1]);

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
  // unsichtbar - sonst waere das Motiv waehrend einer eingefrorenen
  // Wartephase (z.B. Vor-Consent) komplett unsichtbar.
  const opacity = useTransform(localArrive, [0, 1], [0.55, 1]);

  // "Wasserdicht"/verschweisst sobald komplett montiert: die dunklen
  // Facetten-Umrandungen (Stroke) blenden erst ganz am Ende der
  // GESAMT-Montage aus (nicht pro Facette - sonst waeren manche Nahtstellen
  // schon nahtlos, andere noch mit Rand, waehrend noch montiert wird). Da
  // alle Facetten spaetestens bei Gesamt-Fortschritt 1 exakt ihre
  // Original-Eckpunkte erreichen (kein Versatz/keine Rotation mehr), grenzen
  // benachbarte Facetten dann exakt aneinander - ohne Rand wirkt es wie ein
  // durchgehend verschweisstes Stueck statt einzelner Dreiecke.
  const strokeOpacity = useTransform(progress, [0.92, 1], [1, 0]);

  // Mausparallaxe pro Facette: waehrend das Motiv noch nicht komplett
  // verschweisst ist, wackelt jedes Teil (je nach Abstand zum Zentrum
  // unterschiedlich stark) leicht mit der Maus mit - sobald verschweisst,
  // blendet das aus (parallaxFade), sonst wuerden die unterschiedlichen
  // Versaetze benachbarter Facetten wieder sichtbare Nahtstellen aufreissen.
  // Ab dann uebernimmt die einheitliche Kopf-/Objekt-Neigung (siehe
  // LowPolyMesh weiter unten) die "Blick folgt der Maus"-Funktion als EIN
  // zusammenhaengendes Stueck statt einzeln wackelnder Teile.
  const parallaxFade = useTransform(progress, [0.9, 1], [1, 0]);
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

export interface LowPolyMeshProps {
  facets: FacetDef[];
  viewBox: string;
  center: { x: number; y: number };
  /** Streuradius in denselben Einheiten wie die viewBox - Default passt zur
   * Katze (240x260-viewBox, groß dimensionierte Darstellung im Hero). */
  scatterDistance?: number;
  className?: string;
  progress: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  ariaLabel: string;
}

export function LowPolyMesh({
  facets,
  viewBox,
  center,
  scatterDistance = 140,
  className,
  progress,
  pointerX,
  pointerY,
  ariaLabel,
}: LowPolyMeshProps) {
  const prefersReducedMotion = useReducedMotion();

  // "Blick folgt der Maus": sanfte 3D-Neigung des GESAMTEN Motivs Richtung
  // Zeiger (nicht nur die per-Facette-Mausparallaxe von oben) - wacht erst
  // gegen Ende der Montage auf (tiltActive 0->1), damit es waehrend des
  // Zusammenfliegens nicht mit der Flugbewegung konkurriert.
  const tiltActive = useTransform(progress, [0.88, 1], [0, 1]);
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
      <svg viewBox={viewBox} className={className} role="img" aria-label={ariaLabel}>
        {facets.map((facet, i) => (
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
      <motion.div className="relative" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
        {/* Pulsierender blauer Umgebungs-Glow - "Hightech"-Atmosphäre hinter
            dem Motiv, per CSS animiert (siehe .cat-glow-pulse). */}
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
          viewBox={viewBox}
          className={className}
          style={{ overflow: "visible", position: "relative" }}
          role="img"
          aria-label={ariaLabel}
        >
          {facets.map((facet, i) => (
            <Facet
              key={i}
              facet={facet}
              index={i}
              center={center}
              scatterDistance={scatterDistance}
              progress={progress}
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
            sonst verdoppelt sie faktisch die Höhe der Motiv-Spalte. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-full mt-1 w-full opacity-25"
          style={{
            transform: "scaleY(-1)",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 65%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 65%)",
          }}
        >
          <svg viewBox={viewBox} style={{ overflow: "visible", display: "block", width: "100%" }}>
            {facets.map((facet, i) => (
              <Facet
                key={i}
                facet={facet}
                index={i}
                center={center}
                scatterDistance={scatterDistance}
                progress={progress}
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
