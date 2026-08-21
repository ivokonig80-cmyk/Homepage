import type { FacetDef } from "./LowPolyMesh";
import { MATERIALS } from "@/lib/catalog";

// Wunschfarbe fuer das Katzen-Foto direkt aus dem echten Shop-Katalog
// (nicht dupliziert) - zeigt am Hero-Motiv genau die Farboption, die im
// Konfigurator/Shop tatsaechlich waehlbar ist.
const KUPFER_HEX = MATERIALS.find((m) => m.id === "kupfer")!.colorHex;
const MESSING_HEX = MATERIALS.find((m) => m.id === "messing")!.colorHex;
const ROHSTAHL_HEX = MATERIALS.find((m) => m.id === "rohstahl")!.colorHex;
const ANTHRAZIT_HEX = MATERIALS.find((m) => m.id === "anthrazit")!.colorHex;

/**
 * Daten für die 4 Hero-Slides (Text + Dreiecks-Facetten je Motiv, siehe
 * HeroCarousel.tsx). Alle vier Motive laufen inzwischen im "Scherben-Foto"-
 * Modus (echtes Foto statt Handzeichnung, siehe LowPolyMesh.tsx) - jedes
 * Motiv hat dadurch seine eigene, an sein Quellfoto angepasste viewBox/
 * Zentrum statt einer geteilten Platzhalter-Box.
 */

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

// Objekt-Motiv: echtes Foto ("Scherben-Foto"-Modus, wie Katze/Person) -
// Quelle ist ein handverlesener, verschweisster Low-Poly-Stahlhocker
// (kein Nachttisch mit Schublade mehr - das war explizit verworfen: zu
// funktional/moebelhaft statt Skulptur). Von drei bereitgestellten
// Fotowinkeln ist dieser der symmetrischste/frontalste (am wenigsten
// Perspektivverzerrung -> praezisere Kanten-Nachzeichnung, siehe
// public/hero-source/ChatGPT Image ... 16_18_15.png), zusaetzlich per
// Vermassungs-/Liniengrafik-Beiblatt (16_18_20.png) gegengeprueft.
// Freigestellt und exakt zugeschnitten (827x1300, PERSON_VIEW_BOX-Analogon
// STOOL_VIEW_BOX). Facetten per Koordinatengitter-Overlay direkt am Foto
// abgelesen: Tischplatten-Facher oben, darunter ein Konsolen-/Uebergangs-
// Facher zu den beiden sichtbaren Vorderbeinen, jedes Bein als zwei lange
// Dreiecke (die im Foto sichtbare Knick-/Faltlinie) bis zur Spitze.
const STOOL_VIEW_BOX = "0 0 827 1300";
const STOOL_CENTER = { x: 410, y: 500 };
const STOOL_IMAGE_URL = "/hero-source/stool.webp";
const STOOL_FACETS: FacetDef[] = [
  // Tischplatte (Fan um Hub 410,70)
  { points: "410,70 400,5 805,148", tone: "messing" },
  { points: "410,70 805,148 410,175", tone: "messing" },
  { points: "410,70 410,175 45,148", tone: "messing" },
  { points: "410,70 45,148 400,5", tone: "messing" },
  // Konsole/Uebergang zu den Beinen (Fan um Hub 410,255)
  { points: "410,255 45,148 55,195", tone: "messing" },
  { points: "410,255 55,195 255,355", tone: "messing" },
  { points: "410,255 255,355 410,350", tone: "messing" },
  { points: "410,255 410,350 565,355", tone: "messing" },
  { points: "410,255 565,355 795,195", tone: "messing" },
  { points: "410,255 795,195 805,148", tone: "messing" },
  { points: "410,255 805,148 410,175", tone: "messing" },
  { points: "410,255 410,175 45,148", tone: "messing" },
  // Linkes Vorderbein (zwei lange Dreiecke, geteilt durch die im Foto
  // sichtbare Knicklinie, spitz zulaufend)
  { points: "55,195 140,270 155,1245", tone: "messing" },
  { points: "140,270 255,355 155,1245", tone: "messing" },
  // Rechtes Vorderbein (Spiegelung)
  { points: "795,195 690,270 672,1245", tone: "messing" },
  { points: "690,270 565,355 672,1245", tone: "messing" },
];

// Kaktus-Motiv: echtes Foto ("Scherben-Foto"-Modus, wie Katze/Person/
// Objekt) - Quelle ist ein verschweisster Low-Poly-Stahlkaktus (Wueste,
// siehe public/hero-source/ChatGPT Image ... 16_38_20.png), gegenueber
// einer zweiten, ebenfalls gepruesten Chrom-Variante gewaehlt, weil das
// matte, genahte Stahlblech zum "massive Stahlskulptur"-Material von
// Katze/Person/Objekt passt statt einer polierten Spiegel-Optik. Trotz
// unruhigem Wuesten-Hintergrund liess sich die Freistellung sauber
// durchfuehren (per Kantenglaettungs-Test verifiziert); der unterste,
// etwas unsauberere Bodenkontakt-Bereich wurde vor dem Zuschnitt entfernt.
// Facetten per Koordinatengitter-Overlay direkt am Foto abgelesen: Kristall-
// Kuppen-Facher oben, darunter ein langer Stamm-Facher, an den die drei
// sichtbaren Arme (zwei kompakte Kristall-Facher + ein langer gebogener
// Arm als zweigeteilte Klinge) an ihren jeweiligen Ansatzpunkten andocken.
const CACTUS_VIEW_BOX = "0 0 691 1001";
const CACTUS_CENTER = { x: 345, y: 500 };
const CACTUS_IMAGE_URL = "/hero-source/cactus.webp";
const CACTUS_FACETS: FacetDef[] = [
  // Kristall-Kuppe des Stamms (Fan um Hub 365,45)
  { points: "365,45 365,5 440,60", tone: "steel" },
  { points: "365,45 440,60 400,110", tone: "steel" },
  { points: "365,45 400,110 330,110", tone: "steel" },
  { points: "365,45 330,110 285,55", tone: "steel" },
  { points: "365,45 285,55 365,5", tone: "steel" },
  // Stamm (Fan um Hub 345,600 - Aussenkontur inkl. Arm-Ansatzpunkte)
  { points: "345,600 285,55 255,320", tone: "steel" },
  { points: "345,600 255,320 215,460", tone: "steel" },
  { points: "345,600 215,460 210,600", tone: "steel" },
  { points: "345,600 210,600 210,750", tone: "steel" },
  { points: "345,600 210,750 200,950", tone: "steel" },
  { points: "345,600 200,950 430,950", tone: "steel" },
  { points: "345,600 430,950 455,600", tone: "steel" },
  { points: "345,600 455,600 460,420", tone: "steel" },
  { points: "345,600 460,420 440,60", tone: "steel" },
  { points: "345,600 440,60 285,55", tone: "steel" },
  // Oberer linker Arm, kurz mit eigener Kristallspitze (Fan um Hub 160,290)
  { points: "160,290 135,215 185,235", tone: "steel" },
  { points: "160,290 185,235 255,320", tone: "steel" },
  { points: "160,290 255,320 95,320", tone: "steel" },
  { points: "160,290 95,320 105,260", tone: "steel" },
  { points: "160,290 105,260 135,215", tone: "steel" },
  // Rechter Arm, eigene Kristallspitze (Fan um Hub 520,280)
  { points: "520,280 605,140 650,190", tone: "steel" },
  { points: "520,280 650,190 590,420", tone: "steel" },
  { points: "520,280 590,420 460,420", tone: "steel" },
  { points: "520,280 460,420 500,220", tone: "steel" },
  { points: "520,280 500,220 605,140", tone: "steel" },
  // Unterer linker Arm, lang mit Ellenbogen-Biegung (zwei lange Dreiecke,
  // geteilt entlang der im Foto sichtbaren Aussen-/Innenkante)
  { points: "215,750 60,655 35,440", tone: "steel" },
  { points: "215,750 35,440 140,600", tone: "steel" },
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
  /** Optionale Overrides fuer die Duoton-Kontrastbreite des Foto-
   * Einfaerbe-Filters (siehe LowPolyMesh.tsx `PhotoTintFilter`). */
  tintDarkMix?: number;
  tintLightMix?: number;
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
    // Die generelle Aufhellung (siehe PhotoTintFilter-Defaults) war fuer
    // die Katze nicht noetig - Kupfer war beim urspruenglichen, staerkeren
    // Kontrast schon gut lesbar. Alte Werte bewusst nur hier beibehalten.
    tintDarkMix: 0.68,
    tintLightMix: 0.62,
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
    facets: STOOL_FACETS,
    viewBox: STOOL_VIEW_BOX,
    center: STOOL_CENTER,
    imageUrl: STOOL_IMAGE_URL,
    tintColor: ROHSTAHL_HEX,
    ariaLabel:
      "Foto eines Low-Poly-Stahlhockers in Rohstahl-Finish, dessen Fragmente sich zusammensetzen und dann der Maus folgen",
  },
  {
    id: "kaktus",
    eyebrow: "Individuelle Metallkunst",
    headingLines: ["Dein Kaktus...?"],
    paragraph:
      "Auch Pflanzen wirken als Low-Poly-Metallkunst überraschend lebendig — pflegeleicht im Wortsinn, und garantiert stachelfrei beim Anfassen.",
    facets: CACTUS_FACETS,
    viewBox: CACTUS_VIEW_BOX,
    center: CACTUS_CENTER,
    imageUrl: CACTUS_IMAGE_URL,
    tintColor: ANTHRAZIT_HEX,
    ariaLabel:
      "Foto eines Low-Poly-Stahlkaktus in Anthrazit-Finish, dessen Fragmente sich zusammensetzen und dann der Maus folgen",
  },
];
