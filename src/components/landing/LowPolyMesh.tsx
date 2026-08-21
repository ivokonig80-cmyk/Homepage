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
}) {
  const dark = shadeHex(color, -darkMix);
  const mid = hexToRgb(color);
  const light = shadeHex(color, lightMix);
  const table = (i: 0 | 1 | 2) =>
    [dark[i] / 255, mid[i] / 255, light[i] / 255].join(" ");
  return (
    <filter id="photo-tint" colorInterpolationFilters="sRGB">
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
}: FacetProps) {
  const points = parsePoints(facet.points);
  const [cx, cy] = centroid(points);
  const dx = cx - center.x;
  const dy = cy - center.y;
  const distFromCenter = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy, dx) + (seeded(index) - 0.5) * 1.6;
  const effectiveScatterDistance = chaosEnabled ? CHAOS_SCATTER_DISTANCE : scatterDistance;
  const magnitude = effectiveScatterDistance * (0.65 + seeded(index + 50) * 1.1);

  // Im Chaos-Modus elliptisch statt kreisförmig verstreuen: der Hero ist
  // breiter als hoch, ein kreisförmiger Streuradius schickt bei größerem
  // Radius sofort viele Teile senkrecht aus dem Bild statt sie ueber die
  // vorhandene Breite zu nutzen.
  const scatterScaleX = chaosEnabled ? 1.65 : 1;
  const scatterScaleY = chaosEnabled ? 0.7 : 1;
  const scatterX = Math.cos(angle) * magnitude * scatterScaleX;
  const scatterY = Math.sin(angle) * magnitude * scatterScaleY;
  const scatterVectorLength = Math.hypot(scatterX, scatterY) || 1;
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
  const parallaxStrength = 14 + (distFromCenter / 130) * 20;
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
  // Wander-Reichweite je Facette.
  const driftRadiusBase = 40 + seeded(index + 780) * 60;
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
  const flockPhaseOffset = distFromCenter * 0.006;
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
  const flockHeadingMagnitude = useTransform(time, (t) => 16 + 10 * Math.sin(t * 0.00011 + 0.6));
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
  const fallPhase = seeded(index + 950) * Math.PI * 2;
  const fallBias = useTransform(time, (t) => 4 + 6 * Math.sin(t * 0.00013 + fallPhase));

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

  return (
    <>
      {chaosEnabled && (
        <motion.polygon
          points={facet.points}
          fill="none"
          stroke={shimmerStroke}
          strokeWidth={1.1}
          style={{
            x,
            y,
            rotate,
            opacity: edgeShimmerOpacity,
            transformOrigin: `${cx}px ${cy}px`,
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
            style={{ x, y, rotate, opacity, transformOrigin: `${cx}px ${cy}px` }}
          >
            <image
              href={imageUrl}
              x={0}
              y={0}
              width={imageSize.width}
              height={imageSize.height}
              preserveAspectRatio="xMidYMid slice"
              filter={tintColor ? "url(#photo-tint)" : undefined}
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
            strokeWidth={1.5}
            style={{ x, y, rotate, opacity: seamHaloOpacity, transformOrigin: `${cx}px ${cy}px` }}
          />
          {/* Duenne dunkle Nahtstellen-Kontur obendrauf - wie beim
              Flachfarben-Modus, blendet beim Verschweissen aus
              (strokeOpacity), damit die Scherben vor dem Zusammenfuegen als
              einzelne Fragmente erkennbar bleiben. */}
          <motion.polygon
            points={facet.points}
            fill="none"
            stroke={SEAM_STROKE}
            strokeWidth={0.6}
            style={{ x, y, rotate, opacity: strokeOpacity, transformOrigin: `${cx}px ${cy}px` }}
          />
        </>
      ) : (
        <>
          <motion.polygon
            points={facet.points}
            fill={`url(#grad-${facet.tone})`}
            style={{ x, y, rotate, opacity, transformOrigin: `${cx}px ${cy}px` }}
          />
          {/* Gleiches zweischichtiges Nahtstellen-Profil wie im Foto-Modus -
              warmer Schein unter der dunklen Kontur. */}
          <motion.polygon
            points={facet.points}
            fill="none"
            stroke={seamHaloColor}
            strokeWidth={1.4}
            style={{ x, y, rotate, opacity: seamHaloOpacity, transformOrigin: `${cx}px ${cy}px` }}
          />
          <motion.polygon
            points={facet.points}
            fill="none"
            stroke={SEAM_STROKE}
            strokeWidth={0.75}
            style={{ x, y, rotate, opacity: strokeOpacity, transformOrigin: `${cx}px ${cy}px` }}
          />
        </>
      )}
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
  pointerX,
  pointerY,
  ariaLabel,
  imageUrl,
  tintColor,
  tintDarkMix,
  tintLightMix,
}: LowPolyMeshProps) {
  const prefersReducedMotion = useReducedMotion();
  const imageSize = imageUrl ? parseViewBoxSize(viewBox) : undefined;

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
                <PhotoTintFilter color={tintColor} darkMix={tintDarkMix} lightMix={tintLightMix} />
              </defs>
            )}
            <image
              href={imageUrl}
              x={0}
              y={0}
              width={imageSize.width}
              height={imageSize.height}
              preserveAspectRatio="xMidYMid slice"
              filter={tintColor ? "url(#photo-tint)" : undefined}
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
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: "visible", position: "relative" }}
          role="img"
          aria-label={ariaLabel}
        >
          <ToneGradients />
          {tintColor && <defs><PhotoTintFilter color={tintColor} /></defs>}
          {facets.map((facet, i) => (
            <Facet
              key={i}
              facet={facet}
              index={i}
              center={center}
              scatterDistance={scatterDistance}
              chaosEnabled={chaosEnabled}
              time={time}
              chaosStartTime={chaosStartTime}
              progress={progress}
              pointerX={pointerX}
              pointerY={pointerY}
              imageUrl={imageUrl}
              imageSize={imageSize}
              tintColor={tintColor}
              idPrefix="main"
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
              filter={tintColor ? "url(#photo-tint)" : undefined}
              style={{ opacity: weldImageOpacity }}
            />
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
                time={time}
                chaosStartTime={chaosStartTime}
                progress={progress}
                pointerX={pointerX}
                pointerY={pointerY}
                imageUrl={imageUrl}
                imageSize={imageSize}
                tintColor={tintColor}
                idPrefix="reflection"
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
                filter={tintColor ? "url(#photo-tint)" : undefined}
                style={{ opacity: weldImageOpacity }}
              />
            )}
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
