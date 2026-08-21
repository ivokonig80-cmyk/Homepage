import type { FacetDef } from "./LowPolyMesh";
import { MATERIALS } from "@/lib/catalog";

// Wunschfarbe fuer das Katzen-Foto direkt aus dem echten Shop-Katalog
// (nicht dupliziert) - zeigt am Hero-Motiv genau die Farboption, die im
// Konfigurator/Shop tatsaechlich waehlbar ist.
const KUPFER_HEX = MATERIALS.find((m) => m.id === "kupfer")!.colorHex;
const MESSING_HEX = MATERIALS.find((m) => m.id === "messing")!.colorHex;

/**
 * Daten für die 4 Hero-Slides (Text + Dreiecks-Facetten je Motiv, siehe
 * HeroCarousel.tsx). Alle Motive teilen dieselbe viewBox/dasselbe
 * Zentrum, damit sie sich innerhalb desselben Hero-Layouts konsistent
 * verhalten - Facetten je Motiv sind bewusst im selben handgesetzten
 * Platzhalter-Stil wie das ursprüngliche Katzenmotiv (siehe LowPolyMesh.tsx).
 */

const VIEW_BOX = "0 0 240 260";
const CENTER = { x: 120, y: 130 };

// Katzen-Motiv: echtes Foto ("Scherben-Foto"-Modus, siehe LowPolyMesh.tsx)
// statt handgezeichneter Facetten - die Skulptur ist detailreich genug, um
// sie direkt erkennbar zu machen. Zugeschnitten auf den Kopf (Ohren bis
// Schnurrhaare), Basisplatte/Sockel bewusst weggeschnitten. Eigene, engere
// viewBox/Zentrum passend zum Bildausschnitt (886x940px, ~240x255 Ratio).
const CAT_VIEW_BOX = "0 0 240 255";
const CAT_CENTER = { x: 120, y: 127.5 };
const CAT_IMAGE_URL = "/hero-source/cat-head.webp";

// Da die Facetten nur noch als Ausschnitts-Fenster auf das Foto dienen
// (keine anatomische Bedeutung mehr - siehe Datei-Kommentar in
// LowPolyMesh.tsx), reicht ein generisches "Glasscherben"-Raster: leicht
// jitteriges 4x5-Gitter, pro Zelle in 2 Dreiecke geteilt (Diagonale
// schachbrettartig alterniert), Rand exakt auf die Bildkanten gelegt, damit
// das Foto beim Verschweissen lueckenlos rekonstruiert wird.
const CAT_FACETS: FacetDef[] = [
  { points: "0,0 57.8,0 0,49.7", tone: "bronze" },
  { points: "57.8,0 48.2,41.9 0,49.7", tone: "steel" },
  { points: "57.8,0 110.1,0 106.1,41.3", tone: "steel" },
  { points: "57.8,0 106.1,41.3 48.2,41.9", tone: "steelLight" },
  { points: "110.1,0 167.3,0 106.1,41.3", tone: "steelLight" },
  { points: "167.3,0 166.5,57.7 106.1,41.3", tone: "bronze" },
  { points: "167.3,0 240,0 240,42.8", tone: "steelLight" },
  { points: "167.3,0 240,42.8 166.5,57.7", tone: "steelLight" },
  { points: "0,49.7 48.2,41.9 45,110.8", tone: "bronze" },
  { points: "0,49.7 45,110.8 0,88.8", tone: "steelLight" },
  { points: "48.2,41.9 106.1,41.3 45,110.8", tone: "steelLight" },
  { points: "106.1,41.3 134.1,104 45,110.8", tone: "steelLight" },
  { points: "106.1,41.3 166.5,57.7 164.5,88", tone: "steel" },
  { points: "106.1,41.3 164.5,88 134.1,104", tone: "steelLight" },
  { points: "166.5,57.7 240,42.8 164.5,88", tone: "steelLight" },
  { points: "240,42.8 240,109.7 164.5,88", tone: "bronze" },
  { points: "0,88.8 45,110.8 0,152.9", tone: "steel" },
  { points: "45,110.8 50.4,160.4 0,152.9", tone: "steel" },
  { points: "45,110.8 134.1,104 110.4,162.1", tone: "steel" },
  { points: "45,110.8 110.4,162.1 50.4,160.4", tone: "steelLight" },
  { points: "134.1,104 164.5,88 110.4,162.1", tone: "bronze" },
  { points: "164.5,88 166.2,164 110.4,162.1", tone: "steelLight" },
  { points: "164.5,88 240,109.7 240,163.2", tone: "steel" },
  { points: "164.5,88 240,163.2 166.2,164", tone: "steel" },
  { points: "0,152.9 50.4,160.4 69,192.3", tone: "steelLight" },
  { points: "0,152.9 69,192.3 0,212.9", tone: "bronze" },
  { points: "50.4,160.4 110.4,162.1 69,192.3", tone: "steelLight" },
  { points: "110.4,162.1 111.8,208.9 69,192.3", tone: "steel" },
  { points: "110.4,162.1 166.2,164 184.4,215.4", tone: "steelLight" },
  { points: "110.4,162.1 184.4,215.4 111.8,208.9", tone: "bronze" },
  { points: "166.2,164 240,163.2 184.4,215.4", tone: "steel" },
  { points: "240,163.2 240,200.4 184.4,215.4", tone: "bronze" },
  { points: "0,212.9 69,192.3 0,255", tone: "steelLight" },
  { points: "69,192.3 71.9,255 0,255", tone: "steelLight" },
  { points: "69,192.3 111.8,208.9 108,255", tone: "steel" },
  { points: "69,192.3 108,255 71.9,255", tone: "steel" },
  { points: "111.8,208.9 184.4,215.4 108,255", tone: "steel" },
  { points: "184.4,215.4 172.4,255 108,255", tone: "steelLight" },
  { points: "184.4,215.4 240,200.4 240,255", tone: "steel" },
  { points: "184.4,215.4 240,255 172.4,255", tone: "steelLight" },
];

// Person-Motiv: echtes Foto ("Scherben-Foto"-Modus, wie die Katze) - Quelle
// ist Referenz.jpg (siehe public/hero-source/), freigestellt und auf
// 377x480 zugeschnitten (identisch zu PERSON_VIEW_BOX). Die Facetten unten
// sind NICHT generisch, sondern an den echten, im Foto sichtbaren
// Trennlinien abgelesen (Kopfumriss, Augen-/Nasen-/Mund-Kanten, Hals,
// Schultern) - per Koordinatengitter-Overlay am Referenzfoto vermessen.
// Technik wie beim vorherigen handgesetzten Versuch: ein ruhiger
// Kopf-Grundfacher (ein Hub, glatte Aussenkontur) traegt drei kleine,
// eigene Mini-Facher fuer Augen/Nase/Mund (vermeidet duenne
// "Pizzaschnitten"-Dreiecke bei Detailpunkten in einem einzigen, weit
// entfernten Facher). Hub liegt auf der im Foto tatsaechlich sichtbaren
// Hell-Dunkel-Trennlinie der Beleuchtung (~Bildmitte) - dadurch fallen die
// Facetten schon von selbst ueberwiegend auf die "richtige" Licht-/
// Schattenseite. Wunschfarbe (Messing) wird wie bei der Katze per
// Foto-Einfaerbe-Filter (tintColor) gesetzt, nicht ueber `tone`.
const PERSON_VIEW_BOX = "0 0 377 480";
const PERSON_CENTER = { x: 188, y: 240 };
const PERSON_IMAGE_URL = "/hero-source/person-head.webp";
const PERSON_FACETS: FacetDef[] = [
  // Kopf-Grundform (Fan um Hub 188,200 - glatte Aussenkontur inkl.
  // Ohr-/Schlaefen-Buckel, OHNE Augen/Nase/Mund-Zickzack)
  { points: "188,200 133,4 215,6", tone: "messing" },
  { points: "188,200 215,6 290,17", tone: "messing" },
  { points: "188,200 290,17 335,78", tone: "messing" },
  { points: "188,200 335,78 350,145", tone: "messing" },
  { points: "188,200 350,145 325,210", tone: "messing" },
  { points: "188,200 325,210 300,260", tone: "messing" },
  { points: "188,200 300,260 250,300", tone: "messing" },
  { points: "188,200 250,300 195,345", tone: "messing" },
  { points: "188,200 195,345 140,300", tone: "messing" },
  { points: "188,200 140,300 110,260", tone: "messing" },
  { points: "188,200 110,260 95,210", tone: "messing" },
  { points: "188,200 95,210 80,145", tone: "messing" },
  { points: "188,200 80,145 85,78", tone: "messing" },
  { points: "188,200 85,78 133,4", tone: "messing" },
  // Linkes Auge (Mini-Facher, Hub 150,205 - Schattenseite)
  { points: "150,205 125,168 95,182", tone: "messing" },
  { points: "150,205 95,182 115,212", tone: "messing" },
  { points: "150,205 115,212 160,208", tone: "messing" },
  { points: "150,205 160,208 168,182", tone: "messing" },
  { points: "150,205 168,182 125,168", tone: "messing" },
  // Rechtes Auge (Mini-Facher, Hub 232,197 - Lichtseite)
  { points: "232,197 255,165 285,178", tone: "messing" },
  { points: "232,197 285,178 265,207", tone: "messing" },
  { points: "232,197 265,207 220,205", tone: "messing" },
  { points: "232,197 220,205 212,180", tone: "messing" },
  { points: "232,197 212,180 255,165", tone: "messing" },
  // Nase (Mini-Facher, Hub 190,255 - Bruecke bis Spitze/Nasenfluegel)
  { points: "190,255 188,190 210,232", tone: "messing" },
  { points: "190,255 210,232 205,260", tone: "messing" },
  { points: "190,255 205,260 190,272", tone: "messing" },
  { points: "190,255 190,272 175,262", tone: "messing" },
  { points: "190,255 175,262 165,235", tone: "messing" },
  { points: "190,255 165,235 188,190", tone: "messing" },
  // Mund (Mini-Facher, Hub 190,300)
  { points: "190,300 270,288 195,278", tone: "messing" },
  { points: "190,300 195,278 120,290", tone: "messing" },
  { points: "190,300 120,290 150,320", tone: "messing" },
  { points: "190,300 150,320 195,332", tone: "messing" },
  { points: "190,300 195,332 240,318", tone: "messing" },
  { points: "190,300 240,318 270,288", tone: "messing" },
  // Hals
  { points: "150,340 230,335 260,420", tone: "messing" },
  { points: "150,340 260,420 120,420", tone: "messing" },
  // Schultern/Buste (Fan um Hub 190,440)
  { points: "190,440 120,420 20,455", tone: "messing" },
  { points: "190,440 20,455 60,480", tone: "messing" },
  { points: "190,440 60,480 320,480", tone: "messing" },
  { points: "190,440 320,480 355,455", tone: "messing" },
  { points: "190,440 355,455 260,420", tone: "messing" },
  { points: "190,440 260,420 120,420", tone: "messing" },
];

// Einfacher Platzhalter-Nachttisch (bewusst schlicht - Feinschliff der
// "kreativen Ausbauweise" ist ein späteres, eigenes Thema): Deckplatte,
// Front mit Schublade, Seitenfläche, zwei Beine, kleiner Knauf.
const NIGHTSTAND_FACETS: FacetDef[] = [
  // Deckplatte (leicht schräg für Tiefenwirkung)
  { points: "60,60 190,60 210,40", tone: "steelLight" },
  { points: "60,60 210,40 80,40", tone: "steelLight" },
  // Korpus oben (über der Schublade)
  { points: "60,60 190,60 190,130", tone: "steel" },
  { points: "60,60 190,130 60,130", tone: "steel" },
  // Schublade (unten, mit kleinem Knauf-Akzent)
  { points: "60,130 190,130 190,200", tone: "bronze" },
  { points: "60,130 190,200 60,200", tone: "bronze" },
  { points: "118,158 132,158 125,172", tone: "steelLight" },
  // Seitenfläche rechts
  { points: "190,60 210,40 210,180", tone: "steelLight" },
  { points: "190,60 210,180 190,200", tone: "steel" },
  // Beine
  { points: "65,200 80,200 70,240", tone: "steel" },
  { points: "170,200 185,200 178,240", tone: "steel" },
];

// Saguaro-Kaktus: Mittelsäule aus 4 gestapelten Segmenten + zwei schmale,
// AUFRECHTE Arme, die parallel zur Säule nach oben wachsen (nicht als breite
// Flossen an der Basis - sonst liest es sich wie eine Rakete statt Kaktus).
const CACTUS_FACETS: FacetDef[] = [
  // Kuppe
  { points: "120,15 100,40 140,40", tone: "steelLight" },
  // Mittelsäule (4 Segmente, abwechselnde Tönung)
  { points: "100,40 140,40 140,90", tone: "steel" },
  { points: "100,40 140,90 100,90", tone: "steel" },
  { points: "100,90 140,90 140,150", tone: "steelLight" },
  { points: "100,90 140,150 100,150", tone: "steelLight" },
  { points: "100,150 140,150 140,200", tone: "steel" },
  { points: "100,150 140,200 100,200", tone: "steel" },
  { points: "100,200 140,200 140,250", tone: "steelLight" },
  { points: "100,200 140,250 100,250", tone: "steelLight" },
  // Linker Arm: schmale, hochragende Säule dicht neben dem Stamm
  { points: "100,210 68,200 68,110", tone: "bronze" },
  { points: "100,210 68,110 100,150", tone: "bronze" },
  { points: "68,110 58,90 100,150", tone: "steel" },
  // Rechter Arm (gespiegelt)
  { points: "140,210 172,200 172,110", tone: "bronze" },
  { points: "140,210 172,110 140,150", tone: "bronze" },
  { points: "172,110 182,90 140,150", tone: "steel" },
];

export interface HeroSlide {
  id: string;
  eyebrow: string;
  headingLines: string[];
  paragraph: string;
  facets: FacetDef[];
  viewBox: string;
  center: { x: number; y: number };
  scatterDistance?: number;
  ariaLabel: string;
  /** "Scherben-Foto"-Modus (siehe LowPolyMesh.tsx) - wenn gesetzt, werden
   * die Facetten als Fragmente dieses echten Fotos gerendert statt flach
   * eingefaerbt. */
  imageUrl?: string;
  /** Hex-Wunschfarbe fuer den Foto-Einfaerbe-Filter (nur mit `imageUrl`
   * wirksam) - siehe LowPolyMesh.tsx `PhotoTintFilter`. */
  tintColor?: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "haustier",
    eyebrow: "Individuelle Metallkunst",
    headingLines: ["Dein Haustier.", "Als edle Low-Poly-Skulptur."],
    paragraph:
      "Ein Foto genügt. Unsere KI verwandelt es in ein facettiertes 3D-Kunstwerk — als massive Stahlskulptur gefertigt, in deiner Wunschfarbe, in wenigen Minuten vorab zu sehen.",
    facets: CAT_FACETS,
    viewBox: CAT_VIEW_BOX,
    center: CAT_CENTER,
    imageUrl: CAT_IMAGE_URL,
    tintColor: KUPFER_HEX,
    ariaLabel:
      "Foto einer Low-Poly-Stahlskulptur eines Katzenkopfs in Kupfer-Finish, deren Fragmente sich zusammensetzen und dann der Maus folgt",
  },
  {
    id: "mensch",
    eyebrow: "Individuelle Metallkunst",
    headingLines: ["Du selbst.", "Als edle Low-Poly-Skulptur."],
    paragraph:
      "Nicht nur dein Haustier — auch dein eigenes Porträt wird zum facettierten 3D-Kunstwerk. Ein Foto genügt, der Rest ist Handwerk aus massivem Stahl.",
    facets: PERSON_FACETS,
    viewBox: PERSON_VIEW_BOX,
    center: PERSON_CENTER,
    imageUrl: PERSON_IMAGE_URL,
    tintColor: MESSING_HEX,
    ariaLabel:
      "Foto einer Low-Poly-Porträtbüste in Messing-Finish, deren Fragmente sich zusammensetzen und dann der Maus folgen",
  },
  {
    id: "objekt",
    eyebrow: "Individuelle Metallkunst",
    headingLines: ["Definiere Kunstobjekte."],
    paragraph:
      "Nicht nur Lebewesen — auch Möbel und Alltagsobjekte lassen sich als facettierte Metallkunst neu denken. Ein erstes Beispiel, mehr Motive folgen.",
    facets: NIGHTSTAND_FACETS,
    viewBox: VIEW_BOX,
    center: CENTER,
    ariaLabel:
      "Low-Poly-Illustration eines Nachttischs aus facettierten Dreiecken, die sich zusammensetzt und dann der Maus folgt",
  },
  {
    id: "kaktus",
    eyebrow: "Individuelle Metallkunst",
    headingLines: ["Dein Kaktus...?"],
    paragraph:
      "Auch Pflanzen wirken als Low-Poly-Metallkunst überraschend lebendig — pflegeleicht im Wortsinn, und garantiert stachelfrei beim Anfassen.",
    facets: CACTUS_FACETS,
    viewBox: VIEW_BOX,
    center: CENTER,
    ariaLabel:
      "Low-Poly-Illustration eines Kaktus aus facettierten Dreiecken, die sich zusammensetzt und dann der Maus folgt",
  },
];
