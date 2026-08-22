"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";

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
 * `chaosEnabled` (ab der ersten jemals ausgelösten Sprengung dauerhaft an,
 * siehe HeroCarousel.tsx) schaltet zusätzlich frei: einen viel größeren
 * Streuradius (`CHAOS_SCATTER_DISTANCE` statt `scatterDistance`) UND ein
 * dauerhaftes, zeitbasiertes Umhertreiben im Ruhezustand ("Blatt/Feder im
 * Wind" statt Stillstand) - blendet sich weich aus, sobald echter,
 * mausgesteuerter Zusammenbau beginnt. Der Radius-Wechsel passiert bewusst
 * GENAU beim Start einer Sprengung (progress steht dann noch bei 1, wo die
 * Radius-Änderung mathematisch wirkungslos ist) - kein sichtbarer Sprung,
 * die Teile fliegen beim Sprengen selbst schon zur neuen, weiten Position.
 *
 * Das Treiben besteht aus zwei Schichten: (1) eine INDIVIDUELLE, pro
 * Facette geseedete Wanderung (wandernder Winkel statt fixer Sinus-Achsen -
 * siehe dortiger Kommentar) und (2) ein GEMEINSAMER, allen Facetten
 * gemeinsamer "Bö"-Puls (gleiche Basis-Frequenz, nur mit einem winzigen,
 * vom Abstand zum Zentrum abhängigen Phasenversatz) - dadurch surren nicht
 * 19 komplett unabhängige Teilchen umher, sondern die Gruppe "atmet"
 * gemeinsam wie ein Vogel-/Fischschwarm, während jedes einzelne Teil
 * trotzdem sein eigenes Blatt-im-Wind-Wandern behält. `chaosStartTime`
 * (Uhr-Wert bei Sprengen-Ende, siehe HeroCarousel.tsx) blendet das Treiben
 * über ~1,2s weich ein statt es im selben Frame mit voller Stärke zu
 * starten, in dem die Flugbewegung endet - vermeidet einen kleinen, aber
 * sichtbaren Knick in der Bewegungsrichtung genau am Übergang.
 *
 * Statt der früheren blauen "Datentransfer"-Linie zeigt jede Facette
 * während sie nicht verschweißt ist eine schimmernde Kantenkontur (wie
 * Glas-/Metallscherben, die Licht einfangen) - Helligkeit ist an die
 * aktuelle Rotation gekoppelt (glänzt auf, wenn die Facette gerade
 * "richtig zum Licht steht") plus ein schnelles, feines Funkeln obendrauf.
 * Erlischt beim Verschweißen zusammen mit dem normalen Rand (strokeOpacity).
 *
 * WICHTIG: Wenn dieses Muster für andere Kontexte (z.B. HAWK) wiederverwendet
 * wird, sollen laut Absprache die Distanzen/Rotationen deutlich reduziert
 * werden (siehe `scatterDistance`/SCATTER_ROTATION_DEG) - hier bewusst groß.
 *
 * Optionaler `imageUrl`-Modus ("Scherben-Foto"): statt jede Facette flach
 * einzufärben, wird sie zum ausgeschnittenen Fragment eines hochaufgelösten
 * Fotos (SVG `<clipPath>` je Facette + ein gemeinsames `<image>` dahinter) -
 * exakt dieselbe Flug-/Treib-/Verschweiß-Physik wie oben, nur die
 * RENDERING-Ebene ändert sich. Sobald alle Fragmente an ihrer Zielposition
 * ankommen, ergeben sie wieder das vollständige, scharfe Originalfoto -
 * löst das Erkennbarkeits-Problem der rein handgezeichneten Facetten.
 *
 * Treib-Feinschliff ("Blätter im Wind / fallende Federn / Vogel-/
 * Fischschwarm"): zusätzlich zum individuellen Wander-Winkel und dem
 * gemeinsamen "Bö"-Puls (beide oben beschrieben) gibt es drei weitere,
 * additive Schichten - (1) lose "Schwarm"-Grüppchen (3 Gruppen, nur die
 * dominante Wanderwellen-Phase teilweise geteilt statt komplett individuell
 * - kleine, gemeinsam schwingende Trupps statt eines uniformen Schwarms),
 * (2) eine gemeinsame, langsam wandernde "Reise-Richtung" für ALLE Facetten
 * gleichzeitig (kein Index-Seed - echtes gemeinsames Ziehen wie ein
 * Vogelschwarm, on top vom individuellen Wandern jeder einzelnen Facette),
 * (3) ein leichter, meist nach unten gerichteter Sink-Bias ("fallende
 * Feder") plus an die Wanderrichtung gekoppeltes Trudeln (Rotation "rockt"
 * sichtbar mit, statt zeitlich unabhängig zu drehen).
 */

export type Tone = "steel" | "steelLight" | "bronze" | "messing";
export type FacetDef = { points: string; tone: Tone };

// Warme Gunmetal-/Bronze-Palette, aus dem echten Katzen-Foto (Pixel-Cluster-
// Analyse der freigestellten Skulptur) abgeleitet statt einer generischen
// CG-Platzhalterfarbe - ersetzt die frühere, kühlere Blaugrau-Palette, damit
// die noch flach eingefärbten Motive (Person/Nachttisch/Kaktus) zum selben
// Material wie das fotobasierte Katzenmotiv passen. `messing` entspricht
// exakt dem echten Shop-Katalog-Wert (src/lib/catalog.ts, MATERIALS
// "messing", #c9a961) - fuer Motive, die komplett EINFARBIG (eine einzige
// Wunschfarbe fuer alle Facetten) statt in der gemischten Steel/Bronze-
// Platzhalterpalette gezeigt werden sollen.
const TONE_FILL: Record<Tone, string> = {
  steel: "#5f574e",
  steelLight: "#cfd0d6",
  bronze: "#a68a63",
  messing: "#c9a961",
};

// Hell-/Dunkel-Randwerte je Ton für einen dezenten Verlauf pro Facette (siehe
// ToneGradients weiter unten) - simuliert die reflektierende Oberfläche von
// echtem geschweisstem Stahl statt einer komplett flachen Farbfläche.
const TONE_GRADIENT_STOPS: Record<Tone, { light: string; dark: string }> = {
  steel: { light: "#928d87", dark: "#3f3933" },
  steelLight: { light: "#dedfe3", dark: "#89898d" },
  bronze: { light: "#c2af95", dark: "#6e5b41" },
  messing: { light: "#dac594", dark: "#857040" },
};

// Warmer, dunkler Nahtstellen-Ton statt neutralem Schwarz - aus den
// dunkelsten Schattenbereichen desselben Fotos abgeleitet, wirkt zusammen
// mit der neuen Palette stimmiger als reines #0a0a0c.
const SEAM_STROKE = "#1c1512";

/** Gemeinsame Verlaufs-Definitionen für alle drei Toene - einmal im Dokument
 * gerendert (SVG-Gradient-IDs sind dokumentweit eindeutig referenzierbar,
 * auch aus einem anderen <svg>-Geschwisterelement wie der Spiegelung
 * darunter), von jeder Facette per `fill="url(#grad-<tone>)"` genutzt. Ohne
 * `gradientUnits` (Default: objectBoundingBox) bekommt JEDE Facette
 * automatisch ihren eigenen 0-100%-Verlauf ueber die eigene Bounding-Box,
 * ganz ohne facettenspezifische Koordinaten. */
function ToneGradients() {
  return (
    <defs>
      {(Object.keys(TONE_FILL) as Tone[]).map((tone) => (
        <linearGradient key={tone} id={`grad-${tone}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={TONE_GRADIENT_STOPS[tone].light} />
          <stop offset="55%" stopColor={TONE_FILL[tone]} />
          <stop offset="100%" stopColor={TONE_GRADIENT_STOPS[tone].dark} />
        </linearGradient>
      ))}
    </defs>
  );
}

/** Foto-Einfaerbe-Filter ("Wunschfarbe live am Foto"): entsaettigt das Foto
 * zu reiner Helligkeit und faerbt es per Duoton (dunkler/heller Endpunkt UND
 * exakter Mittelpunkt der `tintColor`, 3-Punkt-Tabelle statt nur 2, damit der
 * Mittelton wirklich exakt der gewaehlten Farbe entspricht) neu ein - Fotodetail
 * (Facetten-Schattierung, Textur) bleibt dabei vollstaendig erhalten, nur der
 * Farbton wechselt. Einmal im Dokument gerendert, dokumentweit referenzierbar
 * (siehe ToneGradients-Kommentar) - Endpunkte werden aus der uebergebenen
 * Hex-Farbe zur Laufzeit berechnet (shadeHex), nicht hart codiert, damit jedes
 * Motiv seine eigene Wunschfarbe bekommen kann. */
function PhotoTintFilter({
  color,
  darkMix = 0.28,
  lightMix = 0.78,
  id = "photo-tint",
}: {
  color: string;
  /** Wie weit der dunkle/helle Duoton-Endpunkt Richtung Schwarz/Weiss
   * gemischt wird (0-1). Defaults 0.28/0.78 - gelockert gegenueber den
   * urspruenglichen 0.68/0.62, weil das bei dunklen/kuehlen Wunschfarben
   * (Anthrazit, Rohstahl) Schattenbereiche fast auf Bildschirm-Schwarz
   * gedrueckt und das Motiv vor dem dunklen Hero-Hintergrund kaum noch
   * erkennbar gemacht hat. Die Katze (Kupfer) nutzt bewusst wieder die
   * alten, kontrastreicheren Werte (siehe heroSlides.ts) - das war beim
   * urspruenglichen Kontrast schon gut lesbar, die Aufhellung war fuer
   * sie nicht noetig. */
  darkMix?: number;
  lightMix?: number;
  /** SVG-ID des Filters (dokumentweit eindeutig, siehe LowPolyMeshProps) -
   * noetig, wenn zwei Instanzen gleichzeitig im Dokument haengen. */
  id?: string;
}) {
  const dark = shadeHex(color, -darkMix);
  const mid = hexToRgb(color);
  const light = shadeHex(color, lightMix);
  const table = (i: 0 | 1 | 2) =>
    [dark[i] / 255, mid[i] / 255, light[i] / 255].join(" ");
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncR type="table" tableValues={table(0)} />
        <feFuncG type="table" tableValues={table(1)} />
        <feFuncB type="table" tableValues={table(2)} />
      </feComponentTransfer>
    </filter>
  );
}

const SCATTER_ROTATION_DEG = 340;
// Deutlich groesser als der normale Streuradius - ab der ersten Sprengung
// verteilen sich die Teile damit ueber weite Teile des Bildschirms statt
// nur nahe am Motiv (siehe chaosEnabled-Erklaerung oben).
const CHAOS_SCATTER_DISTANCE = 195;

// Referenz-Breite fuer die GEMEINSAME Chaos-Quelle: Der Chaos-Streuradius
// oben ist in viewBox-Einheiten gerechnet, und jede Slide hat eine andere
// viewBox (Katze 240 breit vs. Hocker ~880) - derselbe Radius bedeutet pro
// Motiv einen voellig anderen Abstand am Bildschirm, weshalb jeder
// Slide-Wechsel bislang wie ein NEUES, fremdes Teile-Chaos wirkte. Die
// Loesung: der Radius wird pro Motiv mit dem Faktor viewBoxBreite/240
// skaliert - kalibriert auf die Katze, d.h. die Katze behaelt EXAKT ihre
// bisherige Streuung (Faktor 1), alle anderen Motive streuen ab jetzt
// genauso weit WIE DIE KATZE. Alle vier Slides teilen sich damit dieselben
// Slot-Positionen (die Seeds sind ohnehin slide-unabhaengig) - es gibt nur
// noch EINE Quelle, aus der sich jedes Motiv zusammenbaut. Bewusst werden
// NUR Wolken-Groessenwerte skaliert (Streuradius, Drift-Radius,
// Schwarm-Versatz, Fall-Bias) - ssaemtliche Flugbahn-Formeln (Winkel,
// Stagger, Sway, Tumble, Rotationen) bleiben unangetastet.
const SHARED_CHAOS_REFERENCE_WIDTH = 240;
// Die Hero-Buehne ist in HeroCarousel.tsx fest 4:5. Bei hohen Motiven wird
// die SVG deshalb ueber ihre Hoehe statt ihre Breite in die Buehne
// eingepasst. Diese Ratio macht die Chaos-Einheit zu einer echten
// Screen-Space-Einheit fuer beide Aspect-Ratio-Faelle.
const HERO_STAGE_ASPECT_RATIO = 4 / 5;
// Sanfte Referenzen fuer visuelle Masse und Dichte. Die realen Facetten
// bleiben primaer; Scale/Opacity daempfen nur die groessten Unterschiede.
const SHARED_CHAOS_CORE_SLOT_COUNT = 20;
const SHARED_CHAOS_REFERENCE_FACET_AREA = 1400;
const SHARED_CHAOS_REFERENCE_FACET_EXTENT = 110;

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

function polygonArea(points: [number, number][]): number {
  return Math.abs(
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0) / 2
  );
}

function parseViewBoxSize(viewBox: string): { width: number; height: number } {
  const parts = viewBox.split(/\s+/).map(Number);
  return { width: parts[2] ?? 240, height: parts[3] ?? 260 };
}

/** Deterministischer Pseudo-Zufall - muss zwischen Server- und
 * Client-Render identisch sein (kein Math.random, sonst Hydration-Mismatch
 * bei den statisch vorgerenderten Seiten). */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function facetArrivalWindow(index: number): { start: number; end: number } {
  const start = seeded(index + 200) * 0.5;
  const width = 0.35 + seeded(index + 300) * 0.25;
  return { start, end: Math.min(1, start + width) };
}

function sharedChaosSlot(index: number): { x: number; y: number; depth: number } {
  const angle = seeded(index + 1020) * Math.PI * 2;
  const depth = 0.84 + seeded(index + 970) * 0.32;
  const magnitude = (0.65 + seeded(index + 50) * 1.1) * (0.94 + depth * 0.06);
  return {
    x: Math.cos(angle) * magnitude * 1.65,
    y: Math.sin(angle) * magnitude * 0.7,
    depth,
  };
}

// Der Mittelwert der 20 primaeren Slots wird einmal motivunabhaengig
// entfernt. So liegt das gemeinsame KERNFELD wirklich auf der Buehnenmitte,
// statt durch eine zufaellige endliche Seed-Stichprobe leicht zu driften.
const SHARED_CHAOS_CORE_BIAS = Array.from(
  { length: SHARED_CHAOS_CORE_SLOT_COUNT },
  (_, index) => sharedChaosSlot(index)
).reduce(
  (sum, slot) => ({
    x: sum.x + slot.x / SHARED_CHAOS_CORE_SLOT_COUNT,
    y: sum.y + slot.y / SHARED_CHAOS_CORE_SLOT_COUNT,
  }),
  { x: 0, y: 0 }
);

type WeldDepthLayer = "back" | "mid" | "front";

interface WeldJunctionCandidate {
  x: number;
  y: number;
  count: number;
  connectionProgress: number;
  neighbors: { x: number; y: number; count: number }[];
}

interface WeldJunction {
  x: number;
  y: number;
  count: number;
  connectionProgress: number;
  seamEnd: { x: number; y: number };
}

interface WeldingEventBlueprint {
  startProgress: number;
  endProgress: number;
  intensity: number;
  depthLayer: WeldDepthLayer;
  sparkCount: number;
  heatStrength: number;
  anchor: { x: number; y: number };
}

interface WeldingEvent extends WeldingEventBlueprint {
  id: number;
  junction: WeldJunction;
}

interface WeldSparkGeometry {
  dx: number;
  dy: number;
  curveX: number;
  curveY: number;
}

// Eine gemeinsame Bibliothek kurzer Funkenbahnen. Ein Event waehlt nur die
// benoetigte Anzahl und dreht/skaliert sie deterministisch - kleine
// Strukturkontakte erzeugen dadurch nicht denselben vollen Fuenfer-Satz wie
// der finale Verschluss.
const WELD_SPARK_PATHS: WeldSparkGeometry[] = [
  { dx: -38, dy: 31, curveX: -8, curveY: -30 },
  { dx: 29, dy: 42, curveX: 9, curveY: -25 },
  { dx: -24, dy: 49, curveX: -13, curveY: -20 },
  { dx: 44, dy: 25, curveX: 16, curveY: -35 },
  { dx: 14, dy: 57, curveX: 4, curveY: -27 },
  { dx: -49, dy: 18, curveX: -18, curveY: -31 },
  { dx: 37, dy: 52, curveX: 12, curveY: -20 },
];

// Die Zeitachse bleibt progress-getrieben. Die Luecken zwischen den
// Fenstern sind bewusst: Ausrichtung und Setzen der Platten bleibt sichtbar,
// statt dass das Motiv dauerhaft flackert. Nicht jedes Motiv nutzt alle
// sechs Blueprints (siehe buildWeldingEvents).
const WELD_EVENT_BLUEPRINTS: WeldingEventBlueprint[] = [
  {
    startProgress: 0.67,
    endProgress: 0.73,
    intensity: 0.46,
    depthLayer: "back",
    sparkCount: 1,
    heatStrength: 0.38,
    anchor: { x: 0.28, y: 0.72 },
  },
  {
    startProgress: 0.755,
    endProgress: 0.803,
    intensity: 0.72,
    depthLayer: "mid",
    sparkCount: 3,
    heatStrength: 0.62,
    anchor: { x: 0.72, y: 0.68 },
  },
  {
    startProgress: 0.812,
    endProgress: 0.85,
    intensity: 0.5,
    depthLayer: "back",
    sparkCount: 2,
    heatStrength: 0.46,
    anchor: { x: 0.25, y: 0.4 },
  },
  {
    startProgress: 0.858,
    endProgress: 0.895,
    intensity: 0.68,
    depthLayer: "mid",
    sparkCount: 3,
    heatStrength: 0.58,
    anchor: { x: 0.74, y: 0.36 },
  },
  {
    startProgress: 0.903,
    endProgress: 0.938,
    intensity: 0.82,
    depthLayer: "front",
    sparkCount: 4,
    heatStrength: 0.78,
    anchor: { x: 0.45, y: 0.54 },
  },
  {
    startProgress: 0.947,
    endProgress: 0.98,
    intensity: 1,
    depthLayer: "front",
    sparkCount: 5,
    heatStrength: 1,
    anchor: { x: 0.56, y: 0.48 },
  },
];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothStep(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function weldArcStrength(value: number, event: WeldingEvent): number {
  if (value < event.startProgress || value > event.endProgress) return 0;
  const local = (value - event.startProgress) / (event.endProgress - event.startProgress);
  const envelope = smoothStep(local / 0.16) * smoothStep((1 - local) / 0.22);
  const flicker = 0.68 + 0.32 * Math.abs(Math.sin((local * 4.4 + event.id * 0.37) * Math.PI));
  return envelope * flicker * event.intensity;
}

function weldLightStrength(value: number, event: WeldingEvent): number {
  if (value < event.startProgress - 0.006 || value > event.endProgress + 0.012) return 0;
  const local = clamp01(
    (value - (event.startProgress - 0.006)) /
      (event.endProgress - event.startProgress + 0.018)
  );
  return Math.sin(local * Math.PI) ** 0.72 * event.intensity;
}

function dominantWeldingEvent(value: number, events: WeldingEvent[]): WeldingEvent | undefined {
  return events.reduce<{ event?: WeldingEvent; strength: number }>(
    (best, event) => {
      const strength = weldLightStrength(value, event);
      return strength > best.strength ? { event, strength } : best;
    },
    { strength: 0 }
  ).event;
}

/** Sammelt reale gemeinsame Polygonknoten samt echter Nachbarkanten und
 * waehlt daraus per Farthest-Point-Sampling eine kleine, ueber die sichtbare
 * Skulptur verteilte Menge. Dreifach oder staerker geteilte Knoten werden
 * bevorzugt; bei den grob getraceten Hocker-/Kaktusnetzen duerfen zusaetzlich
 * echte, von zwei Facetten geteilte Kantenenden die raeumliche Verteilung
 * sichern. */
function findWeldJunctions(
  facets: FacetDef[],
  center: { x: number; y: number },
  viewBoxSize: { width: number; height: number }
): WeldJunctionCandidate[] {
  const nodes = new Map<
    string,
    {
      x: number;
      y: number;
      count: number;
      facetIndices: Set<number>;
      neighbors: Map<string, { x: number; y: number; count: number }>;
    }
  >();

  facets.forEach((facet, facetIndex) => {
    const points = parsePoints(facet.points);
    points.forEach(([x, y], index) => {
      const key = `${x},${y}`;
      const node = nodes.get(key) ?? {
        x,
        y,
        count: 0,
        facetIndices: new Set<number>(),
        neighbors: new Map(),
      };
      node.count += 1;
      node.facetIndices.add(facetIndex);
      const adjacent = [points[(index + points.length - 1) % points.length], points[(index + 1) % points.length]];
      adjacent.forEach(([neighborX, neighborY]) => {
        const neighborKey = `${neighborX},${neighborY}`;
        const previous = node.neighbors.get(neighborKey);
        node.neighbors.set(neighborKey, {
          x: neighborX,
          y: neighborY,
          count: (previous?.count ?? 0) + 1,
        });
      });
      nodes.set(key, node);
    });
  });

  const shared = [...nodes.values()]
    .filter((node) => node.count >= 2)
    .map((node) => {
      const arrivalEnds = [...node.facetIndices]
        .map((index) => facetArrivalWindow(index).end)
        .sort((a, b) => a - b);
      return {
        x: node.x,
        y: node.y,
        count: node.count,
        // Der zweite Ankunftswert ist der frueheste reale Kontakt zweier
        // angrenzender Platten. Spaeter eintreffende Facetten koennen an
        // demselben Knoten in einem spaeteren Arbeitsgang schliessen.
        connectionProgress: arrivalEnds[Math.min(1, arrivalEnds.length - 1)],
        neighbors: [...node.neighbors.values()],
      };
    })
    .sort((a, b) => b.count - a.count || a.y - b.y || a.x - b.x);
  if (shared.length === 0) return [];

  const desiredCount = facets.length >= 36 ? 6 : facets.length >= 14 ? 4 : 3;
  const stronglyShared = shared.filter((node) => node.count >= 3);
  const edgeMarginX = viewBoxSize.width * 0.035;
  const edgeMarginY = viewBoxSize.height * 0.035;
  const sparseEdgeMarginX = viewBoxSize.width * 0.01;
  const sparseEdgeMarginY = viewBoxSize.height * 0.01;
  const interiorStronglyShared = stronglyShared.filter(
    (node) =>
      node.x > edgeMarginX &&
      node.x < viewBoxSize.width - edgeMarginX &&
      node.y > edgeMarginY &&
      node.y < viewBoxSize.height - edgeMarginY
  );
  const interiorShared = shared.filter(
    (node) =>
      node.x > sparseEdgeMarginX &&
      node.x < viewBoxSize.width - sparseEdgeMarginX &&
      node.y > sparseEdgeMarginY &&
      node.y < viewBoxSize.height - sparseEdgeMarginY
  );
  // Dichte Netze besitzen genug echte Innenknoten: dort sind zweifach
  // geteilte Aussenrandpunkte kein sinnvoller Schweissort. Bei den bewusst
  // groben Hocker-/Kaktus-Traces bleiben geteilte Kantenenden zulaessig,
  // damit die Fertigung nicht ausschliesslich in einem einzigen Hub sitzt.
  const spatialCandidates =
    facets.length >= 36 && interiorStronglyShared.length >= desiredCount
      ? interiorStronglyShared
      : interiorShared.length >= desiredCount
        ? interiorShared
        : shared;
  const timelyCandidates = spatialCandidates.filter(
    (node) => node.connectionProgress <= 0.93 || node.count >= 3
  );
  const candidates =
    timelyCandidates.length >= desiredCount ? timelyCandidates : spatialCandidates;
  const selectionCount = Math.min(desiredCount, candidates.length);
  const screenExtent = Math.max(
    viewBoxSize.width,
    viewBoxSize.height * HERO_STAGE_ASPECT_RATIO
  );
  const screenDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y) / screenExtent;

  const first = candidates.reduce((best, candidate) => {
    const score = screenDistance(candidate, center) - Math.min(8, candidate.count) * 0.018;
    return score < best.score ? { point: candidate, score } : best;
  }, { point: candidates[0], score: Number.POSITIVE_INFINITY }).point;
  const selected = [first];

  while (selected.length < selectionCount) {
    const remaining = candidates.filter((candidate) => !selected.includes(candidate));
    const next = remaining.reduce((best, candidate) => {
      const spacing = Math.min(...selected.map((point) => screenDistance(candidate, point)));
      const score = spacing + Math.min(6, candidate.count) * 0.016;
      return score > best.score ? { point: candidate, score } : best;
    }, { point: remaining[0], score: Number.NEGATIVE_INFINITY }).point;
    selected.push(next);
  }

  return selected;
}

function buildWeldingEvents(
  junctions: WeldJunctionCandidate[],
  viewBoxSize: { width: number; height: number },
  unitScale: number
): WeldingEvent[] {
  const blueprintIndicesByCount: Record<number, number[]> = {
    1: [5],
    2: [0, 5],
    3: [0, 3, 5],
    4: [0, 1, 4, 5],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
  };
  const blueprintIndices = blueprintIndicesByCount[Math.min(6, junctions.length)] ?? [];
  const blueprintFor = (blueprintIndex: number): WeldingEventBlueprint => {
    const blueprint = WELD_EVENT_BLUEPRINTS[blueprintIndex];
    return junctions.length === 4 && blueprintIndex === 1
      ? { ...blueprint, startProgress: 0.835, endProgress: 0.872 }
      : blueprint;
  };
  const remaining = [...junctions];
  const assigned = new Map<number, WeldJunctionCandidate>();

  // Der finale Lock reserviert zuerst den am besten passenden, stark
  // verbundenen Knoten. Sonst koennte ein fruehes Ankerfenster den zentralen
  // Struktur-Hub verbrauchen und den wichtigsten Abschluss an einen Fuss-
  // oder Bildrandpunkt draengen.
  const assignmentOrder = [
    ...blueprintIndices.filter((index) => index === 5),
    ...blueprintIndices.filter((index) => index !== 5),
  ];
  assignmentOrder.forEach((blueprintIndex) => {
    const blueprint = blueprintFor(blueprintIndex);
    const target = {
      x: blueprint.anchor.x * viewBoxSize.width,
      y: blueprint.anchor.y * viewBoxSize.height,
    };
    const indexedCandidates = remaining.map((candidate, index) => ({ candidate, index }));
    const contactReady =
      blueprintIndex === 5
        ? indexedCandidates
        : indexedCandidates.filter(
            ({ candidate }) => candidate.connectionProgress <= blueprint.endProgress + 0.012
          );
    const eligibleCandidates = contactReady.length > 0 ? contactReady : indexedCandidates;
    const candidateIndex = eligibleCandidates.reduce((best, { candidate, index }) => {
      const distance = Math.hypot(
        (candidate.x - target.x) / viewBoxSize.width,
        (candidate.y - target.y) / viewBoxSize.height
      );
      const structuralWeight = blueprintIndex === 5 ? 0.055 : 0.018;
      const lateContactPenalty =
        blueprintIndex === 5
          ? 0
          : Math.max(0, candidate.connectionProgress - blueprint.endProgress) * 4.5;
      const score =
        distance - Math.min(8, candidate.count) * structuralWeight + lateContactPenalty;
      return score < best.score ? { index, score } : best;
    }, { index: 0, score: Number.POSITIVE_INFINITY }).index;
    assigned.set(blueprintIndex, remaining.splice(candidateIndex, 1)[0]);
  });

  return blueprintIndices.map((blueprintIndex) => {
    const blueprint = blueprintFor(blueprintIndex);
    const candidate = assigned.get(blueprintIndex)!;
    const seamNeighbor = candidate.neighbors.reduce((best, neighbor) => {
      const length = Math.hypot(neighbor.x - candidate.x, neighbor.y - candidate.y) / unitScale;
      const score = Math.abs(length - 30) * 0.02 - neighbor.count * 0.24 + seeded(blueprintIndex + length) * 0.04;
      return score < best.score ? { point: neighbor, score } : best;
    }, { point: candidate.neighbors[0], score: Number.POSITIVE_INFINITY }).point;
    const seamDistance = Math.hypot(
      seamNeighbor.x - candidate.x,
      seamNeighbor.y - candidate.y
    ) || 1;
    const seamLength = Math.min(
      seamDistance * 0.44,
      (12 + blueprint.heatStrength * 7) * unitScale
    );

    return {
      ...blueprint,
      id: blueprintIndex,
      junction: {
        x: candidate.x,
        y: candidate.y,
        count: candidate.count,
        connectionProgress: candidate.connectionProgress,
        seamEnd: {
          x: candidate.x + ((seamNeighbor.x - candidate.x) / seamDistance) * seamLength,
          y: candidate.y + ((seamNeighbor.y - candidate.y) / seamDistance) * seamLength,
        },
      },
    };
  });
}

function WeldSpark({
  geometry,
  sparkIndex,
  event,
  unitScale,
  progress,
  assemblyDirection,
  gradientId,
}: {
  geometry: WeldSparkGeometry;
  sparkIndex: number;
  event: WeldingEvent;
  unitScale: number;
  progress: MotionValue<number>;
  assemblyDirection: MotionValue<number>;
  gradientId: string;
}) {
  const angle = event.id * 1.71 + sparkIndex * 0.19;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const depthScale = event.depthLayer === "back" ? 0.76 : event.depthLayer === "mid" ? 0.9 : 1;
  const pathScale = unitScale * (0.64 + event.intensity * 0.36) * depthScale;
  const rotatePoint = (x: number, y: number) => ({
    x: (x * cos - y * sin) * pathScale,
    y: (x * sin + y * cos) * pathScale,
  });
  const end = rotatePoint(geometry.dx, geometry.dy);
  const control = rotatePoint(
    geometry.dx * 0.48 + geometry.curveX,
    geometry.dy * 0.28 + geometry.curveY
  );
  const span = event.endProgress - event.startProgress;
  const sparkStart = event.startProgress + span * (0.1 + sparkIndex * 0.035);
  const sparkEnd = event.endProgress - span * (0.04 + (sparkIndex % 2) * 0.06);
  const opacity = useTransform(
    [progress, assemblyDirection],
    (values: number[]) => {
      const [value, direction] = values;
      if (value < sparkStart || value > sparkEnd || direction <= 0) return 0;
      const local = (value - sparkStart) / (sparkEnd - sparkStart);
      const envelope = smoothStep(local / 0.16) * smoothStep((1 - local) / 0.2);
      return envelope * (0.55 + event.intensity * 0.45) * direction;
    }
  );
  const dashOffset = useTransform(progress, (value) => {
    const local = clamp01((value - sparkStart) / (sparkEnd - sparkStart));
    return -0.84 * local;
  });

  return (
    <motion.path
      data-weld-spark={event.id}
      d={`M ${event.junction.x} ${event.junction.y} Q ${event.junction.x + control.x} ${event.junction.y + control.y} ${event.junction.x + end.x} ${event.junction.y + end.y}`}
      pathLength={1}
      fill="none"
      stroke={`url(#${gradientId})`}
      strokeWidth={0.78 * unitScale}
      strokeLinecap="round"
      strokeDasharray="0.16 0.84"
      pointerEvents="none"
      style={{ opacity, strokeDashoffset: dashOffset }}
    />
  );
}

function WeldAmbient({
  event,
  unitScale,
  progress,
  assemblyDirection,
  gradientId,
}: {
  event: WeldingEvent;
  unitScale: number;
  progress: MotionValue<number>;
  assemblyDirection: MotionValue<number>;
  gradientId: string;
}) {
  const opacity = useTransform(
    [progress, assemblyDirection],
    (values: number[]) => weldLightStrength(values[0], event) * values[1] * 0.78
  );

  return (
    <motion.circle
      data-weld-ambient={event.id}
      aria-hidden="true"
      cx={event.junction.x}
      cy={event.junction.y}
      r={(49 + event.intensity * 15) * unitScale}
      fill={`url(#${gradientId})`}
      pointerEvents="none"
      style={{ opacity }}
    />
  );
}

function WeldArc({
  event,
  unitScale,
  progress,
  assemblyDirection,
  coreFilterId,
  sparkGradientId,
}: {
  event: WeldingEvent;
  unitScale: number;
  progress: MotionValue<number>;
  assemblyDirection: MotionValue<number>;
  coreFilterId: string;
  sparkGradientId: string;
}) {
  const depthOpacity = event.depthLayer === "back" ? 0.72 : event.depthLayer === "mid" ? 0.88 : 1;
  const opacity = useTransform(
    [progress, assemblyDirection],
    (values: number[]) => weldArcStrength(values[0], event) * values[1] * depthOpacity
  );
  const coreRadius = (5.2 + event.intensity * 1.25) * unitScale;
  const arcRotation = (seeded(event.id + 3100) - 0.5) * 76;

  return (
    <g
      data-weld-arc={event.id}
      data-weld-depth={event.depthLayer}
      data-weld-junction-count={event.junction.count}
      data-weld-connection-progress={event.junction.connectionProgress.toFixed(3)}
      aria-hidden="true"
      pointerEvents="none"
    >
      <motion.g filter={`url(#${coreFilterId})`} style={{ opacity }}>
        <circle
          cx={event.junction.x}
          cy={event.junction.y}
          r={coreRadius}
          fill="#62ddff"
          fillOpacity="0.26"
        />
        <g transform={`rotate(${arcRotation} ${event.junction.x} ${event.junction.y})`}>
          <path
            d={`M ${event.junction.x - 4.1 * unitScale} ${event.junction.y + 1.4 * unitScale} L ${event.junction.x - 1.15 * unitScale} ${event.junction.y - 1.35 * unitScale} L ${event.junction.x + 1.05 * unitScale} ${event.junction.y + 0.65 * unitScale} L ${event.junction.x + 4.25 * unitScale} ${event.junction.y - 1.7 * unitScale}`}
            fill="none"
            stroke="#e9fcff"
            strokeWidth={0.88 * unitScale}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <circle
          cx={event.junction.x}
          cy={event.junction.y}
          r={1.55 * unitScale}
          fill="#ffffff"
        />
      </motion.g>
      {WELD_SPARK_PATHS.slice(0, event.sparkCount).map((geometry, sparkIndex) => (
        <WeldSpark
          key={sparkIndex}
          geometry={geometry}
          sparkIndex={sparkIndex}
          event={event}
          unitScale={unitScale}
          progress={progress}
          assemblyDirection={assemblyDirection}
          gradientId={sparkGradientId}
        />
      ))}
    </g>
  );
}

function useWeldResidueAge(
  event: WeldingEvent,
  durationMs: number,
  progress: MotionValue<number>,
  assemblyDirection: MotionValue<number>,
  time: MotionValue<number>
): MotionValue<number> {
  const triggeredAt = useMotionValue(-1);
  const armed = useRef(true);
  const previousProgress = useRef(progress.get());

  useMotionValueEvent(assemblyDirection, "change", (direction) => {
    if (direction <= 0) armed.current = true;
  });
  useMotionValueEvent(progress, "change", (value) => {
    const previous = previousProgress.current;
    previousProgress.current = value;
    if (value < event.startProgress - 0.02) armed.current = true;
    if (
      assemblyDirection.get() > 0 &&
      armed.current &&
      previous < event.endProgress &&
      value >= event.endProgress
    ) {
      triggeredAt.set(time.get());
      armed.current = false;
    }
  });

  return useTransform([time, triggeredAt], (values: number[]) => {
    const [now, start] = values;
    return start < 0 ? -1 : (now - start) / durationMs;
  });
}

function WeldSmoke({
  event,
  unitScale,
  progress,
  assemblyDirection,
  time,
  gradientId,
  filterId,
}: {
  event: WeldingEvent;
  unitScale: number;
  progress: MotionValue<number>;
  assemblyDirection: MotionValue<number>;
  time: MotionValue<number>;
  gradientId: string;
  filterId: string;
}) {
  const duration = 1950 + event.heatStrength * 950 + event.id * 55;
  const age = useWeldResidueAge(event, duration, progress, assemblyDirection, time);
  const depthOpacity = event.depthLayer === "back" ? 0.74 : event.depthLayer === "mid" ? 0.92 : 0.78;
  const opacity = useTransform(age, (value) => {
    if (value < 0 || value >= 1) return 0;
    const fadeIn = smoothStep(value / 0.12);
    const fadeOut = 1 - smoothStep((value - 0.36) / 0.64);
    return fadeIn * fadeOut * (0.16 + event.heatStrength * 0.13) * depthOpacity;
  });
  const driftX = useTransform([time, age], (values: number[]) => {
    const [now, value] = values;
    if (value < 0) return 0;
    const visibleAge = clamp01(value);
    // Exakt dieselbe langsame Reise-Richtung wie das Fragmentfeld; nur die
    // Strecke ist kleiner und wird mit dem Rauchalter aufgebaut.
    const heading = Math.sin(now * 0.00015) * 1.3 + Math.sin(now * 0.00007 + 2.1) * 0.9;
    const wind = (10 + 6 * Math.sin(now * 0.00011 + 0.6)) * unitScale;
    const curl = Math.sin(visibleAge * Math.PI * 2.1 + event.id * 1.37) * 7 * unitScale;
    return Math.cos(heading) * wind * visibleAge + curl * visibleAge;
  });
  const riseY = useTransform(age, (value) => {
    const visibleAge = clamp01(value);
    return -(7 + 54 * visibleAge) * unitScale;
  });
  const cx = useTransform(driftX, (value) => event.junction.x + value);
  const cy = useTransform(riseY, (value) => event.junction.y + value);
  const radiusX = useTransform(age, (value) => (5.5 + clamp01(value) * 18) * unitScale);
  const radiusY = useTransform(age, (value) => (8 + clamp01(value) * 28) * unitScale);
  const secondaryCx = useTransform(
    [driftX, age],
    (values: number[]) => event.junction.x + values[0] - Math.sin(clamp01(values[1]) * 5 + event.id) * 6 * unitScale
  );
  const secondaryCy = useTransform(
    riseY,
    (value) => event.junction.y + value + 8 * unitScale
  );

  return (
    <motion.g
      data-weld-smoke={event.id}
      data-weld-depth={event.depthLayer}
      aria-hidden="true"
      pointerEvents="none"
      filter={`url(#${filterId})`}
      style={{ opacity }}
    >
      <motion.ellipse
        cx={cx}
        cy={cy}
        rx={radiusX}
        ry={radiusY}
        fill={`url(#${gradientId})`}
      />
      {event.depthLayer !== "front" && (
        <motion.ellipse
          cx={secondaryCx}
          cy={secondaryCy}
          rx={radiusX}
          ry={radiusY}
          fill="#7f8c91"
          fillOpacity="0.34"
        />
      )}
    </motion.g>
  );
}

function WeldAfterglow({
  event,
  unitScale,
  progress,
  assemblyDirection,
  time,
}: {
  event: WeldingEvent;
  unitScale: number;
  progress: MotionValue<number>;
  assemblyDirection: MotionValue<number>;
  time: MotionValue<number>;
}) {
  const age = useWeldResidueAge(
    event,
    720 + event.heatStrength * 720,
    progress,
    assemblyDirection,
    time
  );
  const opacity = useTransform(
    [age, assemblyDirection],
    (values: number[]) => {
      const [value, direction] = values;
      if (value < 0 || value >= 1 || direction <= 0) return 0;
      return (1 - smoothStep(value)) * event.heatStrength * direction;
    }
  );
  const haloOpacity = useTransform(opacity, (value) => value * 0.42);
  const heatColor = useTransform(
    age,
    [0, 0.1, 0.34, 0.68, 1],
    ["#f7feff", "#fff1a8", "#ffb43f", "#a94022", "#321817"]
  );
  const seamPath = `M ${event.junction.x} ${event.junction.y} L ${event.junction.seamEnd.x} ${event.junction.seamEnd.y}`;

  return (
    <g
      data-weld-seam={event.id}
      data-weld-depth={event.depthLayer}
      aria-hidden="true"
      pointerEvents="none"
    >
      <motion.path
        d={seamPath}
        fill="none"
        stroke="#ff702a"
        strokeWidth={(2.5 + event.heatStrength) * unitScale}
        strokeLinecap="round"
        style={{ opacity: haloOpacity }}
      />
      <motion.path
        d={seamPath}
        fill="none"
        strokeWidth={(0.72 + event.heatStrength * 0.28) * unitScale}
        strokeLinecap="round"
        style={{ opacity, stroke: heatColor }}
      />
    </g>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/** Mischt eine Hex-Farbe Richtung Schwarz (amount<0) oder Weiß (amount>0) -
 * fuer den Foto-Einfaerbe-Filter (Duoton-Endpunkte) und die helle
 * Nahtstellen-Schein-Farbe (siehe `tintColor`-Prop unten). */
function shadeHex(hex: string, amount: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return [r + (target - r) * t, g + (target - g) * t, b + (target - b) * t];
}

interface FacetProps {
  facet: FacetDef;
  index: number;
  center: { x: number; y: number };
  scatterDistance: number;
  chaosEnabled: boolean;
  time: MotionValue<number>;
  chaosStartTime: MotionValue<number>;
  progress: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  /** "Scherben-Foto"-Modus (siehe Datei-Kommentar) - wenn gesetzt, wird die
   * Facette als ausgeschnittenes Bildfragment statt als Flächenfarbe
   * gerendert. `imageSize` ist die Pixelgröße des Fotos, in der die
   * Facetten-Koordinaten (dieselbe viewBox wie das Motiv) liegen sollen. */
  imageUrl?: string;
  imageSize?: { width: number; height: number };
  /** Hex-Wunschfarbe (z.B. aus dem echten Shop-Katalog) - faerbt im
   * Scherben-Foto-Modus das Foto per Duoton-Filter ein (siehe
   * `PhotoTintFilter`) und bestimmt den warmen Nahtstellen-Schein. */
  tintColor?: string;
  /** Eindeutiger ID-Praefix fuer die SVG-clipPath-IDs - noetig, da
   * Haupt-Rendering und Spiegelung dieselben Facetten-Indizes doppelt
   * verwenden und clipPath-IDs sonst kollidieren wuerden. */
  idPrefix: string;
  /** Skalierungsfaktor fuer die gemeinsame Chaos-Quelle (viewBox-Breite /
   * SHARED_CHAOS_REFERENCE_WIDTH) - normalisiert Streuradius und Treiben,
   * damit ALLE Motive aus derselben Wolke an denselben Slot-Positionen
   * starten. Nur im Chaos-Modus wirksam; Faktor 1 (= Katze) veraendert
   * nichts am bisherigen Verhalten. */
  chaosUnitScale?: number;
  /** Gemeinsames Zentrum der universellen Chaos-Buehne in den Koordinaten
   * dieser viewBox. */
  chaosCenter: { x: number; y: number };
  /** SVG-ID des Duoton-Filters, die DIESE Facette fuer ihr Foto-Fragment
   * referenziert (dokumentweit eindeutig, siehe LowPolyMeshProps). */
  tintFilterId?: string;
  /** Gemeinsame lokale Lichtstaerke des Welding-Prototyps. Ein einziges
   * Overlay pro realer Facette laesst das Foto reagieren, ohne dessen
   * Textur durch Flat-Fills zu ersetzen. Nur im Hauptmesh gesetzt. */
  weldMetalOpacity?: MotionValue<number>;
  weldMetalGradientId?: string;
}

function Facet({
  facet,
  index,
  center,
  scatterDistance,
  chaosEnabled,
  time,
  chaosStartTime,
  progress,
  pointerX,
  pointerY,
  imageUrl,
  tintColor,
  imageSize,
  idPrefix,
  chaosUnitScale = 1,
  chaosCenter,
  tintFilterId = "photo-tint",
  weldMetalOpacity,
  weldMetalGradientId,
}: FacetProps) {
  const points = parsePoints(facet.points);
  const [cx, cy] = centroid(points);
  const dx = cx - center.x;
  const dy = cy - center.y;
  const distFromCenter = Math.hypot(dx, dy) || 1;
  const organicAngle = Math.atan2(dy, dx) + (seeded(index) - 0.5) * 1.6;
  const sharedSlot = sharedChaosSlot(index);
  // Gemeinsame Quelle: im Chaos-Modus auf die Katzen-Referenz normalisiert
  // (siehe SHARED_CHAOS_REFERENCE_WIDTH) - alle vier Slides streuen damit in
  // EINE Wolke an denselben Slot-Positionen. Die Flugbahn dorthin (Winkel,
  // Stagger, Sway, Tumble) bleibt exakt unveraendert.
  const effectiveScatterDistance = chaosEnabled
    ? CHAOS_SCATTER_DISTANCE * chaosUnitScale
    : scatterDistance;
  // Ein gemeinsamer Tiefen-Slot pro Index: nahe Teile sind etwas groesser
  // und bewegter, entfernte etwas kleiner und ruhiger.
  const depthScale = sharedSlot.depth;

  // Im Chaos-Modus elliptisch statt kreisförmig verstreuen: der Hero ist
  // breiter als hoch, ein kreisförmiger Streuradius schickt bei größerem
  // Radius sofort viele Teile senkrecht aus dem Bild statt sie ueber die
  // vorhandene Breite zu nutzen.
  const scatterScaleX = chaosEnabled ? 1.65 : 1;
  const scatterScaleY = chaosEnabled ? 0.7 : 1;
  const organicMagnitude = effectiveScatterDistance * (0.65 + seeded(index + 50) * 1.1);
  const rawScatterX = chaosEnabled
    ? (sharedSlot.x - SHARED_CHAOS_CORE_BIAS.x) * effectiveScatterDistance
    : Math.cos(organicAngle) * organicMagnitude * scatterScaleX;
  const rawScatterY = chaosEnabled
    ? (sharedSlot.y - SHARED_CHAOS_CORE_BIAS.y) * effectiveScatterDistance
    : Math.sin(organicAngle) * organicMagnitude * scatterScaleY;
  // Der gemeinsame Slot bezeichnet die Position des echten
  // Facettenmittelpunkts. Unterschiedliche Polygonlagen/Zentren koennen die
  // voll explodierte Wolke dadurch nicht mehr verschieben.
  const scatterX = chaosEnabled ? chaosCenter.x + rawScatterX - cx : rawScatterX;
  const scatterY = chaosEnabled ? chaosCenter.y + rawScatterY - cy : rawScatterY;
  const scatterVectorLength = Math.hypot(scatterX, scatterY) || 1;
  const scatterRotate = (seeded(index + 100) - 0.5) * SCATTER_ROTATION_DEG;

  // Eigenes, geseedetes Zeitfenster je Facette innerhalb der Gesamt-Montage
  // (0-1) - manche setzen sich frueh zusammen, andere spaet, alle spaetestens
  // bei Gesamt-Fortschritt 1 fertig. "localArrive" ist der lokale Fortschritt
  // (0 = noch verstreut, 1 = angekommen) INNERHALB dieses Fensters.
  const { start: staggerStart, end: staggerEnd } = facetArrivalWindow(index);
  const localArrive = useTransform(progress, [staggerStart, staggerEnd], [0, 1]);

  const baseX = useTransform(localArrive, (v) => scatterX * (1 - v));
  const baseY = useTransform(localArrive, (v) => scatterY * (1 - v));
  const baseRotate = useTransform(localArrive, (v) => scatterRotate * (1 - v));

  // Seitlicher Schwebe-Versatz (senkrecht zur Flugrichtung, nicht radial) +
  // zusaetzliches Trudeln waehrend des Flugs - beides exakt 0 an Start UND
  // Ziel (sin(0)=sin(pi)=0), am staerksten in der Flugmitte. Ergibt den
  // "Blatt im Wind"-Effekt statt einer geraden Linie.
  const perpUnitX = -scatterY / scatterVectorLength;
  const perpUnitY = scatterX / scatterVectorLength;
  const swayAmplitude = (seeded(index + 400) - 0.5) * 70;
  const tumbleAmplitude = (seeded(index + 600) - 0.5) * 90;
  const swayX = useTransform(localArrive, (v) => Math.sin(v * Math.PI) * perpUnitX * swayAmplitude);
  const swayY = useTransform(localArrive, (v) => Math.sin(v * Math.PI) * perpUnitY * swayAmplitude);
  const tumble = useTransform(localArrive, (v) => Math.sin(v * Math.PI) * tumbleAmplitude);

  // Vor der ersten Montage (noch verstreut) trotzdem sichtbar statt
  // unsichtbar - sonst waere das Motiv waehrend einer eingefrorenen
  // Wartephase (z.B. Vor-Consent) komplett unsichtbar.
  const opacity = useTransform(localArrive, [0, 1], [0.55, 1]);
  // Die ersten 20 echten Facetten bilden motivuebergreifend das sichtbare
  // Kernfeld. Zusaetzliche reale Facetten von Katze/Bueste bleiben erhalten,
  // treten im reinen Chaos aber zurueck. Beim Zusammenbau werden sie sofort
  // wieder voll sichtbar; es werden weder Facetten ersetzt noch erfunden.
  const chaosDensityWeight = index < SHARED_CHAOS_CORE_SLOT_COUNT ? 1 : 0.24;
  const fieldOpacity = useTransform(
    progress,
    [0, 0.18],
    [chaosEnabled ? chaosDensityWeight : 1, 1]
  );

  // Native Dreiecksflaechen werden in gemeinsame Referenzeinheiten
  // umgerechnet und nur sanft normalisiert. Die engen Grenzen und der
  // kleine Exponent bewahren die realen Groessenunterschiede.
  const normalizedFacetArea = polygonArea(points) / (chaosUnitScale * chaosUnitScale);
  const areaCompensation = Math.min(
    1.24,
    Math.max(
      0.78,
      Math.pow(SHARED_CHAOS_REFERENCE_FACET_AREA / Math.max(1, normalizedFacetArea), 0.16)
    )
  );
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const normalizedFacetExtent = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys)
  ) / chaosUnitScale;
  const extentCompensation = Math.min(
    1,
    Math.max(
      0.62,
      Math.pow(
        SHARED_CHAOS_REFERENCE_FACET_EXTENT / Math.max(1, normalizedFacetExtent),
        0.4
      )
    )
  );
  const chaosFragmentScale = Math.min(
    1.28,
    Math.max(0.72, depthScale * areaCompensation * extentCompensation)
  );
  const fragmentScale = useTransform(localArrive, (v) =>
    chaosEnabled ? chaosFragmentScale + (1 - chaosFragmentScale) * v : 1
  );

  // "Wasserdicht"/verschweisst sobald komplett montiert: die dunklen
  // Facetten-Umrandungen (Stroke) blenden erst ganz am Ende der
  // GESAMT-Montage aus (nicht pro Facette - sonst waeren manche Nahtstellen
  // schon nahtlos, andere noch mit Rand, waehrend noch montiert wird). Da
  // alle Facetten spaetestens bei Gesamt-Fortschritt 1 exakt ihre
  // Original-Eckpunkte erreichen (kein Versatz/keine Rotation mehr), grenzen
  // benachbarte Facetten dann exakt aneinander - ohne Rand wirkt es wie ein
  // durchgehend verschweisstes Stueck statt einzelner Dreiecke.
  const strokeOpacity = useTransform(progress, [0.92, 1], [1, 0]);
  // Weicherer, breiterer Warmton-Schein UNTER der dunklen Nahtstellen-Linie
  // (siehe Analyse des echten Foto-Schweißnaht-Profils im Datei-Kommentar) -
  // simuliert die Waerme-Verfaerbung, die echte Schweissnaehte im Foto neben
  // der eigentlichen dunklen Rille zeigen, statt einer rein flachen Kontur.
  const seamHaloOpacity = useTransform(strokeOpacity, (v) => v * 0.4);

  // Mausparallaxe pro Facette: waehrend das Motiv noch nicht komplett
  // verschweisst ist, wackelt jedes Teil (je nach Abstand zum Zentrum
  // unterschiedlich stark) leicht mit der Maus mit - sobald verschweisst,
  // blendet das aus (parallaxFade), sonst wuerden die unterschiedlichen
  // Versaetze benachbarter Facetten wieder sichtbare Nahtstellen aufreissen.
  // Ab dann uebernimmt die einheitliche Kopf-/Objekt-Neigung (siehe
  // LowPolyMesh weiter unten) die "Blick folgt der Maus"-Funktion als EIN
  // zusammenhaengendes Stueck statt einzeln wackelnder Teile.
  const parallaxFade = useTransform(progress, [0.9, 1], [1, 0]);
  const sharedSlotDistance =
    Math.hypot(
      sharedSlot.x - SHARED_CHAOS_CORE_BIAS.x,
      sharedSlot.y - SHARED_CHAOS_CORE_BIAS.y
    ) * CHAOS_SCATTER_DISTANCE;
  const normalizedDistFromCenter = chaosEnabled ? sharedSlotDistance : distFromCenter;
  const parallaxStrength = 14 + (normalizedDistFromCenter / 130) * 20;
  const parallaxX = useTransform(
    [pointerX, parallaxFade],
    (values: number[]) => values[0] * parallaxStrength * values[1]
  );
  const parallaxY = useTransform(
    [pointerY, parallaxFade],
    (values: number[]) => values[0] * parallaxStrength * values[1]
  );

  // Dauerhaftes Umhertreiben im Ruhezustand ("Blatt/Feder im Wind") - nur
  // wenn chaosEnabled (ab der ersten Sprengung). WICHTIG: nicht zwei
  // unabhaengige Sinuswellen je Achse (das ergibt eine Lissajous-Kurve -
  // je nach Frequenzverhaeltnis frueher oder spaeter eine erkennbare, sich
  // wiederholende Linie/Ellipse statt echtem Umherirren). Stattdessen
  // wandert der RICHTUNGSWINKEL selbst per ueberlagerten Sinuswellen -
  // Position = Radius * (cos/sin des wandernden Winkels). Da X und Y damit
  // durch denselben, sich staendig unvorhersehbar drehenden Winkel bestimmt
  // werden (nicht durch zwei unabhaengige Achsen), ergibt sich ein echt
  // maeandernder Pfad statt einer klaren Bahn.
  //
  // driftActive kombiniert zwei Envelopes: (1) blendet in den ersten 12%
  // eines gezielten Zusammenbaus zuegig aus, (2) blendet nach einer
  // Sprengung ueber ~1,2s WEICH EIN (warmup, ab chaosStartTime) statt im
  // selben Frame mit voller Staerke zu starten, in dem die Flugbewegung
  // endet - vermeidet einen kleinen Knick in der Bewegungsrichtung genau am
  // Uebergang von Flug zu Treiben.
  const driftFadeOnAssemble = useTransform(progress, [0, 0.12], [1, 0]);
  const warmup = useTransform([time, chaosStartTime], (values: number[]) => {
    const [t, start] = values;
    if (start <= 0) return 1;
    return Math.min(1, Math.max(0, (t - start) / 1200));
  });
  const driftActive = useTransform(
    [driftFadeOnAssemble, warmup],
    (values: number[]) => values[0] * values[1]
  );

  // "Schwarm"-Grueppchen: 3 lose Gruppen (kein echtes Boids-Modell - nur
  // genug, um kleine, gemeinsam schwingende Untergruppen statt eines einzigen
  // uniformen Schwarms wirken zu lassen, wie mehrere kleine Vogeltrupps statt
  // eines riesigen). Nur die LANGSAMSTE/dominante Wanderwellen-Phase (1)
  // wird zur Haelfte mit der Schul-Phase gemischt - die feineren Wellen (2,3)
  // bleiben rein individuell (gemeinsame Grundtendenz + eigenes Flattern).
  const schoolId = index % 3;
  const schoolPhase = seeded(schoolId * 97 + 11) * Math.PI * 2;
  const schoolFreq = 0.0008 + seeded(schoolId * 53 + 5) * 0.0006;

  const driftBaseAngle = seeded(index + 880) * Math.PI * 2;
  // Volle Richtungsaenderung alle ~3-8s - schnell genug, um klar als
  // Bewegung erkennbar zu sein, ohne die Grundgeschwindigkeit weiter zu
  // erhoehen (auf Wunsch: dynamischer statt schneller).
  const driftAngleFreq1 = (0.0008 + seeded(index + 820) * 0.0011) * 0.5 + schoolFreq * 0.5;
  const driftAngleFreq2 = 0.0008 + seeded(index + 830) * 0.0011;
  const driftAngleFreq3 = 0.0008 + seeded(index + 840) * 0.0011;
  const driftAnglePhase1 = (seeded(index + 850) * Math.PI * 2) * 0.5 + schoolPhase * 0.5;
  const driftAnglePhase2 = seeded(index + 860) * Math.PI * 2;
  const driftAnglePhase3 = seeded(index + 870) * Math.PI * 2;
  // In viewBox-Einheiten (wie magnitude/scatterX/Y oben), NICHT Pixel - bei
  // der ~2.8-fachen Render-Skalierung ergibt das ~110-280px tatsaechliche
  // Wander-Reichweite je Facette. Im Chaos-Modus ebenfalls auf die gemeinsame
  // Quelle normalisiert (sonst wandert der Hocker-Slot nur ~1/4 so weit wie
  // der Katzen-Slot und die Wolke wuerde pro Slide auseinanderfallen).
  const driftRadiusBase =
    (40 + seeded(index + 780) * 60) *
    (chaosEnabled ? chaosUnitScale * depthScale : 1);
  const driftRadiusFreq = 0.0004 + seeded(index + 890) * 0.0005;
  const driftRadiusPhase = seeded(index + 900) * Math.PI * 2;
  const driftRotAmplitude = 30 + seeded(index + 810) * 50;
  const driftRotFreq = 0.0006 + seeded(index + 790) * 0.0008;
  const driftRotPhase = seeded(index + 800) * Math.PI * 2;

  // Gemeinsamer "Bö"-Puls: SELBE Basis-Frequenz/Phase fuer alle Facetten
  // eines Motivs (kein Pro-Facette-Seed), nur mit einem winzigen, vom
  // Abstand zum Zentrum abhaengigen Versatz - dadurch schwillt die
  // Streuweite periodisch fuer die GANZE GRUPPE gemeinsam an/ab, wie eine
  // Windboe durch einen Schwarm laeuft, statt dass jedes Teil komplett fuer
  // sich allein umherirrt.
  const flockPhaseOffset = normalizedDistFromCenter * 0.006;
  const flockGust = useTransform(time, (t) => 0.75 + 0.35 * Math.sin(t * 0.00022 + flockPhaseOffset));

  // Gemeinsame, langsam wandernde "Reise-Richtung" des GESAMTEN Schwarms -
  // wie eine Vogelschar, die zusammen ueber den Himmel zieht, waehrend jedes
  // einzelne Teil trotzdem sein eigenes Wandern/Flattern behaelt. Bewusst
  // OHNE index-Seed, damit wirklich JEDE Facette exakt denselben Wert
  // bekommt (echte Gruppenbewegung statt nur synchronem Puls).
  const flockHeadingAngle = useTransform(
    time,
    (t) => Math.sin(t * 0.00015) * 1.3 + Math.sin(t * 0.00007 + 2.1) * 0.9
  );
  const flockHeadingMagnitude = useTransform(time, (t) =>
    chaosEnabled
      ? (16 + 10 * Math.sin(t * 0.00011 + 0.6)) * chaosUnitScale
      : 16 + 10 * Math.sin(t * 0.00011 + 0.6)
  );
  const flockHeadingX = useTransform(
    [flockHeadingAngle, flockHeadingMagnitude],
    (values: number[]) => Math.cos(values[0]) * values[1]
  );
  const flockHeadingY = useTransform(
    [flockHeadingAngle, flockHeadingMagnitude],
    (values: number[]) => Math.sin(values[0]) * values[1] * 0.6
  );

  // "Fallende Feder": leichter, ueberwiegend nach unten gerichteter Bias
  // (schwingt zwischen -2 und +10 - meistens sinkend, gelegentlich kurz von
  // einer "Boe" nach oben getragen) statt rein symmetrischem Umherirren.
  // Wie driftRadiusBase im Chaos-Modus auf die gemeinsame Quelle skaliert,
  // damit alle Slides dasselbe Sinkverhalten in denselben Einheiten zeigen.
  const fallPhase = seeded(index + 950) * Math.PI * 2;
  const fallBias = useTransform(time, (t) =>
    chaosEnabled
      ? (4 + 6 * Math.sin(t * 0.00013 + fallPhase)) * chaosUnitScale * depthScale
      : 4 + 6 * Math.sin(t * 0.00013 + fallPhase)
  );

  // "Blatt im Wind"-Trudeln: Rotation an die aktuelle Wanderrichtung
  // gekoppelt statt komplett unabhaengig - das Teil "rockt" sichtbar mit,
  // wenn es die Richtung wechselt, statt nur zeitlich unabhaengig zu drehen.
  const leafTumbleAmplitude = 18 + seeded(index + 960) * 20;

  const driftAngle = useTransform(
    time,
    (t) =>
      driftBaseAngle +
      Math.sin(t * driftAngleFreq1 + driftAnglePhase1) * 1.5 +
      Math.sin(t * driftAngleFreq2 + driftAnglePhase2) * 0.9 +
      Math.sin(t * driftAngleFreq3 + driftAnglePhase3) * 0.5
  );
  const driftRadius = useTransform(
    [time, flockGust],
    (values: number[]) => {
      const [t, gust] = values;
      return driftRadiusBase * (0.65 + 0.35 * Math.sin(t * driftRadiusFreq + driftRadiusPhase)) * gust;
    }
  );
  const leafTumble = useTransform(driftAngle, (ang) => Math.sin(ang * 1.7) * leafTumbleAmplitude);
  const driftX = useTransform(
    [driftAngle, driftRadius, driftActive, flockHeadingX],
    (values: number[]) => {
      if (!chaosEnabled) return 0;
      const [ang, rad, active, headX] = values;
      return Math.cos(ang) * rad * active + headX * active;
    }
  );
  const driftY = useTransform(
    [driftAngle, driftRadius, driftActive, flockHeadingY, fallBias],
    (values: number[]) => {
      if (!chaosEnabled) return 0;
      const [ang, rad, active, headY, fall] = values;
      return Math.sin(ang) * rad * active + headY * active + fall * active;
    }
  );
  const driftRotate = useTransform(
    [time, driftActive, flockGust, leafTumble],
    (values: number[]) => {
      if (!chaosEnabled) return 0;
      const [t, active, gust, tumble] = values;
      return Math.sin(t * driftRotFreq + driftRotPhase) * driftRotAmplitude * active * gust + tumble * active;
    }
  );
  const rotate = useTransform(
    [baseRotate, tumble, driftRotate],
    (values: number[]) => values[0] + values[1] + values[2]
  );

  const x = useTransform(
    [baseX, swayX, driftX, parallaxX],
    (values: number[]) => values[0] + values[1] + values[2] + values[3]
  );
  const y = useTransform(
    [baseY, swayY, driftY, parallaxY],
    (values: number[]) => values[0] + values[1] + values[2] + values[3]
  );
  // Framer Motion normalisiert CSS-transform-origin bei einer geclippten
  // SVG-Bildgruppe auf deren volle Bild-Bounding-Box. Das verschiebt gleiche
  // Chaos-Slots je nach Quell-viewBox stark. Als SVG-Attribut bleibt der
  // Pivot dagegen exakt der reale Facettenschwerpunkt; die Translation liegt
  // separat auf der aeusseren Gruppe und wird nicht mitrotiert/-skaliert.
  const fragmentTransform = useTransform(
    [rotate, fragmentScale],
    (values: number[]) => {
      const [rotation, scale] = values;
      return `translate(${cx}px, ${cy}px) rotate(${rotation}deg) scale(${scale}) translate(${-cx}px, ${-cy}px)`;
    }
  );
  const fragmentTransformStyle = {
    transform: fragmentTransform,
    transformBox: "view-box" as const,
    originX: 0,
    originY: 0,
  };

  // Schimmernde Kantenkontur statt der frueheren blauen "Datentransfer"-
  // Linie - wie eine Glas-/Metallscherbe, die beim Trudeln Licht einfaengt.
  // Zwei Anteile: (1) ein an die aktuelle Rotation gekoppeltes Glaenzen
  // (glaenzt auf, wenn die Facette gerade "richtig zum Licht steht" -
  // |sin(rotation)|, kein Zeit-Rauschen noetig, folgt der ohnehin schon
  // animierten Drehung), (2) ein schnelles, feines Funkeln obendrauf.
  // Erlischt zusammen mit dem normalen Rand beim Verschweissen
  // (strokeOpacity-Faktor) und ist nur im Chaos-Modus aktiv.
  const sparkleFreq = 0.01 + seeded(index + 910) * 0.02;
  const sparklePhase = seeded(index + 920) * Math.PI * 2;
  const edgeShimmerOpacity = useTransform(
    [rotate, time, strokeOpacity],
    (values: number[]) => {
      if (!chaosEnabled) return 0;
      const [rot, t, weldFade] = values;
      const rotationGlint = Math.abs(Math.sin((rot * Math.PI) / 65));
      const sparkle = Math.max(0, Math.sin(t * sparkleFreq + sparklePhase)) ** 3;
      return Math.min(1, rotationGlint * 0.6 + sparkle * 0.7) * weldFade;
    }
  );

  const clipId = `${idPrefix}-clip-${index}`;
  // Heller Nahtstellen-Schein: bei Foto-Motiven aus der Wunschfarbe selbst
  // abgeleitet (passt sich automatisch an, egal welche Farbe gewaehlt ist),
  // bei Flachfarben-Motiven aus dem hellen Verlaufs-Endpunkt des jeweiligen
  // Tons (siehe TONE_GRADIENT_STOPS) - immer farblich passend zur Facette.
  const seamHaloColor = imageUrl
    ? tintColor
      ? `rgb(${shadeHex(tintColor, 0.45).join(",")})`
      : "#ffcf7a"
    : TONE_GRADIENT_STOPS[facet.tone].light;

  // Schimmer-Glanz aus derselben Wunschfarbe abgeleitet statt eines fest
  // codierten Goldtons - sonst blitzen fliegende/treibende Scherben in einer
  // ANDEREN Farbfamilie auf als die Wunschfarbe selbst und wirken dadurch
  // uneinheitlich gefaerbt (Ziel: Chaos-Zustand UND Zusammenbau zeigen
  // durchgehend denselben Farbton).
  const shimmerStroke = tintColor ? `rgb(${shadeHex(tintColor, 0.55).join(",")})` : "#ffe3ad";
  const shimmerGlowInner = tintColor ? `rgb(${shadeHex(tintColor, 0.32).join(",")})` : "#ffcf7a";
  const shimmerGlowOuter = tintColor ? `rgb(${shadeHex(tintColor, 0.05).join(",")})` : "#ff9d3d";
  const strokeUnitScale = chaosEnabled ? chaosUnitScale : 1;

  return (
    <motion.g style={{ x, y, opacity: fieldOpacity }}>
      {chaosEnabled && (
        <motion.polygon
          points={facet.points}
          fill="none"
          stroke={shimmerStroke}
          strokeWidth={1.1 * strokeUnitScale}
          style={{
            ...fragmentTransformStyle,
            opacity: edgeShimmerOpacity,
            filter: `drop-shadow(0 0 3px ${shimmerGlowInner}) drop-shadow(0 0 7px ${shimmerGlowOuter})`,
          }}
        />
      )}
      {imageUrl && imageSize ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <polygon points={facet.points} />
            </clipPath>
          </defs>
          <motion.g
            clipPath={`url(#${clipId})`}
            style={{ ...fragmentTransformStyle, opacity }}
          >
            <image
              href={imageUrl}
              x={0}
              y={0}
              width={imageSize.width}
              height={imageSize.height}
              preserveAspectRatio="xMidYMid slice"
              filter={tintColor ? `url(#${tintFilterId})` : undefined}
            />
          </motion.g>
          {/* Warmer Schein UNTER der dunklen Nahtstellen-Linie (siehe
              seamHaloColor oben) - simuliert die Waerme-Verfaerbung, die
              echte Schweissnaehte im Referenzfoto neben der eigentlichen
              dunklen Rille zeigen, statt einer rein flachen Kontur. */}
          <motion.polygon
            points={facet.points}
            fill="none"
            stroke={seamHaloColor}
            strokeWidth={1.5 * strokeUnitScale}
            style={{ ...fragmentTransformStyle, opacity: seamHaloOpacity }}
          />
          {/* Duenne dunkle Nahtstellen-Kontur obendrauf - wie beim
              Flachfarben-Modus, blendet beim Verschweissen aus
              (strokeOpacity), damit die Scherben vor dem Zusammenfuegen als
              einzelne Fragmente erkennbar bleiben. */}
          <motion.polygon
            points={facet.points}
            fill="none"
            stroke={SEAM_STROKE}
            strokeWidth={0.6 * strokeUnitScale}
            style={{ ...fragmentTransformStyle, opacity: strokeOpacity }}
          />
        </>
      ) : (
        <>
          <motion.polygon
            points={facet.points}
            fill={`url(#grad-${facet.tone})`}
            style={{ ...fragmentTransformStyle, opacity }}
          />
          {/* Gleiches zweischichtiges Nahtstellen-Profil wie im Foto-Modus -
              warmer Schein unter der dunklen Kontur. */}
          <motion.polygon
            points={facet.points}
            fill="none"
            stroke={seamHaloColor}
            strokeWidth={1.4 * strokeUnitScale}
            style={{ ...fragmentTransformStyle, opacity: seamHaloOpacity }}
          />
          <motion.polygon
            points={facet.points}
            fill="none"
            stroke={SEAM_STROKE}
            strokeWidth={0.75 * strokeUnitScale}
            style={{ ...fragmentTransformStyle, opacity: strokeOpacity }}
          />
        </>
      )}
      {weldMetalOpacity && weldMetalGradientId && (
        <motion.polygon
          aria-hidden="true"
          points={facet.points}
          fill={`url(#${weldMetalGradientId})`}
          pointerEvents="none"
          style={{
            ...fragmentTransformStyle,
            opacity: weldMetalOpacity,
            mixBlendMode: "screen",
          }}
        />
      )}
    </motion.g>
  );
}

export interface LowPolyMeshProps {
  facets: FacetDef[];
  viewBox: string;
  center: { x: number; y: number };
  /** Streuradius in denselben Einheiten wie die viewBox - Default passt zur
   * Katze (240x260-viewBox, groß dimensionierte Darstellung im Hero). */
  scatterDistance?: number;
  /** Ab der ersten jemals ausgelösten Sprengung dauerhaft true (siehe
   * HeroCarousel.tsx) - schaltet den großen Chaos-Streuradius und das
   * dauerhafte Umhertreiben im Ruhezustand frei. */
  chaosEnabled?: boolean;
  className?: string;
  /** Gemeinsame Uhr fuer das Umhertreiben - vom Aufrufer erzeugt (statt
   * intern per useTime()), damit `chaosStartTime` denselben Zeitwert
   * referenzieren kann (siehe HeroCarousel.tsx). */
  time: MotionValue<number>;
  /** Uhr-Wert, zu dem die letzte Sprengung fertig war - blendet das
   * Treiben weich ein statt es abrupt zu starten (siehe Facet-Kommentar). */
  chaosStartTime: MotionValue<number>;
  progress: MotionValue<number>;
  /** 1 waehrend des Zusammenbaus, 0 beim Rueckwaerts-Sprengen. Der
   * Welding-Prototyp darf nur in positiver Montagerichtung feuern. */
  assemblyDirection: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  ariaLabel: string;
  /** "Scherben-Foto"-Modus (siehe Datei-Kommentar oben) - wenn gesetzt,
   * werden die Facetten als Fragmente dieses Fotos statt als Flächenfarbe
   * gerendert. Erwartet dieselbe Koordinaten-viewBox wie `viewBox`. */
  imageUrl?: string;
  /** Hex-Wunschfarbe (idealerweise aus dem echten Shop-Katalog, siehe
   * heroSlides.ts) - faerbt das Foto per Duoton-Filter ein, nur wirksam
   * zusammen mit `imageUrl`. */
  tintColor?: string;
  /** Optionale Overrides fuer die Duoton-Kontrastbreite (siehe
   * PhotoTintFilter) - je Motiv einstellbar, da nicht jede Wunschfarbe die
   * gelockerten Defaults braucht (siehe heroSlides.ts). */
  tintDarkMix?: number;
  tintLightMix?: number;
  /** SVG-ID des Duoton-Filters (Default "photo-tint"). Muss gesetzt werden,
   * wenn zwei LowPolyMesh-Instanzen GLEICHZEITIG im Dokument haengen
   * (Crossfade beim Slide-Wechsel im HeroCarousel) - sonst wuerde eine
   * Instanz den Filter der anderen referenzieren und in deren Wunschfarbe
   * eingefaerbt werden (SVG-IDs sind dokumentweit eindeutig). */
  tintFilterId?: string;
  /** Eindeutiger Praefix fuer die SVG-clipPath-IDs dieser Mesh-Instanz.
   * Erforderlich, wenn beim Crossfade zwei Meshes gleichzeitig gerendert
   * werden, da clipPath-IDs ebenso dokumentweit gelten wie Filter-IDs. */
  clipIdPrefix?: string;
}

export function LowPolyMesh({
  facets,
  viewBox,
  center,
  scatterDistance = 140,
  chaosEnabled = false,
  className,
  time,
  chaosStartTime,
  progress,
  assemblyDirection,
  pointerX,
  pointerY,
  ariaLabel,
  imageUrl,
  tintColor,
  tintDarkMix,
  tintLightMix,
  tintFilterId = "photo-tint",
  clipIdPrefix = "low-poly",
}: LowPolyMeshProps) {
  const prefersReducedMotion = useReducedMotion();
  const imageSize = imageUrl ? parseViewBoxSize(viewBox) : undefined;
  const viewBoxSize = parseViewBoxSize(viewBox);
  // Screen-Space-Skalierung auf der festen 4:5-Hero-Buehne: Bei breiten
  // Motiven limitiert die viewBox-Breite, bei hohen die eingepasste Hoehe.
  // Dadurch entspricht eine Chaos-Referenzeinheit bei allen vier Motiven
  // derselben ungefaehren Pixelstrecke.
  const chaosUnitScale =
    Math.max(viewBoxSize.width, viewBoxSize.height * HERO_STAGE_ASPECT_RATIO) /
    SHARED_CHAOS_REFERENCE_WIDTH;
  const chaosCenter = {
    x: viewBoxSize.width / 2,
    y: viewBoxSize.height / 2,
  };
  const weldJunctions = findWeldJunctions(facets, center, viewBoxSize);
  const weldingEvents = buildWeldingEvents(weldJunctions, viewBoxSize, chaosUnitScale);
  const weldAmbientGradientId = `${clipIdPrefix}-weld-ambient`;
  const weldMetalGradientId = `${clipIdPrefix}-weld-metal`;
  const weldCoreFilterId = `${clipIdPrefix}-weld-core-glow`;
  const weldSparkGradientId = `${clipIdPrefix}-weld-sparks`;
  const weldSmokeGradientId = `${clipIdPrefix}-weld-smoke-fill`;
  const weldSmokeFilterId = `${clipIdPrefix}-weld-smoke-soften`;

  // Ein einziges Screen-Overlay pro realer Facette bleibt erhalten. Nur das
  // Zentrum des gemeinsam wiederverwendeten radialen Lichtfeldes springt in
  // den dunklen Pausen (Opacity=0) zum jeweils aktiven Event. So reagieren
  // nahe Facetten lokal, ohne Filter/Overlays pro Event zu vervielfachen.
  const weldMetalOpacity = useTransform(
    [progress, assemblyDirection],
    (values: number[]) => {
      const [value, direction] = values;
      const strongest = weldingEvents.reduce(
        (best, event) => Math.max(best, weldLightStrength(value, event)),
        0
      );
      return strongest * direction * 0.82;
    }
  );
  const weldMetalX = useTransform(progress, (value) =>
    dominantWeldingEvent(value, weldingEvents)?.junction.x ?? center.x
  );
  const weldMetalY = useTransform(progress, (value) =>
    dominantWeldingEvent(value, weldingEvents)?.junction.y ?? center.y
  );
  const weldMetalRadius = useTransform(
    progress,
    (value) =>
      (42 + (dominantWeldingEvent(value, weldingEvents)?.intensity ?? 0.5) * 9) *
      chaosUnitScale
  );

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

  // Scherben-Foto-Modus: knapp vor Vollmontage blendet ein unclipptes,
  // scharfes Voll-Bild ueber die Fragment-Mosaik ein - versteckt jede
  // Sub-Pixel-Naht, die SVG-clipPath an aneinanderstossenden Kanten durch
  // Anti-Aliasing erzeugen kann, sodass der verschweisste Endzustand
  // garantiert das scharfe Originalfoto zeigt statt einer Fragment-Collage.
  const weldImageOpacity = useTransform(progress, [0.985, 1], [0, 1]);

  if (prefersReducedMotion) {
    return (
      <svg viewBox={viewBox} className={className} role="img" aria-label={ariaLabel}>
        {imageUrl && imageSize ? (
          <>
            {tintColor && (
              <defs>
                <PhotoTintFilter
                  color={tintColor}
                  darkMix={tintDarkMix}
                  lightMix={tintLightMix}
                  id={tintFilterId}
                />
              </defs>
            )}
            <image
              href={imageUrl}
              x={0}
              y={0}
              width={imageSize.width}
              height={imageSize.height}
              preserveAspectRatio="xMidYMid slice"
              filter={tintColor ? `url(#${tintFilterId})` : undefined}
            />
          </>
        ) : (
          <>
            <ToneGradients />
            {facets.map((facet, i) => (
              <polygon
                key={i}
                points={facet.points}
                fill={`url(#grad-${facet.tone})`}
                stroke={SEAM_STROKE}
                strokeWidth={0.75}
              />
            ))}
          </>
        )}
      </svg>
    );
  }

  return (
    <div className="relative h-full w-full" style={{ perspective: 900 }}>
      <motion.div
        className="relative h-full w-full"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        <svg
          viewBox={viewBox}
          className={className}
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: "visible", position: "relative" }}
          role="img"
          aria-label={ariaLabel}
          data-weld-event-count={weldingEvents.length}
        >
          <ToneGradients />
          <defs>
            <radialGradient id={weldAmbientGradientId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f7feff" stopOpacity="0.68" />
              <stop offset="10%" stopColor="#a9efff" stopOpacity="0.5" />
              <stop offset="38%" stopColor="#31cfff" stopOpacity="0.2" />
              <stop offset="72%" stopColor="#147cab" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#147cab" stopOpacity="0" />
            </radialGradient>
            <motion.radialGradient
              id={weldMetalGradientId}
              gradientUnits="userSpaceOnUse"
              cx={weldMetalX}
              cy={weldMetalY}
              r={weldMetalRadius}
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
              <stop offset="12%" stopColor="#dcfaff" stopOpacity="0.88" />
              <stop offset="42%" stopColor="#66ddff" stopOpacity="0.46" />
              <stop offset="78%" stopColor="#2189b7" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#2189b7" stopOpacity="0" />
            </motion.radialGradient>
            <linearGradient id={weldSparkGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffdf0" />
              <stop offset="38%" stopColor="#ffd36a" />
              <stop offset="100%" stopColor="#ff792c" />
            </linearGradient>
            <radialGradient id={weldSmokeGradientId} cx="42%" cy="35%" r="68%">
              <stop offset="0%" stopColor="#dff8ff" stopOpacity="0.72" />
              <stop offset="28%" stopColor="#91aeb6" stopOpacity="0.48" />
              <stop offset="72%" stopColor="#4d585c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#343a3c" stopOpacity="0" />
            </radialGradient>
            <filter
              id={weldCoreFilterId}
              x="-220%"
              y="-220%"
              width="540%"
              height="540%"
            >
              <feGaussianBlur stdDeviation={1.55 * chaosUnitScale} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter
              id={weldSmokeFilterId}
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feGaussianBlur stdDeviation={3.2 * chaosUnitScale} />
            </filter>
          </defs>
          {tintColor && (
            <defs>
              <PhotoTintFilter
                color={tintColor}
                darkMix={tintDarkMix}
                lightMix={tintLightMix}
                id={tintFilterId}
              />
            </defs>
          )}
          {/* Hintere Fumes und Arcs liegen wirklich unter den Fotofacetten.
              Ihre Kontaktkerne werden verdeckt; sichtbar bleiben vor allem
              Silhouettenlicht und wenige herauslaufende Funken. */}
          {weldingEvents.map((event) =>
            event.depthLayer === "back" ? (
              <WeldSmoke
                key={`smoke-back-${event.id}`}
                event={event}
                unitScale={chaosUnitScale}
                progress={progress}
                assemblyDirection={assemblyDirection}
                time={time}
                gradientId={weldSmokeGradientId}
                filterId={weldSmokeFilterId}
              />
            ) : null
          )}
          {weldingEvents.map((event) => (
            <WeldAmbient
              key={`ambient-${event.id}`}
              event={event}
              unitScale={chaosUnitScale}
              progress={progress}
              assemblyDirection={assemblyDirection}
              gradientId={weldAmbientGradientId}
            />
          ))}
          {weldingEvents.map((event) =>
            event.depthLayer === "back" ? (
              <WeldArc
                key={`arc-back-${event.id}`}
                event={event}
                unitScale={chaosUnitScale}
                progress={progress}
                assemblyDirection={assemblyDirection}
                coreFilterId={weldCoreFilterId}
                sparkGradientId={weldSparkGradientId}
              />
            ) : null
          )}
          {facets.map((facet, i) => (
            <Facet
              key={i}
              facet={facet}
              index={i}
              center={center}
              scatterDistance={scatterDistance}
              chaosEnabled={chaosEnabled}
              chaosUnitScale={chaosUnitScale}
              chaosCenter={chaosCenter}
              time={time}
              chaosStartTime={chaosStartTime}
              progress={progress}
              pointerX={pointerX}
              pointerY={pointerY}
              imageUrl={imageUrl}
              imageSize={imageSize}
              tintColor={tintColor}
              tintFilterId={tintFilterId}
              weldMetalOpacity={weldMetalOpacity}
              weldMetalGradientId={weldMetalGradientId}
              idPrefix={`${clipIdPrefix}-main`}
            />
          ))}
          {/* Mittlere Fumes liegen zwischen Fragment-Mosaik und finalem
              Vollbild. Mid-/Front-Arcs bleiben kompakt oberhalb der
              Fragmentlage, feuern aber nie gleichzeitig mit Back-Events. */}
          {weldingEvents.map((event) =>
            event.depthLayer === "mid" ? (
              <WeldSmoke
                key={`smoke-mid-${event.id}`}
                event={event}
                unitScale={chaosUnitScale}
                progress={progress}
                assemblyDirection={assemblyDirection}
                time={time}
                gradientId={weldSmokeGradientId}
                filterId={weldSmokeFilterId}
              />
            ) : null
          )}
          {weldingEvents.map((event) =>
            event.depthLayer !== "back" ? (
              <WeldArc
                key={`arc-${event.depthLayer}-${event.id}`}
                event={event}
                unitScale={chaosUnitScale}
                progress={progress}
                assemblyDirection={assemblyDirection}
                coreFilterId={weldCoreFilterId}
                sparkGradientId={weldSparkGradientId}
              />
            ) : null
          )}
          {imageUrl && imageSize && (
            <motion.image
              href={imageUrl}
              x={0}
              y={0}
              width={imageSize.width}
              height={imageSize.height}
              preserveAspectRatio="xMidYMid slice"
              pointerEvents="none"
              filter={tintColor ? `url(#${tintFilterId})` : undefined}
              style={{ opacity: weldImageOpacity }}
            />
          )}
          {/* Die elektrische Aktivitaet endet vor 0.985. Danach bleiben nur
              kurze echte Kantenabschnitte thermisch sichtbar und die
              sparsame vordere Fume-Schicht steigt noch aus. */}
          {weldingEvents.map((event) => (
            <WeldAfterglow
              key={`seam-${event.id}`}
              event={event}
              unitScale={chaosUnitScale}
              progress={progress}
              assemblyDirection={assemblyDirection}
              time={time}
            />
          ))}
          {weldingEvents.map((event) =>
            event.depthLayer === "front" ? (
              <WeldSmoke
                key={`smoke-front-${event.id}`}
                event={event}
                unitScale={chaosUnitScale}
                progress={progress}
                assemblyDirection={assemblyDirection}
                time={time}
                gradientId={weldSmokeGradientId}
                filterId={weldSmokeFilterId}
              />
            ) : null
          )}
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
                chaosEnabled={chaosEnabled}
                chaosUnitScale={chaosUnitScale}
                chaosCenter={chaosCenter}
                time={time}
                chaosStartTime={chaosStartTime}
                progress={progress}
                pointerX={pointerX}
                pointerY={pointerY}
                imageUrl={imageUrl}
                imageSize={imageSize}
                tintColor={tintColor}
                tintFilterId={tintFilterId}
                idPrefix={`${clipIdPrefix}-reflection`}
              />
            ))}
            {imageUrl && imageSize && (
              <motion.image
                href={imageUrl}
                x={0}
                y={0}
                width={imageSize.width}
                height={imageSize.height}
                preserveAspectRatio="xMidYMid slice"
                pointerEvents="none"
                filter={tintColor ? `url(#${tintFilterId})` : undefined}
                style={{ opacity: weldImageOpacity }}
              />
            )}
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
