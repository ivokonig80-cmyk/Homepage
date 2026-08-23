"use client";

import { useRef, useSyncExternalStore } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

const subscribeHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

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

// Node und Browser koennen bei trigonometrischen Funktionen in den letzten
// Binärstellen voneinander abweichen. SVG-Attribute behalten diese Stellen,
// waehrend Chromium CSS-Transforms beim Parsen auf drei Nachkommastellen
// normalisiert. Nur die gerenderte Ausgabe wird deshalb stabilisiert; die
// MotionValues und damit die eigentliche Animationsphysik bleiben ungerundet.
function stableSvgValue(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function stableCssTransformValue(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

const UNIVERSAL_SOURCE_VIEW_BOX = "0 0 240 300";
const UNIVERSAL_SOURCE_WIDTH = 240;
const UNIVERSAL_SOURCE_HEIGHT = 300;
const UNIVERSAL_SOURCE_SLOT_COUNT = 18;
const ADDITIONAL_SOURCE_SLOT_COUNT = 18;
const UNIVERSAL_SOURCE_HOT_BEAD_COUNT = 12;
const UNIVERSAL_SOURCE_SPARK_REMNANT_COUNT = 4;
const UNIVERSAL_SOURCE_CENTER = { x: 146, y: 177 };
const SOURCE_HANDOFF_RESIDUE_MS = 2800;
const SOURCE_HOT_PARTICLE_COOLDOWN_MS = 4500;
const SOURCE_LIGHT_SLOT_INDICES = [1, 5, 8, 10, 14, 17] as const;

type UniversalSourceZone = "outer" | "mixing" | "core";
type SourceFragmentSize = "small" | "medium" | "large";
type SourceDepthPlane = "back" | "mid" | "front";

interface UniversalSourceSlot {
  zone: UniversalSourceZone;
  flowGroup: number;
  flowLagMs: number;
  flowTimeScale: number;
  tumbleScale: number;
  gravityScale: number;
  parallaxScale: number;
  rollPhase: number;
  gustBias: number;
  x: number;
  y: number;
  depth: number;
  rotation: number;
  phase: number;
  speed: number;
  scaleBias: number;
  orbitX: number;
  orbitY: number;
  captureX: number;
  captureY: number;
  captureSpin: number;
  fallDelay: number;
  restX: number;
  restY: number;
  restRotation: number;
  points: string;
}

interface NeutralSourceSlot extends UniversalSourceSlot {
  sizeClass: SourceFragmentSize;
  depthPlane: SourceDepthPlane;
  sourceXUnit: number;
  sourceYUnit: number;
}

interface SharedSourceBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  fallDistance: number;
  restMinX: number;
  restMaxX: number;
  sourceMinY: number;
  sourceMaxY: number;
}

/** Integer-basierter, plattformstabiler Hash fuer die neue universelle
 * Quelle. Anders als `seeded()` benoetigt er keine trigonometrische Funktion
 * und liefert deshalb bereits vor der Render-Quantisierung exakt dasselbe
 * Ergebnis in Node und im Browser. */
function sourceRandom(seed: number): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_296;
}

interface UniversalSourceFlowGroup {
  phase: number;
  headingSpeed: number;
  mergeSpeed: number;
  baseAngle: number;
  strength: number;
}

// Drei guenstige, deterministische Vektorfelder statt einer O(n²)-Boids-
// Simulation. Jede Gruppe besitzt eine gemeinsame Reiserichtung und einen
// langsamen Trennen-/Zusammenfinden-Zyklus. Ein kleiner Lag pro Platte laesst
// einzelne Teile nachlaufen oder ueberschiessen, ohne die Gruppensprache zu
// verlieren.
const UNIVERSAL_SOURCE_FLOW_GROUPS: UniversalSourceFlowGroup[] = Array.from(
  { length: 3 },
  (_, index) => ({
    phase: sourceRandom(index * 37 + 401) * Math.PI * 2,
    headingSpeed: 0.00016 + sourceRandom(index * 41 + 409) * 0.00008,
    mergeSpeed: 0.0001 + sourceRandom(index * 43 + 419) * 0.000055,
    baseAngle: (sourceRandom(index * 47 + 431) - 0.5) * Math.PI * 1.2,
    strength: 0.86 + sourceRandom(index * 53 + 443) * 0.28,
  })
);

function sourceFlowSample(slot: UniversalSourceSlot, timeMs: number) {
  const group = UNIVERSAL_SOURCE_FLOW_GROUPS[slot.flowGroup];
  const laggedTime = timeMs * slot.flowTimeScale - slot.flowLagMs;
  const heading =
    group.baseAngle +
    Math.sin(laggedTime * group.headingSpeed + group.phase) * 1.05 +
    Math.sin(laggedTime * 0.000073 + group.phase * 1.8) * 0.48;
  const mergeCycle =
    0.58 +
    smoothStep((Math.sin(laggedTime * group.mergeSpeed + group.phase * 0.7) + 1) / 2) * 0.42;
  const gust = Math.max(0, Math.sin(laggedTime * 0.00039 + slot.gustBias)) ** 3;
  const zoneMagnitude = slot.zone === "outer" ? 39 : slot.zone === "mixing" ? 28 : 13;
  const depthTravel = 0.8 + slot.depth * 0.2;
  const groupMagnitude =
    zoneMagnitude * group.strength * depthTravel * mergeCycle +
    gust * (slot.zone === "outer" ? 18 : slot.zone === "mixing" ? 11 : 5);
  // Der globale Bogen haelt die drei Subflows als EINEN Schwarm lesbar.
  const globalHeading =
    Math.sin(timeMs * 0.00012 + 0.35) * 1.05 + Math.sin(timeMs * 0.000052 + 2.4) * 0.55;
  const globalMagnitude = 14 + Math.sin(timeMs * 0.00009 + 0.8) * 6;

  return {
    x: Math.cos(heading) * groupMagnitude + Math.cos(globalHeading) * globalMagnitude,
    y: Math.sin(heading) * groupMagnitude * 0.66 + Math.sin(globalHeading) * globalMagnitude * 0.58,
    turn:
      (Math.sin(laggedTime * group.headingSpeed + group.phase) * 19 +
        Math.sin(laggedTime * 0.00072 + slot.rollPhase) * (10 + gust * 12)) *
      slot.tumbleScale,
  };
}

function sourcePlateForeshorten(slot: UniversalSourceSlot, timeMs: number): number {
  const roll = Math.sin(timeMs * (0.00058 + slot.speed * 0.00017) + slot.rollPhase);
  return 0.62 + Math.abs(roll) * 0.42;
}

// Eine einzige, motivunabhaengige 4:5-Buehne. Acht lose Outer-, sechs
// Mixing- und vier Core-Slots bilden ein grosses raeumliches Materialfeld
// um denselben bisherigen Anker. Reale Modellfacetten werden spaeter in
// ihre jeweilige viewBox zurueckgemappt; Position und Zonentiefe der Quelle
// bleiben dabei fuer alle Slides identisch.
const UNIVERSAL_SOURCE_SLOTS: UniversalSourceSlot[] = Array.from(
  { length: UNIVERSAL_SOURCE_SLOT_COUNT },
  (_, index) => {
    const zone: UniversalSourceZone = index < 8 ? "outer" : index < 14 ? "mixing" : "core";
    const angle = index * 2.3999632297 + (sourceRandom(index + 11) - 0.5) * 0.78;
    // Keine gleichmaessige Ringverteilung: zwei Outer-Slots duerfen als
    // echte Fernlaeufer bis an den Rand des visuellen Feldes wandern, die
    // uebrigen bilden eine breite Hauptmasse. Mixing bleibt deutlich
    // raeumlich, waehrend der technische Core klein und untergeordnet bleibt.
    const isOuterOutlier = zone === "outer" && index < 2;
    const radiusBase = isOuterOutlier
      ? 1.18
      : zone === "outer"
        ? 0.56
        : zone === "mixing"
          ? 0.38
          : 0.08;
    const radiusRange = isOuterOutlier
      ? 0.24
      : zone === "outer"
        ? 0.52
        : zone === "mixing"
          ? 0.54
          : 0.3;
    const radius = radiusBase + Math.sqrt(sourceRandom(index + 29)) * radiusRange;
    // Die 4:5-Quellbuehne skaliert bereits mit der responsiven Hero-Stage.
    // Groessere Referenzradien ergeben deshalb dieselbe wahrgenommene
    // Bildschirmspanne auf Desktop und Narrow, ohne Pixel-Breakpoints.
    const radiusX = zone === "outer" ? 154 : zone === "mixing" ? 98 : 29;
    const radiusY = zone === "outer" ? 116 : zone === "mixing" ? 74 : 22;
    // Deutlich tiefere Staffelung: entfernte Platten werden klein und ruhig,
    // nahe Platten klar praesent, ohne die maximale Groesse zu ueberziehen.
    const depthBase = zone === "outer" ? 0.34 : zone === "mixing" ? 0.5 : 0.76;
    const depthRange = zone === "outer" ? 1.42 : zone === "mixing" ? 1.02 : 0.48;
    const depth = depthBase + sourceRandom(index + 47) * depthRange;
    const shardWidth =
      (zone === "outer" ? 7.5 : zone === "mixing" ? 6.5 : 5.5) +
      sourceRandom(index + 61) * (zone === "outer" ? 7.5 : 6.5);
    const shardHeight =
      (zone === "outer" ? 5.5 : zone === "mixing" ? 5 : 4) +
      sourceRandom(index + 73) * (zone === "outer" ? 8 : 7);
    const skew = (sourceRandom(index + 89) - 0.5) * shardWidth * 0.7;
    const captureDistance = zone === "outer" ? 28 : zone === "mixing" ? 19 : 10;
    const captureAngle = angle + Math.PI / 2 + (sourceRandom(index + 193) - 0.5) * 0.5;

    return {
      zone,
      flowGroup: index % UNIVERSAL_SOURCE_FLOW_GROUPS.length,
      flowLagMs: (sourceRandom(index + 457) - 0.42) * 360,
      flowTimeScale: 1,
      tumbleScale: 1,
      gravityScale: 1,
      parallaxScale: 1,
      rollPhase: sourceRandom(index + 461) * Math.PI * 2,
      gustBias: sourceRandom(index + 467) * Math.PI * 2,
      x: stableSvgValue(
        UNIVERSAL_SOURCE_CENTER.x + Math.cos(angle) * radius * radiusX
      ),
      y: stableSvgValue(
        UNIVERSAL_SOURCE_CENTER.y + Math.sin(angle) * radius * radiusY
      ),
      depth,
      rotation: (sourceRandom(index + 101) - 0.5) * 320,
      phase: sourceRandom(index + 127) * Math.PI * 2,
      speed:
        (zone === "outer" ? 0.62 : zone === "mixing" ? 0.82 : 0.94) +
        sourceRandom(index + 137) * (zone === "outer" ? 0.2 : 0.24),
      scaleBias:
        (zone === "outer" ? 0.7 : zone === "mixing" ? 0.76 : 0.82) +
        sourceRandom(index + 149) * (zone === "outer" ? 0.7 : zone === "mixing" ? 0.56 : 0.4),
      orbitX:
        (zone === "outer" ? 12 : zone === "mixing" ? 8 : 4) +
        sourceRandom(index + 167) * (zone === "outer" ? 12 : zone === "mixing" ? 8 : 5),
      orbitY:
        (zone === "outer" ? 9 : zone === "mixing" ? 6 : 3) +
        sourceRandom(index + 181) * (zone === "outer" ? 10 : zone === "mixing" ? 7 : 4),
      captureX: Math.cos(captureAngle) * captureDistance,
      captureY: Math.sin(captureAngle) * captureDistance * 0.78,
      captureSpin: (sourceRandom(index + 211) - 0.5) * (zone === "outer" ? 190 : 130),
      fallDelay: sourceRandom(index + 227) * 0.075,
      restX: -72 + sourceRandom(index + 241) * 362,
      restY: (sourceRandom(index + 257) - 0.5) * 15,
      restRotation: 82 + (sourceRandom(index + 269) - 0.5) * 28,
      points: [
        `${stableSvgValue(-shardWidth * 0.58)},${stableSvgValue(shardHeight * 0.42)}`,
        `${stableSvgValue(skew)},${stableSvgValue(-shardHeight * 0.58)}`,
        `${stableSvgValue(shardWidth * 0.58)},${stableSvgValue(shardHeight * 0.36)}`,
      ].join(" "),
    };
  }
);

// Begrenzter, rein neutraler Zusatzpool. Die bestehenden 18 Slots bleiben
// unveraendert und bilden weiterhin allein das Mapping-Ziel der realen
// Modellfacetten. Diese zusaetzlichen Platten erhoehen nur die sichtbare
// Materialmenge und laufen durch exakt dasselbe Flow-/Fall-/Return-System.
const ADDITIONAL_MIXING_INDICES = new Set([2, 5, 8, 11, 13, 14]);

const ADDITIONAL_SOURCE_SLOTS: NeutralSourceSlot[] = Array.from(
  { length: ADDITIONAL_SOURCE_SLOT_COUNT },
  (_, index) => {
    const seedIndex = 10_000 + index * 97;
    const sizeClass: SourceFragmentSize =
      index < 9 ? "small" : index < 15 ? "medium" : "large";
    const depthPlane: SourceDepthPlane =
      index < 6 || index === 9 || index === 10
        ? "back"
        : index < 9 || index < 15
          ? "mid"
          : "front";
    const zone: UniversalSourceZone = ADDITIONAL_MIXING_INDICES.has(index)
      ? "mixing"
      : "outer";
    const depthBase = depthPlane === "back" ? 0.3 : depthPlane === "mid" ? 0.68 : 1.18;
    const depthRange = depthPlane === "back" ? 0.28 : depthPlane === "mid" ? 0.44 : 0.32;
    const depth = depthBase + sourceRandom(seedIndex + 47) * depthRange;
    const shardWidth =
      sizeClass === "small"
        ? 6 + sourceRandom(seedIndex + 61) * 5
        : sizeClass === "medium"
          ? 10 + sourceRandom(seedIndex + 61) * 7
          : 18 + sourceRandom(seedIndex + 61) * 12;
    const shardHeight =
      sizeClass === "small"
        ? 4 + sourceRandom(seedIndex + 73) * 4
        : sizeClass === "medium"
          ? 7 + sourceRandom(seedIndex + 73) * 5
          : 12 + sourceRandom(seedIndex + 73) * 9;
    const skew = (sourceRandom(seedIndex + 89) - 0.5) * shardWidth * 0.7;
    const captureDistance =
      sizeClass === "large" ? 34 : zone === "outer" ? 28 : 19;
    const angle =
      index * 2.3999632297 +
      (sourceRandom(seedIndex + 11) - 0.5) * 0.92 +
      Math.PI * 0.37;
    const captureAngle =
      angle + Math.PI / 2 + (sourceRandom(seedIndex + 193) - 0.5) * 0.5;
    const points =
      sizeClass === "small"
        ? [
            `${stableSvgValue(-shardWidth * 0.58)},${stableSvgValue(shardHeight * 0.42)}`,
            `${stableSvgValue(skew)},${stableSvgValue(-shardHeight * 0.58)}`,
            `${stableSvgValue(shardWidth * 0.58)},${stableSvgValue(shardHeight * 0.36)}`,
          ]
        : sizeClass === "medium"
          ? [
              `${stableSvgValue(-shardWidth * 0.56)},${stableSvgValue(shardHeight * 0.31)}`,
              `${stableSvgValue(-shardWidth * 0.27 + skew * 0.2)},${stableSvgValue(-shardHeight * 0.55)}`,
              `${stableSvgValue(shardWidth * 0.43 + skew * 0.16)},${stableSvgValue(-shardHeight * 0.34)}`,
              `${stableSvgValue(shardWidth * 0.58)},${stableSvgValue(shardHeight * 0.28)}`,
            ]
          : [
              `${stableSvgValue(-shardWidth * 0.58)},${stableSvgValue(shardHeight * 0.34)}`,
              `${stableSvgValue(-shardWidth * 0.42 + skew * 0.16)},${stableSvgValue(-shardHeight * 0.42)}`,
              `${stableSvgValue(shardWidth * 0.08 + skew * 0.18)},${stableSvgValue(-shardHeight * 0.6)}`,
              `${stableSvgValue(shardWidth * 0.58)},${stableSvgValue(-shardHeight * 0.12)}`,
              `${stableSvgValue(shardWidth * 0.4)},${stableSvgValue(shardHeight * 0.45)}`,
            ];

    return {
      sizeClass,
      depthPlane,
      zone,
      flowGroup: index % UNIVERSAL_SOURCE_FLOW_GROUPS.length,
      flowLagMs:
        sizeClass === "small"
          ? -80 + sourceRandom(seedIndex + 457) * 240
          : sizeClass === "medium"
            ? 140 + sourceRandom(seedIndex + 457) * 220
            : 420 + sourceRandom(seedIndex + 457) * 300,
      flowTimeScale:
        sizeClass === "small"
          ? 1.08 + sourceRandom(seedIndex + 459) * 0.18
          : sizeClass === "medium"
            ? 0.86 + sourceRandom(seedIndex + 459) * 0.12
            : 0.58 + sourceRandom(seedIndex + 459) * 0.14,
      tumbleScale: sizeClass === "small" ? 0.9 : sizeClass === "medium" ? 1.04 : 1.3,
      gravityScale: sizeClass === "small" ? 0.94 : sizeClass === "medium" ? 1 : 1.1,
      parallaxScale: depthPlane === "back" ? 0.58 : depthPlane === "mid" ? 0.9 : 1.2,
      rollPhase: sourceRandom(seedIndex + 461) * Math.PI * 2,
      gustBias: sourceRandom(seedIndex + 467) * Math.PI * 2,
      sourceXUnit: stableSvgValue(0.04 + sourceRandom(seedIndex + 31) * 0.92),
      sourceYUnit: stableSvgValue(0.06 + sourceRandom(seedIndex + 37) * 0.88),
      x: UNIVERSAL_SOURCE_CENTER.x,
      y: UNIVERSAL_SOURCE_CENTER.y,
      depth,
      rotation: (sourceRandom(seedIndex + 101) - 0.5) * 320,
      phase: sourceRandom(seedIndex + 127) * Math.PI * 2,
      speed:
        sizeClass === "small"
          ? 1.04 + sourceRandom(seedIndex + 137) * 0.22
          : sizeClass === "medium"
            ? 0.78 + sourceRandom(seedIndex + 137) * 0.22
            : 0.56 + sourceRandom(seedIndex + 137) * 0.16,
      scaleBias:
        sizeClass === "small"
          ? 1.05 + sourceRandom(seedIndex + 149) * 0.3
          : sizeClass === "medium"
            ? 0.9 + sourceRandom(seedIndex + 149) * 0.3
            : 0.9 + sourceRandom(seedIndex + 149) * 0.22,
      orbitX:
        sizeClass === "large"
          ? 20 + sourceRandom(seedIndex + 167) * 14
          : (zone === "outer" ? 12 : 8) + sourceRandom(seedIndex + 167) * 12,
      orbitY:
        sizeClass === "large"
          ? 14 + sourceRandom(seedIndex + 181) * 11
          : (zone === "outer" ? 9 : 6) + sourceRandom(seedIndex + 181) * 10,
      captureX: Math.cos(captureAngle) * captureDistance,
      captureY: Math.sin(captureAngle) * captureDistance * 0.78,
      captureSpin:
        (sourceRandom(seedIndex + 211) - 0.5) *
        (sizeClass === "large" ? 420 : zone === "outer" ? 190 : 130),
      fallDelay:
        sizeClass === "small"
          ? 0.045 + sourceRandom(seedIndex + 227) * 0.065
          : sizeClass === "medium"
            ? 0.015 + sourceRandom(seedIndex + 227) * 0.06
            : sourceRandom(seedIndex + 227) * 0.035,
      restX: -72 + sourceRandom(seedIndex + 241) * 362,
      restY: (sourceRandom(seedIndex + 257) - 0.5) * 15,
      restRotation: 82 + (sourceRandom(seedIndex + 269) - 0.5) * 28,
      points: points.join(" "),
    };
  }
);

interface SourceHotParticleGeometry {
  kind: "bead" | "spark";
  depthClass: SourceDepthPlane;
  slotIndex: number;
  delay: number;
  radius: number;
  launchX: number;
  launchY: number;
  gravity: number;
  lifeEnd: number;
  restUnit: number;
}

const SOURCE_HOT_PARTICLE_SLOT_INDICES = [
  0, 2, 3, 4, 7,
  9, 10, 11, 13, 15,
  5, 8,
  0, 7, 11, 1,
] as const;

const SOURCE_HOT_PARTICLES: SourceHotParticleGeometry[] = Array.from(
  { length: UNIVERSAL_SOURCE_HOT_BEAD_COUNT + UNIVERSAL_SOURCE_SPARK_REMNANT_COUNT },
  (_, index) => {
    const kind = index < UNIVERSAL_SOURCE_HOT_BEAD_COUNT ? "bead" : "spark";
    const particleIndex =
      kind === "bead" ? index : index - UNIVERSAL_SOURCE_HOT_BEAD_COUNT;
    const depthClass: SourceDepthPlane =
      (kind === "bead" && index < 5) || (kind === "spark" && particleIndex < 2)
        ? "back"
        : (kind === "bead" && index < 10) || (kind === "spark" && particleIndex === 2)
          ? "mid"
          : "front";
    const angle = -1.38 + (sourceRandom(index + 601) - 0.5) * (kind === "bead" ? 1.05 : 1.42);
    const launchDistance =
      kind === "bead"
        ? 7 + sourceRandom(index + 613) * 11
        : 20 + sourceRandom(index + 613) * 18;
    const depthRadius = depthClass === "back" ? 0.72 : depthClass === "mid" ? 0.94 : 1.14;
    const lifeEnd =
      kind === "spark"
        ? 0.58 + sourceRandom(index + 653) * 0.14
        : depthClass === "back"
          ? 0.82 + sourceRandom(index + 653) * 0.18
          : depthClass === "mid"
            ? 1 + sourceRandom(index + 653) * 0.2
            : 1.25 + sourceRandom(index + 653) * 0.15;
    return {
      kind,
      depthClass,
      slotIndex: SOURCE_HOT_PARTICLE_SLOT_INDICES[index],
      delay: stableSvgValue(
        kind === "bead"
          ? (index % 6) * 0.032 + Math.floor(index / 6) * 0.025
          : 0.045 + particleIndex * 0.036
      ),
      radius: stableSvgValue(
        (kind === "bead"
          ? 1 + sourceRandom(index + 631) * 0.74
          : 0.72 + sourceRandom(index + 631) * 0.38) * depthRadius
      ),
      launchX: stableSvgValue(Math.cos(angle) * launchDistance),
      launchY: stableSvgValue(Math.sin(angle) * launchDistance),
      gravity: stableSvgValue(
        kind === "bead"
          ? 25 + sourceRandom(index + 647) * 17
          : 40 + sourceRandom(index + 647) * 22
      ),
      lifeEnd: stableSvgValue(lifeEnd),
      restUnit: stableSvgValue(0.05 + sourceRandom(index + 659) * 0.9),
    };
  }
);

function sourceSlotForFacet(
  points: [number, number][],
  index: number
): UniversalSourceSlot {
  // Facettenform und Index gehen gemeinsam in den Hash ein. Damit mappen
  // unterschiedliche Modelle nicht blind indexgleich, das Ergebnis bleibt
  // aber fuer jede reale Facette ueber alle Render hinweg stabil.
  let hash = (2_166_136_261 ^ Math.imul(index + 1, 16_777_619)) >>> 0;
  points.forEach(([x, y]) => {
    hash = Math.imul(hash ^ Math.round(x * 10), 16_777_619) >>> 0;
    hash = Math.imul(hash ^ Math.round(y * 10), 16_777_619) >>> 0;
  });
  return UNIVERSAL_SOURCE_SLOTS[hash % UNIVERSAL_SOURCE_SLOT_COUNT];
}

function sourceDepthPlaneFor(depth: number): SourceDepthPlane {
  return depth < 0.62 ? "back" : depth > 1.18 ? "front" : "mid";
}

function SharedSourceShard({
  slot,
  index,
  sourceKind,
  neutralIndex,
  sizeClass,
  depthPlane,
  sourceX,
  sourceY,
  time,
  sourceProgress,
  handoffAge,
  fallProgress,
  returnForce,
  fallDistance,
  restMinX,
  restMaxX,
  pointerX,
  pointerY,
}: {
  slot: UniversalSourceSlot;
  index: number;
  sourceKind: "base" | "neutral";
  neutralIndex?: number;
  sizeClass?: SourceFragmentSize;
  depthPlane: SourceDepthPlane;
  sourceX?: number;
  sourceY?: number;
  time: MotionValue<number>;
  sourceProgress: MotionValue<number>;
  handoffAge: MotionValue<number>;
  fallProgress: MotionValue<number>;
  returnForce: MotionValue<number>;
  fallDistance: number;
  restMinX: number;
  restMaxX: number;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}) {
  const anchorX = sourceX ?? slot.x;
  const anchorY = sourceY ?? slot.y;
  const depthN = clamp01((slot.depth - 0.34) / 1.42);
  const massN = clamp01((slot.depth * slot.scaleBias - 0.25) / 1.9);
  const restUnit = clamp01((slot.restX + 72) / 362);
  const restBaseX = restMinX + (restMaxX - restMinX) * restUnit;
  const x = useTransform(
    [time, pointerX, fallProgress, returnForce, sourceProgress],
    (values: number[]) => {
      const progress = values[2];
      if (values[4] <= 0.081 && progress <= 0.0001 && values[3] <= 0.001) {
        return stableCssTransformValue(anchorX);
      }
      const settle = smoothStep((progress - 0.68) / 0.32);
      const spread = smoothStep((progress - 0.05) / 0.67) * (1 - settle);
      const flow = sourceFlowSample(slot, values[0]);
      const returnRelease = smoothStep(
        (1 - progress - (0.015 + massN * 0.09 + slot.fallDelay * 0.25)) / 0.24
      );
      const returnEnvelope =
        values[3] * returnRelease * smoothStep(progress / 0.22);
      const sourceX =
        anchorX +
          flow.x * (1 - progress * 0.18) +
          Math.sin(values[0] * 0.00053 * slot.speed + slot.phase) * slot.orbitX +
          Math.sin(values[0] * 0.00117 * slot.speed + slot.phase * 1.73) * slot.orbitX * 0.32 +
          values[1] *
            (slot.depth - 0.72) *
            19 *
            slot.parallaxScale *
            (1 - smoothStep(progress)) +
          Math.sin(values[0] * 0.00029 * slot.speed + slot.phase * 2.1) *
            slot.orbitX *
            0.62 *
            smoothStep(progress) *
            (1 - progress * 0.72);
      const fallingX =
        sourceX +
        (restBaseX - sourceX) * spread * (0.42 + depthN * 0.2) +
        (anchorX - UNIVERSAL_SOURCE_CENTER.x) * spread * (0.1 + depthN * 0.1) +
        slot.captureX * Math.sin(progress * Math.PI) * (0.45 + depthN * 0.35) +
        returnEnvelope *
          (slot.captureX * 0.72 +
            Math.sin(slot.phase + slot.flowGroup * 2.1) * 18 +
            flow.x * 0.22);
      const restingX =
        restBaseX + Math.sin(values[0] * 0.00012 + slot.phase * 1.37) * 1.7;
      return stableCssTransformValue(fallingX + (restingX - fallingX) * settle);
    }
  );
  const y = useTransform(
    [time, pointerY, fallProgress, returnForce, sourceProgress],
    (values: number[]) => {
      const progress = values[2];
      if (values[4] <= 0.081 && progress <= 0.0001 && values[3] <= 0.001) {
        return stableCssTransformValue(anchorY);
      }
      const delayedFall = smoothStep(
        (progress - slot.fallDelay) / (1 - slot.fallDelay)
      );
      const depthFall = Math.pow(delayedFall, 1.14 - depthN * 0.3);
      const settle = smoothStep((progress - 0.68) / 0.32);
      const flow = sourceFlowSample(slot, values[0]);
      const returnRelease = smoothStep(
        (1 - progress - (0.015 + massN * 0.09 + slot.fallDelay * 0.25)) / 0.24
      );
      const returnEnvelope =
        values[3] * returnRelease * smoothStep(progress / 0.22);
      const wholeFall = fallDistance * progress;
      const dragDelta = fallDistance * (depthFall - progress) * 0.32;
      const fallDepthPlane =
        fallDistance * Math.sin(Math.PI * progress) * (depthN - 0.5) * 0.14;
      const massGravity =
        fallDistance * Math.sin(Math.PI * progress) * (slot.gravityScale - 1) * 0.26;
      const fallingY =
        anchorY +
          flow.y * (1 - progress * 0.42) +
          Math.sin(values[0] * 0.00041 * slot.speed + slot.phase * 1.31) * slot.orbitY +
          Math.cos(values[0] * 0.00091 * slot.speed + slot.phase * 0.67) * slot.orbitY * 0.38 +
          values[1] *
            (slot.depth - 0.72) *
            14 *
            slot.parallaxScale *
            (1 - delayedFall) +
          wholeFall +
          dragDelta +
          fallDepthPlane -
          returnEnvelope *
            (18 + (1 - massN) * 32 + (slot.zone === "outer" ? 8 : 0)) +
          massGravity;
      const residualStrength = 0.7 + (1 - depthN) * 0.8;
      const restingY =
        UNIVERSAL_SOURCE_CENTER.y +
        fallDistance +
        slot.restY * 2.2 +
        (depthN - 0.5) * 20 +
        Math.sin(values[0] * 0.0001 + slot.phase) * 1.15 * residualStrength;
      return stableCssTransformValue(fallingY + (restingY - fallingY) * settle);
    }
  );
  const rotate = useTransform(
    [time, fallProgress, returnForce, sourceProgress],
    (values: number[]) => {
      const progress = values[1];
      if (values[3] <= 0.081 && progress <= 0.0001 && values[2] <= 0.001) {
        return stableCssTransformValue(slot.rotation);
      }
      const settle = smoothStep((progress - 0.68) / 0.32);
      const returnRelease = smoothStep(
        (1 - progress - (0.015 + massN * 0.09 + slot.fallDelay * 0.25)) / 0.24
      );
      const returnEnvelope =
        values[2] * returnRelease * smoothStep(progress / 0.22);
      const fallingRotation =
        slot.rotation +
          sourceFlowSample(slot, values[0]).turn +
          Math.sin(values[0] * 0.00037 * slot.speed + slot.phase) * 34 +
          Math.sin(values[0] * 0.00083 * slot.speed + slot.phase * 1.9) * 13 +
          smoothStep(progress) * slot.captureSpin * 0.24 +
          returnEnvelope * slot.captureSpin * 0.14;
      const restingRotation =
        82 +
        (slot.restRotation - 82) * 1.6 +
        (depthN - 0.5) * 10 +
        Math.sin(values[0] * 0.00009 + slot.phase * 0.73) * 1.8;
      return stableCssTransformValue(
        fallingRotation + (restingRotation - fallingRotation) * settle
      );
    }
  );
  const scale = useTransform(
    [time, fallProgress, sourceProgress],
    (values: number[]) => {
      if (values[2] <= 0.081 && values[1] <= 0.0001) {
        return stableCssTransformValue(slot.depth * slot.scaleBias);
      }
      return stableCssTransformValue(
        slot.depth *
          slot.scaleBias *
          (0.94 + Math.sin(values[0] * 0.00046 * slot.speed + slot.phase * 1.43) * 0.09) *
          (1 + Math.sin(Math.PI * values[1]) * (depthN - 0.5) * 0.16)
      );
    }
  );
  const scaleX = useTransform(
    [time, sourceProgress, fallProgress],
    (values: number[]) =>
      stableCssTransformValue(
        sourcePlateForeshorten(
          slot,
          values[1] <= 0.081 && values[2] <= 0.0001 ? 0 : values[0]
        )
      )
  );
  const scaleY = useTransform(scaleX, (value) =>
    stableCssTransformValue(1 + (1 - value) * 0.16)
  );
  const skewX = useTransform(
    [time, sourceProgress, fallProgress],
    (values: number[]) =>
      stableCssTransformValue(
        Math.sin(
          (values[1] <= 0.081 && values[2] <= 0.0001 ? 0 : values[0]) * 0.00067 +
            slot.rollPhase * 1.3
        ) * 7
      )
  );
  const opacity = useTransform([sourceProgress, fallProgress], (values: number[]) => {
    const reveal = smoothStep((values[0] - 0.08) / 0.82);
    const depthReadability = smoothStep((slot.depth - 0.28) / 1.5);
    const zoneBase = slot.zone === "outer" ? 0.14 : slot.zone === "mixing" ? 0.2 : 0.24;
    const depthOpacity = slot.zone === "outer" ? 0.58 : slot.zone === "mixing" ? 0.5 : 0.36;
    const fallDepthDamping = 1 - smoothStep(values[1]) * (1 - depthReadability) * 0.18;
    const neutralPlaneOpacity =
      sourceKind === "neutral"
        ? depthPlane === "back"
          ? 0.78
          : depthPlane === "mid"
            ? 0.94
            : 1
        : 1;
    return (
      reveal *
      (zoneBase + depthReadability * depthOpacity) *
      fallDepthDamping *
      neutralPlaneOpacity
    );
  });
  const baseStrokeOpacity =
    sourceKind === "neutral" && sizeClass === "large"
      ? 0.46
      : slot.depth > 1.18
        ? 0.8
        : slot.depth < 0.62
          ? 0.28
          : 0.46;
  // Nur wenige Platten fangen das Licht gleichzeitig ein. Die sehr schmale
  // Sinus-Huelle erzeugt kurze, lokale Metallreflexe statt eines permanenten
  // Pulsierens des gesamten Feldes. Beim echten Motiv-Handoff kommt fuer
  // einen Moment eine waermere, etwas kraeftigere Reflexion hinzu; Scrollen
  // allein kann sie nicht ausloesen, weil dafuer der rohe sourceProgress
  // benoetigt wird.
  const edgeGlintOpacity = useTransform(
    [time, sourceProgress, handoffAge, fallProgress],
    (values: number[]) => {
      const [now, presence, handoff, fall] = values;
      const glintSlot =
        (sourceKind === "base" &&
          (SOURCE_LIGHT_SLOT_INDICES as readonly number[]).includes(index)) ||
        (sourceKind === "neutral" && sizeClass === "large");
      if (!glintSlot) return baseStrokeOpacity;
      const coolGlint =
        Math.max(0, Math.sin(now * (0.00105 + slot.speed * 0.00014) + slot.phase * 1.9)) **
        12;
      const warmGlint =
        Math.max(0, Math.sin(now * 0.00148 + slot.rollPhase + 0.7)) ** 10 *
        (handoff >= 0 && handoff < 0.68
          ? smoothStep(handoff / 0.07) * (1 - smoothStep((handoff - 0.2) / 0.48))
          : 0);
      const visible = smoothStep((presence - 0.1) / 0.62);
      const fallDamping = 1 - smoothStep(fall) * 0.42;
      return Math.min(
        1,
        baseStrokeOpacity + visible * fallDamping * (coolGlint * 0.34 + warmGlint * 0.46)
      );
    }
  );
  const gradient = index % 3;

  return (
    <motion.g
      data-source-slot={sourceKind === "base" ? index : undefined}
      data-source-neutral-fragment={sourceKind === "neutral" ? neutralIndex : undefined}
      data-source-kind={sourceKind}
      data-source-size={sizeClass}
      data-source-depth-plane={depthPlane}
      data-source-zone={slot.zone}
      data-source-flow-group={slot.flowGroup}
      style={{ x, y, rotate, scale, scaleX, scaleY, skewX, opacity }}
    >
      <motion.polygon
        points={slot.points}
        fill={`url(#hero-source-metal-${gradient})`}
        stroke={slot.depth > 1.18 ? "#e4fbfc" : "#879396"}
        strokeWidth={slot.depth > 1.18 ? 0.76 : slot.depth < 0.62 ? 0.3 : 0.44}
        filter={
          sourceKind === "base" && slot.depth > 1.24
            ? "url(#hero-source-edge-glow)"
            : slot.depth < 0.62 &&
                (sourceKind === "base" || (neutralIndex ?? 0) % 2 === 0)
              ? "url(#hero-source-far-soften)"
              : undefined
        }
        style={{ strokeOpacity: edgeGlintOpacity }}
      />
    </motion.g>
  );
}

function useSourceHandoffAge(
  sourceProgress: MotionValue<number>,
  time: MotionValue<number>
): MotionValue<number> {
  const triggeredAt = useMotionValue(-1);
  const armed = useRef(sourceProgress.get() < 0.12);
  const previousProgress = useRef(sourceProgress.get());

  useMotionValueEvent(sourceProgress, "change", (value) => {
    const previous = previousProgress.current;
    previousProgress.current = value;
    if (value <= 0.12) armed.current = true;
    if (armed.current && previous < 0.985 && value >= 0.985) {
      const now = time.get();
      const previousTrigger = triggeredAt.get();
      if (
        previousTrigger < 0 ||
        now - previousTrigger >= SOURCE_HOT_PARTICLE_COOLDOWN_MS
      ) {
        triggeredAt.set(now);
      }
      armed.current = false;
    }
  });

  return useTransform([time, triggeredAt], (values: number[]) => {
    const [now, start] = values;
    return start < 0 ? -1 : (now - start) / SOURCE_HANDOFF_RESIDUE_MS;
  });
}

function SourceHotParticle({
  geometry,
  index,
  age,
  time,
  fallProgress,
  fallDistance,
  restMinX,
  restMaxX,
}: {
  geometry: SourceHotParticleGeometry;
  index: number;
  age: MotionValue<number>;
  time: MotionValue<number>;
  fallProgress: MotionValue<number>;
  fallDistance: number;
  restMinX: number;
  restMaxX: number;
}) {
  const slot = UNIVERSAL_SOURCE_SLOTS[geometry.slotIndex];
  const localAgeFor = (value: number) => (value - geometry.delay) / geometry.lifeEnd;
  const localAge = useTransform(age, localAgeFor);
  const particleDepthN =
    geometry.depthClass === "back" ? 0.18 : geometry.depthClass === "mid" ? 0.54 : 0.88;
  const restBaseX = restMinX + (restMaxX - restMinX) * geometry.restUnit;
  const opacity = useTransform(localAge, (local) => {
    if (local < 0 || local >= 1) return 0;
    const depthOpacity =
      geometry.depthClass === "back" ? 0.56 : geometry.depthClass === "mid" ? 0.78 : 0.94;
    const kindOpacity = geometry.kind === "spark" ? 0.88 : 1;
    return (
      smoothStep(local / 0.045) *
      (1 - smoothStep((local - (geometry.kind === "spark" ? 0.36 : 0.48)) / 0.52)) *
      depthOpacity *
      kindOpacity
    );
  });
  const fill = useTransform(
    localAge,
    [-0.05, 0, 0.18, 0.46, 0.76, 1],
    ["#fffef4", "#fffef4", "#ffe887", "#ff9a39", "#cf3f1b", "#471714"]
  );
  const cx = useTransform([time, age, fallProgress], (values: number[]) => {
    const [now, rawAge, fall] = values;
    if (rawAge < geometry.delay) return slot.x;
    const visibleAge = clamp01(localAgeFor(rawAge));
    const triggerTime = now - (rawAge - geometry.delay) * SOURCE_HANDOFF_RESIDUE_MS;
    const originFlow = sourceFlowSample(slot, triggerTime);
    const currentFlow = sourceFlowSample(slot, now);
    const detach = smoothStep(visibleAge / 0.18);
    const flowX = currentFlow.x + (originFlow.x - currentFlow.x) * detach;
    const spread = smoothStep((fall - 0.05) / 0.67) * (1 - smoothStep((fall - 0.68) / 0.32));
    const settle = smoothStep((fall - 0.72) / 0.28);
    const sourceX =
      slot.x +
        flowX +
        geometry.launchX * visibleAge +
        Math.sin(now * 0.0012 + slot.phase) *
          (geometry.kind === "spark" ? 3.8 : 2.4) *
          visibleAge;
    const fallingX =
      sourceX +
      (restBaseX - sourceX) * spread * (0.45 + particleDepthN * 0.18) +
      slot.captureX * Math.sin(fall * Math.PI) * (0.32 + particleDepthN * 0.22);
    const restingX = restBaseX + Math.sin(now * 0.00012 + slot.phase) * 0.72;
    return stableSvgValue(
      fallingX + (restingX - fallingX) * settle
    );
  });
  const cy = useTransform([time, age, fallProgress], (values: number[]) => {
    const [now, rawAge, fall] = values;
    if (rawAge < geometry.delay) return slot.y;
    const visibleAge = clamp01(localAgeFor(rawAge));
    const triggerTime = now - (rawAge - geometry.delay) * SOURCE_HANDOFF_RESIDUE_MS;
    const originFlow = sourceFlowSample(slot, triggerTime);
    const currentFlow = sourceFlowSample(slot, now);
    const detach = smoothStep(visibleAge / 0.18);
    const flowY = currentFlow.y + (originFlow.y - currentFlow.y) * detach;
    const delayedFall = smoothStep((fall - slot.fallDelay) / (1 - slot.fallDelay));
    const depthFall = Math.pow(delayedFall, 1.12 - particleDepthN * 0.28);
    const settle = smoothStep((fall - 0.72) / 0.28);
    const sourceY =
      slot.y +
        flowY +
        geometry.launchY * visibleAge +
        geometry.gravity * visibleAge * visibleAge;
    const wholeFall = fallDistance * fall;
    const dragDelta = fallDistance * (depthFall - fall) * 0.3;
    const depthPlane =
      fallDistance * Math.sin(Math.PI * fall) * (particleDepthN - 0.5) * 0.12;
    const fallingY = sourceY + wholeFall + dragDelta + depthPlane;
    const restingY =
      UNIVERSAL_SOURCE_CENTER.y +
      fallDistance +
      (geometry.restUnit - 0.5) * 24 +
      (particleDepthN - 0.5) * 18;
    return stableSvgValue(
      fallingY + (restingY - fallingY) * settle
    );
  });
  const radiusX = useTransform(localAge, (value) => {
    const visibleAge = value < 0 ? 0 : clamp01(value);
    return stableSvgValue(
      geometry.radius *
        (geometry.kind === "spark" ? 0.42 : 1) *
        (1 - visibleAge * (geometry.kind === "spark" ? 0.6 : 0.5))
    );
  });
  const radiusY = useTransform(localAge, (value) => {
    const visibleAge = value < 0 ? 0 : clamp01(value);
    return stableSvgValue(
      geometry.radius *
        (geometry.kind === "spark" ? 1.68 : 0.72) *
        (1 - visibleAge * (geometry.kind === "spark" ? 0.6 : 0.5))
    );
  });

  return (
    <motion.ellipse
      data-source-hot-particle={index}
      data-source-hot-bead={geometry.kind === "bead" ? index : undefined}
      data-source-spark-remnant={geometry.kind === "spark" ? index : undefined}
      data-source-particle-depth={geometry.depthClass}
      aria-hidden="true"
      cx={cx}
      cy={cy}
      rx={radiusX}
      ry={radiusY}
      filter={
        geometry.depthClass === "back"
          ? "url(#hero-source-far-soften)"
          : geometry.depthClass === "front"
            ? "url(#hero-source-edge-glow)"
            : undefined
      }
      pointerEvents="none"
      style={{ opacity, fill }}
    />
  );
}

/** Persistente, slide-unabhaengige Materialquelle. Sie wird genau einmal im
 * HeroCarousel gerendert; ihre Slots und ihr Zeitfeld wechseln nie mit dem
 * aktiven Motiv. */
export function SharedMaterialSource({
  time,
  sourceProgress,
  fallProgress,
  fallDirection,
  returnPresence,
  pointerX,
  pointerY,
  fixedBounds,
  className,
}: {
  time: MotionValue<number>;
  sourceProgress: MotionValue<number>;
  fallProgress: MotionValue<number>;
  fallDirection: MotionValue<number>;
  returnPresence: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  fixedBounds?: SharedSourceBounds;
  className?: string;
}) {
  const handoffAge = useSourceHandoffAge(sourceProgress, time);
  const returnForceTarget = useTransform(fallDirection, (direction): number =>
    direction < 0 ? 1 : 0
  );
  const returnForce = useSpring(returnForceTarget, {
    stiffness: 95,
    damping: 22,
    mass: 0.55,
  });
  const sourcePresence = useTransform(
    [sourceProgress, fallProgress, returnPresence],
    (values: number[]) =>
      Math.max(values[0], 0.08 + smoothStep(values[1] / 0.14) * 0.82, values[2])
  );
  const coreOpacity = useTransform(
    [sourceProgress, fallProgress, returnPresence],
    (values: number[]) => {
      const sourceReveal = smoothStep((Math.max(values[0], values[2]) - 0.22) / 0.78);
      return sourceReveal * 0.15 * (1 - smoothStep(values[1] / 0.24));
    }
  );
  const mixingOpacity = useTransform(
    [sourceProgress, fallProgress, returnPresence],
    (values: number[]) => {
      const sourceReveal = smoothStep((Math.max(values[0], values[2]) - 0.18) / 0.82);
      return sourceReveal * 0.075 * (1 - smoothStep(values[1] / 0.32));
    }
  );
  const coreScale = useTransform(sourceProgress, (value) =>
    stableCssTransformValue(0.76 + smoothStep(value) * 0.24)
  );
  const restMinX = fixedBounds?.restMinX ?? -72;
  const restMaxX = fixedBounds?.restMaxX ?? 290;
  const sourceMinY = fixedBounds?.sourceMinY ?? 4;
  const sourceMaxY = fixedBounds?.sourceMaxY ?? 296;
  const renderNeutralPlane = (plane: SourceDepthPlane) =>
    ADDITIONAL_SOURCE_SLOTS.map((slot, index) =>
      slot.depthPlane === plane ? (
        <SharedSourceShard
          key={`neutral-${index}`}
          slot={slot}
          index={UNIVERSAL_SOURCE_SLOT_COUNT + index}
          sourceKind="neutral"
          neutralIndex={index}
          sizeClass={slot.sizeClass}
          depthPlane={slot.depthPlane}
          sourceX={restMinX + (restMaxX - restMinX) * slot.sourceXUnit}
          sourceY={sourceMinY + (sourceMaxY - sourceMinY) * slot.sourceYUnit}
          time={time}
          sourceProgress={sourcePresence}
          handoffAge={handoffAge}
          fallProgress={fallProgress}
          returnForce={returnForce}
          fallDistance={fixedBounds?.fallDistance ?? 0}
          restMinX={restMinX}
          restMaxX={restMaxX}
          pointerX={pointerX}
          pointerY={pointerY}
        />
      ) : null
    );
  const renderBasePlane = (plane: SourceDepthPlane) =>
    UNIVERSAL_SOURCE_SLOTS.map((slot, index) =>
      sourceDepthPlaneFor(slot.depth) === plane ? (
        <SharedSourceShard
          key={`base-${index}`}
          slot={slot}
          index={index}
          sourceKind="base"
          depthPlane={plane}
          time={time}
          sourceProgress={sourcePresence}
          handoffAge={handoffAge}
          fallProgress={fallProgress}
          returnForce={returnForce}
          fallDistance={fixedBounds?.fallDistance ?? 0}
          restMinX={restMinX}
          restMaxX={restMaxX}
          pointerX={pointerX}
          pointerY={pointerY}
        />
      ) : null
    );
  const renderHotParticlePlane = (plane: SourceDepthPlane) =>
    SOURCE_HOT_PARTICLES.map((geometry, index) =>
      geometry.depthClass === plane ? (
        <SourceHotParticle
          key={`hot-particle-${index}`}
          geometry={geometry}
          index={index}
          age={handoffAge}
          time={time}
          fallProgress={fallProgress}
          fallDistance={fixedBounds?.fallDistance ?? 0}
          restMinX={restMinX}
          restMaxX={restMaxX}
        />
      ) : null
    );

  return (
    <svg
      viewBox={UNIVERSAL_SOURCE_VIEW_BOX}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      data-shared-material-source="true"
      data-source-slot-count={UNIVERSAL_SOURCE_SLOT_COUNT}
      data-source-neutral-fragment-count={ADDITIONAL_SOURCE_SLOT_COUNT}
      data-source-total-fragment-count={
        UNIVERSAL_SOURCE_SLOT_COUNT + ADDITIONAL_SOURCE_SLOT_COUNT
      }
      data-source-hot-bead-count={UNIVERSAL_SOURCE_HOT_BEAD_COUNT}
      data-source-spark-remnant-count={UNIVERSAL_SOURCE_SPARK_REMNANT_COUNT}
      style={{
        overflow: "visible",
        ...(fixedBounds
          ? {
              left: fixedBounds.left,
              top: fixedBounds.top,
              width: fixedBounds.width,
              height: fixedBounds.height,
            }
          : {}),
      }}
    >
      <defs>
        <linearGradient id="hero-source-metal-0" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e5e7e8" />
          <stop offset="48%" stopColor="#8e9698" />
          <stop offset="100%" stopColor="#3f4648" />
        </linearGradient>
        <linearGradient id="hero-source-metal-1" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#d7c9ad" />
          <stop offset="52%" stopColor="#817663" />
          <stop offset="100%" stopColor="#373735" />
        </linearGradient>
        <linearGradient id="hero-source-metal-2" x1="0%" y1="15%" x2="100%" y2="85%">
          <stop offset="0%" stopColor="#cfe8eb" />
          <stop offset="45%" stopColor="#728286" />
          <stop offset="100%" stopColor="#303638" />
        </linearGradient>
        <radialGradient id="hero-source-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b7d8dc" stopOpacity="0.58" />
          <stop offset="58%" stopColor="#69797c" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#242a2b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-source-mixing" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#91a4a7" stopOpacity="0.2" />
          <stop offset="54%" stopColor="#5c6668" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#232728" stopOpacity="0" />
        </radialGradient>
        <filter id="hero-source-edge-glow" x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="hero-source-far-soften" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.38" />
        </filter>
      </defs>
      {renderBasePlane("back")}
      {renderNeutralPlane("back")}
      {renderHotParticlePlane("back")}
      <motion.ellipse
        cx={UNIVERSAL_SOURCE_CENTER.x}
        cy={UNIVERSAL_SOURCE_CENTER.y}
        rx="154"
        ry="116"
        fill="url(#hero-source-mixing)"
        style={{ opacity: mixingOpacity }}
      />
      <motion.ellipse
        cx={UNIVERSAL_SOURCE_CENTER.x}
        cy={UNIVERSAL_SOURCE_CENTER.y}
        rx="36"
        ry="26"
        fill="url(#hero-source-core)"
        style={{ opacity: coreOpacity, scale: coreScale, transformOrigin: "146px 177px" }}
      />
      {renderBasePlane("mid")}
      {renderNeutralPlane("mid")}
      {renderHotParticlePlane("mid")}
      {renderBasePlane("front")}
      {renderNeutralPlane("front")}
      {renderHotParticlePlane("front")}
    </svg>
  );
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
    sparkCount: 4,
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
    sparkCount: 5,
    heatStrength: 0.78,
    anchor: { x: 0.45, y: 0.54 },
  },
  {
    startProgress: 0.947,
    endProgress: 0.98,
    intensity: 1,
    depthLayer: "front",
    sparkCount: 6,
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
  if (value < event.startProgress - 0.004 || value > event.endProgress + 0.018) return 0;
  const local = clamp01(
    (value - (event.startProgress - 0.004)) /
      (event.endProgress - event.startProgress + 0.022)
  );
  return Math.sin(local * Math.PI) ** 0.82 * event.intensity;
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
  // Die meisten Tropfen bleiben kurz am Kontakt. Nur der letzte Funke eines
  // starken Verschlusses darf gelegentlich weiter auslaufen - mehr
  // physikalische Spannweite ohne einen groesseren Partikelsatz.
  const longSpark = event.intensity >= 0.8 && sparkIndex === event.sparkCount - 1;
  const trajectoryScale = longSpark
    ? 1.34
    : 0.8 + seeded(event.id * 17 + sparkIndex + 4400) * 0.24;
  const pathScale =
    unitScale * (0.64 + event.intensity * 0.36) * depthScale * trajectoryScale;
  const rotatePoint = (x: number, y: number) => ({
    x: (x * cos - y * sin) * pathScale,
    y: (x * sin + y * cos) * pathScale,
  });
  const end = rotatePoint(geometry.dx, geometry.dy);
  const control = rotatePoint(
    geometry.dx * 0.48 + geometry.curveX,
    geometry.dy * 0.28 + geometry.curveY
  );
  // Ein kleiner Schwerkraftbogen macht die bestehenden Bahnen lesbarer,
  // ohne neue Partikel oder Welding-Events einzufuehren.
  const gravity = (4.4 + event.intensity * 4 + sparkIndex * 0.5) * unitScale;
  end.y += gravity;
  control.y += gravity * 0.22;
  const sparkPath = [
    `M ${stableSvgValue(event.junction.x)} ${stableSvgValue(event.junction.y)}`,
    `Q ${stableSvgValue(event.junction.x + control.x)} ${stableSvgValue(event.junction.y + control.y)}`,
    `${stableSvgValue(event.junction.x + end.x)} ${stableSvgValue(event.junction.y + end.y)}`,
  ].join(" ");
  const span = event.endProgress - event.startProgress;
  const sparkStart = event.startProgress + span * (0.07 + sparkIndex * 0.026);
  const sparkEnd = event.endProgress - span * (0.018 + (sparkIndex % 2) * 0.035);
  const opacity = useTransform(
    [progress, assemblyDirection],
    (values: number[]) => {
      const [value, direction] = values;
      if (value < sparkStart || value > sparkEnd || direction <= 0) return 0;
      const local = (value - sparkStart) / (sparkEnd - sparkStart);
      const envelope = smoothStep(local / 0.16) * smoothStep((1 - local) / 0.2);
      const sparkEnergy = (0.5 + event.intensity * 0.5) * (longSpark ? 1 : 0.96);
      return envelope * sparkEnergy * direction;
    }
  );
  const dashOffset = useTransform(progress, (value) => {
    const local = clamp01((value - sparkStart) / (sparkEnd - sparkStart));
    // Schneller Auswurf, danach optisch langsameres Fallen entlang der
    // gekruemmten Bahn statt gleichfoermigem SVG-Dash-Lauf.
    return -0.88 * Math.pow(local, 0.68);
  });

  return (
    <motion.path
      data-weld-spark={event.id}
      d={sparkPath}
      pathLength={1}
      fill="none"
      stroke={`url(#${gradientId})`}
      strokeWidth={(longSpark ? 0.8 : 0.7) * unitScale}
      strokeLinecap="round"
      strokeDasharray={longSpark ? "0.23 0.77" : "0.15 0.85"}
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
  const depthStrength =
    event.depthLayer === "back" ? 0.68 : event.depthLayer === "mid" ? 0.5 : 0.42;
  const opacity = useTransform(
    [progress, assemblyDirection],
    (values: number[]) => weldLightStrength(values[0], event) * values[1] * depthStrength
  );

  return (
    <motion.circle
      data-weld-ambient={event.id}
      aria-hidden="true"
      cx={event.junction.x}
      cy={event.junction.y}
      r={(42 + event.intensity * 12) * unitScale}
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
  const depthOpacity = event.depthLayer === "back" ? 0.6 : event.depthLayer === "mid" ? 0.82 : 1;
  const opacity = useTransform(
    [progress, assemblyDirection],
    (values: number[]) => weldArcStrength(values[0], event) * values[1] * depthOpacity
  );
  const coreRadius = (4.5 + event.intensity * 0.95) * unitScale;
  const arcRotation = stableSvgValue((seeded(event.id + 3100) - 0.5) * 76);
  const arcPath = [
    `M ${stableSvgValue(event.junction.x - 4.1 * unitScale)} ${stableSvgValue(event.junction.y + 1.4 * unitScale)}`,
    `L ${stableSvgValue(event.junction.x - 1.15 * unitScale)} ${stableSvgValue(event.junction.y - 1.35 * unitScale)}`,
    `L ${stableSvgValue(event.junction.x + 1.05 * unitScale)} ${stableSvgValue(event.junction.y + 0.65 * unitScale)}`,
    `L ${stableSvgValue(event.junction.x + 4.25 * unitScale)} ${stableSvgValue(event.junction.y - 1.7 * unitScale)}`,
  ].join(" ");

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
          fill="#a6edf6"
          fillOpacity="0.22"
        />
        <g
          transform={`rotate(${arcRotation} ${stableSvgValue(event.junction.x)} ${stableSvgValue(event.junction.y)})`}
        >
          <path
            d={arcPath}
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
  const duration = 2200 + event.heatStrength * 1100 + event.id * 65;
  const age = useWeldResidueAge(event, duration, progress, assemblyDirection, time);
  const depthOpacity = event.depthLayer === "back" ? 0.74 : event.depthLayer === "mid" ? 0.92 : 1;
  const opacity = useTransform(age, (value) => {
    if (value < 0 || value >= 1) return 0;
    const fadeIn = smoothStep(value / 0.09);
    const fadeOut = 1 - smoothStep((value - 0.44) / 0.56);
    return fadeIn * fadeOut * (0.155 + event.heatStrength * 0.125) * depthOpacity;
  });
  const driftX = useTransform([time, age], (values: number[]) => {
    const [now, value] = values;
    if (value < 0) return 0;
    const visibleAge = clamp01(value);
    // Exakt dieselbe langsame Reise-Richtung wie das Fragmentfeld; nur die
    // Strecke ist kleiner und wird mit dem Rauchalter aufgebaut.
    const heading = Math.sin(now * 0.00015) * 1.3 + Math.sin(now * 0.00007 + 2.1) * 0.9;
    const wind = (10 + 6 * Math.sin(now * 0.00011 + 0.6)) * unitScale;
    const curl = Math.sin(visibleAge * Math.PI * 2.1 + event.id * 1.37) * 8.5 * unitScale;
    return Math.cos(heading) * wind * visibleAge + curl * visibleAge;
  });
  const riseY = useTransform(age, (value) => {
    const visibleAge = clamp01(value);
    return -(7 + 62 * visibleAge) * unitScale;
  });
  const cx = useTransform(driftX, (value) =>
    stableSvgValue(event.junction.x + value)
  );
  const cy = useTransform(riseY, (value) =>
    stableSvgValue(event.junction.y + value)
  );
  const shapeWidth = 0.9 + seeded(event.id + 5200) * 0.22;
  const shapeHeight = 0.92 + seeded(event.id + 5300) * 0.2;
  const radiusX = useTransform(
    age,
    (value) =>
      stableSvgValue((5.5 + clamp01(value) * 22) * unitScale * shapeWidth)
  );
  const radiusY = useTransform(
    age,
    (value) =>
      stableSvgValue((8 + clamp01(value) * 35) * unitScale * shapeHeight)
  );
  const secondaryCx = useTransform(
    [driftX, age],
    (values: number[]) =>
      stableSvgValue(
        event.junction.x +
          values[0] -
          Math.sin(clamp01(values[1]) * 5 + event.id) * 6 * unitScale
      )
  );
  const secondaryCy = useTransform(
    riseY,
    (value) => stableSvgValue(event.junction.y + value + 8 * unitScale)
  );
  const secondaryRadiusX = useTransform(
    age,
    (value) => stableSvgValue((3.8 + clamp01(value) * 13) * unitScale)
  );
  const secondaryRadiusY = useTransform(
    age,
    (value) => stableSvgValue((6 + clamp01(value) * 23) * unitScale)
  );
  const coolCatchOpacity = useTransform(age, (value) => {
    if (value < 0 || value >= 0.34) return 0;
    return (1 - smoothStep(value / 0.34)) * (0.3 + event.heatStrength * 0.12);
  });
  const coolCx = useTransform(
    driftX,
    (value) => stableSvgValue(event.junction.x + value * 0.42)
  );
  const coolCy = useTransform(
    riseY,
    (value) => stableSvgValue(event.junction.y + value * 0.36)
  );
  const coolRadiusX = useTransform(
    age,
    (value) => stableSvgValue((3.8 + clamp01(value) * 7) * unitScale)
  );
  const coolRadiusY = useTransform(
    age,
    (value) => stableSvgValue((6 + clamp01(value) * 13) * unitScale)
  );
  const finalCloudOpacity = useTransform(age, (value) => {
    if (event.id !== 5 || value < 0.12 || value >= 0.92) return 0;
    const reveal = smoothStep((value - 0.12) / 0.2);
    const disperse = 1 - smoothStep((value - 0.58) / 0.34);
    return reveal * disperse * 0.68;
  });
  const finalCloudCx = useTransform(
    [driftX, age],
    (values: number[]) =>
      stableSvgValue(
        event.junction.x +
          values[0] * 0.78 -
          Math.sin(clamp01(values[1]) * 3.4) * 9 * unitScale
      )
  );
  const finalCloudCy = useTransform(
    riseY,
    (value) => stableSvgValue(event.junction.y + value - 12 * unitScale)
  );
  const finalCloudRadiusX = useTransform(
    age,
    (value) => stableSvgValue((7 + clamp01(value) * 24) * unitScale)
  );
  const finalCloudRadiusY = useTransform(
    age,
    (value) => stableSvgValue((15 + clamp01(value) * 52) * unitScale)
  );
  const wispOpacity = useTransform(age, (value) => {
    if (value < 0.04 || value >= 0.78) return 0;
    const reveal = smoothStep((value - 0.04) / 0.14);
    const disperse = 1 - smoothStep((value - 0.44) / 0.34);
    return reveal * disperse * 0.62;
  });
  const wispX = useTransform(driftX, (value) =>
    stableCssTransformValue(value * 0.52)
  );
  const wispY = useTransform(riseY, (value) =>
    stableCssTransformValue(value * 0.42)
  );
  const wispDirection = seeded(event.id + 5700) > 0.5 ? 1 : -1;
  const wispPath = [
    `M ${stableSvgValue(event.junction.x)} ${stableSvgValue(event.junction.y)}`,
    `C ${stableSvgValue(event.junction.x + wispDirection * 6 * unitScale)} ${stableSvgValue(event.junction.y - 12 * unitScale)}`,
    `${stableSvgValue(event.junction.x - wispDirection * 11 * unitScale)} ${stableSvgValue(event.junction.y - 29 * unitScale)}`,
    `${stableSvgValue(event.junction.x + wispDirection * 4 * unitScale)} ${stableSvgValue(event.junction.y - 48 * unitScale)}`,
  ].join(" ");

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
      <motion.ellipse
        cx={secondaryCx}
        cy={secondaryCy}
        rx={secondaryRadiusX}
        ry={secondaryRadiusY}
        fill={event.depthLayer === "front" ? "#4c585b" : "#778487"}
        fillOpacity={event.depthLayer === "front" ? 0.52 : 0.38}
      />
      <motion.ellipse
        cx={coolCx}
        cy={coolCy}
        rx={coolRadiusX}
        ry={coolRadiusY}
        fill="#d9f8ff"
        style={{ opacity: coolCatchOpacity }}
      />
      <motion.path
        d={wispPath}
        fill="none"
        stroke="#8b989b"
        strokeWidth={1.35 * unitScale}
        strokeLinecap="round"
        style={{ x: wispX, y: wispY, opacity: wispOpacity }}
      />
      {event.id === 5 && (
        <motion.ellipse
          cx={finalCloudCx}
          cy={finalCloudCy}
          rx={finalCloudRadiusX}
          ry={finalCloudRadiusY}
          fill="#4c585b"
          style={{ opacity: finalCloudOpacity }}
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
    700 + event.heatStrength * 680 + (event.id === 5 ? 320 : 0),
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
  const haloOpacity = useTransform(opacity, (value) => value * 0.3);
  const heatColor = useTransform(
    age,
    [0, 0.07, 0.26, 0.62, 1],
    ["#f7feff", "#fff1a8", "#ffb43f", "#a94022", "#321817"]
  );
  const seamPath = [
    `M ${stableSvgValue(event.junction.x)} ${stableSvgValue(event.junction.y)}`,
    `L ${stableSvgValue(event.junction.seamEnd.x)} ${stableSvgValue(event.junction.seamEnd.y)}`,
  ].join(" ");

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
        strokeWidth={(2.15 + event.heatStrength * 0.8) * unitScale}
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
  sourceProgress: MotionValue<number>;
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
  sourceProgress,
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
  const sourceSlot = sourceSlotForFacet(points, index);
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
  const sourceTargetX =
    chaosCenter.x +
    (sourceSlot.x - UNIVERSAL_SOURCE_WIDTH / 2) * chaosUnitScale -
    cx;
  const sourceTargetY =
    chaosCenter.y +
    (sourceSlot.y - UNIVERSAL_SOURCE_HEIGHT / 2) * chaosUnitScale -
    cy;
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
  const sourceIdentityOpacity = useTransform(
    sourceProgress,
    [0, 0.46, 0.82, 1],
    [1, 0.9, 0.3, 0.035]
  );
  const pooledFieldOpacity = useTransform(
    [fieldOpacity, sourceIdentityOpacity],
    (values: number[]) => values[0] * values[1]
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
  // In der Quelle verlieren sehr grosse Hocker-/Kaktusfacetten und kleine
  // Portraitdetails ihre modellspezifische Groessenwirkung. Die Skalierung
  // zielt nur im Pool auf eine gemeinsame Screen-Space-Kantenlaenge; die
  // bestehende Chaos-/Montageskalierung davor bleibt unangetastet.
  const sourceFragmentScale = Math.min(
    1.15,
    Math.max(
      0.07,
      ((20 + sourceSlot.scaleBias * 12) * sourceSlot.depth) /
        Math.max(1, normalizedFacetExtent)
    )
  );
  const sourceScalePulse = useTransform(time, (value) =>
    sourceFragmentScale *
    (0.95 + Math.sin(value * 0.00046 * sourceSlot.speed + sourceSlot.phase * 1.43) * 0.07)
  );
  const pooledFragmentScale = useTransform(
    [fragmentScale, sourceScalePulse, sourceProgress],
    (values: number[]) => {
      const [currentScale, poolScale, poolProgress] = values;
      const mix = smoothStep(poolProgress);
      const depthCrossing = 1 + Math.sin(mix * Math.PI) * (sourceSlot.depth - 1) * 0.24;
      return currentScale + (poolScale * depthCrossing - currentScale) * mix;
    }
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
  const sourceVortexX = useTransform(
    [time, pointerX],
    (values: number[]) =>
      (
        sourceFlowSample(sourceSlot, values[0]).x +
        Math.sin(values[0] * 0.00053 * sourceSlot.speed + sourceSlot.phase) * sourceSlot.orbitX +
        Math.sin(values[0] * 0.00117 * sourceSlot.speed + sourceSlot.phase * 1.73) * sourceSlot.orbitX * 0.32 +
        values[1] * (sourceSlot.depth - 0.72) * 19
      ) * chaosUnitScale
  );
  const sourceVortexY = useTransform(
    [time, pointerY],
    (values: number[]) =>
      (
        sourceFlowSample(sourceSlot, values[0]).y +
        Math.sin(values[0] * 0.00041 * sourceSlot.speed + sourceSlot.phase * 1.31) * sourceSlot.orbitY +
        Math.cos(values[0] * 0.00091 * sourceSlot.speed + sourceSlot.phase * 0.67) * sourceSlot.orbitY * 0.38 +
        values[1] * (sourceSlot.depth - 0.72) * 14
      ) * chaosUnitScale
  );
  const sourceRotation = useTransform(time, (value) =>
    sourceSlot.rotation +
    sourceFlowSample(sourceSlot, value).turn +
    Math.sin(value * 0.00037 * sourceSlot.speed + sourceSlot.phase) * 34 +
    Math.sin(value * 0.00083 * sourceSlot.speed + sourceSlot.phase * 1.9) * 13
  );
  const sourceForeshorten = useTransform(time, (value) =>
    sourcePlateForeshorten(sourceSlot, value)
  );
  const pooledForeshorten = useTransform(
    [sourceForeshorten, sourceProgress],
    (values: number[]) => 1 + (values[0] - 1) * smoothStep(values[1])
  );
  const sourceSkew = useTransform(
    time,
    (value) => Math.sin(value * 0.00067 + sourceSlot.rollPhase * 1.3) * 7
  );
  const pooledSkew = useTransform(
    [sourceSkew, sourceProgress],
    (values: number[]) => values[0] * smoothStep(values[1])
  );
  const pooledRotate = useTransform(
    [rotate, sourceRotation, sourceProgress],
    (values: number[]) => {
      const [currentRotation, poolRotation, poolProgress] = values;
      const mix = smoothStep(poolProgress);
      const captureRotation = Math.sin(mix * Math.PI) * sourceSlot.captureSpin;
      return currentRotation + (poolRotation + captureRotation - currentRotation) * mix;
    }
  );

  const x = useTransform(
    [baseX, swayX, driftX, parallaxX],
    (values: number[]) => values[0] + values[1] + values[2] + values[3]
  );
  const y = useTransform(
    [baseY, swayY, driftY, parallaxY],
    (values: number[]) => values[0] + values[1] + values[2] + values[3]
  );
  const pooledX = useTransform(
    [x, sourceVortexX, sourceProgress],
    (values: number[]) => {
      const [currentX, vortexX, poolProgress] = values;
      const mix = smoothStep(poolProgress);
      const interceptX = Math.sin(mix * Math.PI) * sourceSlot.captureX * chaosUnitScale;
      const poolX = sourceTargetX + vortexX + interceptX;
      return currentX + (poolX - currentX) * mix;
    }
  );
  const pooledY = useTransform(
    [y, sourceVortexY, sourceProgress],
    (values: number[]) => {
      const [currentY, vortexY, poolProgress] = values;
      const mix = smoothStep(poolProgress);
      const interceptY = Math.sin(mix * Math.PI) * sourceSlot.captureY * chaosUnitScale;
      const poolY = sourceTargetY + vortexY + interceptY;
      return currentY + (poolY - currentY) * mix;
    }
  );
  const renderedX = useTransform(pooledX, stableCssTransformValue);
  const renderedY = useTransform(pooledY, stableCssTransformValue);
  // Framer Motion normalisiert CSS-transform-origin bei einer geclippten
  // SVG-Bildgruppe auf deren volle Bild-Bounding-Box. Das verschiebt gleiche
  // Chaos-Slots je nach Quell-viewBox stark. Als SVG-Attribut bleibt der
  // Pivot dagegen exakt der reale Facettenschwerpunkt; die Translation liegt
  // separat auf der aeusseren Gruppe und wird nicht mitrotiert/-skaliert.
  const fragmentTransform = useTransform(
    [pooledRotate, pooledFragmentScale, pooledForeshorten, pooledSkew],
    (values: number[]) => {
      const [rotation, scale, foreshorten, skew] = values;
      const stableCx = stableCssTransformValue(cx);
      const stableCy = stableCssTransformValue(cy);
      return `translate(${stableCx}px, ${stableCy}px) rotate(${stableCssTransformValue(rotation)}deg) skewX(${stableCssTransformValue(skew)}deg) scale(${stableCssTransformValue(scale)}) scaleX(${stableCssTransformValue(foreshorten)}) translate(${-stableCx}px, ${-stableCy}px)`;
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
    <motion.g style={{ x: renderedX, y: renderedY, opacity: pooledFieldOpacity }}>
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
  /** 0 = bisheriges modellspezifisches Chaos, 1 = universelle Hero-Quelle. */
  sourceProgress: MotionValue<number>;
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
  sourceProgress,
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
  // useReducedMotion liest matchMedia bereits im ersten Client-Render. Ohne
  // diesen hydration-sicheren Snapshot wuerde der Server das animierte Mesh,
  // ein Reduced-Motion-Browser beim Hydrieren aber sofort das statische Bild
  // rendern - unterschiedliche SVG-Baeume und damit React-Hydration-Fehler.
  const hasHydrated = useSyncExternalStore(
    subscribeHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot
  );
  const shouldReduceMotion = hasHydrated && prefersReducedMotion;
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
      return strongest * direction * 0.98;
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
      (36 + (dominantWeldingEvent(value, weldingEvents)?.intensity ?? 0.5) * 10) *
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

  if (shouldReduceMotion) {
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
              <stop offset="0%" stopColor="#fbffff" stopOpacity="0.7" />
              <stop offset="12%" stopColor="#d6f5f8" stopOpacity="0.42" />
              <stop offset="40%" stopColor="#83bdc5" stopOpacity="0.15" />
              <stop offset="72%" stopColor="#4f747c" stopOpacity="0.045" />
              <stop offset="100%" stopColor="#3d5e65" stopOpacity="0" />
            </radialGradient>
            <motion.radialGradient
              id={weldMetalGradientId}
              gradientUnits="userSpaceOnUse"
              cx={weldMetalX}
              cy={weldMetalY}
              r={weldMetalRadius}
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="15%" stopColor="#f4feff" stopOpacity="0.96" />
              <stop offset="34%" stopColor="#c5edf1" stopOpacity="0.72" />
              <stop offset="62%" stopColor="#70aeb8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#416f78" stopOpacity="0" />
            </motion.radialGradient>
            <linearGradient id={weldSparkGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="38%" stopColor="#ffe48a" />
              <stop offset="100%" stopColor="#ff6d24" />
            </linearGradient>
            <radialGradient id={weldSmokeGradientId} cx="42%" cy="35%" r="68%">
              <stop offset="0%" stopColor="#cad8da" stopOpacity="0.7" />
              <stop offset="28%" stopColor="#8b9a9d" stopOpacity="0.5" />
              <stop offset="72%" stopColor="#50595b" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#2d3233" stopOpacity="0" />
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
              <feGaussianBlur stdDeviation={2.15 * chaosUnitScale} />
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
              sourceProgress={sourceProgress}
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
                sourceProgress={sourceProgress}
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
