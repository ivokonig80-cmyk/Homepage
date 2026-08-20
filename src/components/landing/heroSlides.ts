import type { FacetDef } from "./LowPolyMesh";

/**
 * Daten für die 4 Hero-Slides (Text + Dreiecks-Facetten je Motiv, siehe
 * HeroCarousel.tsx). Alle Motive teilen dieselbe viewBox/dasselbe
 * Zentrum, damit sie sich innerhalb desselben Hero-Layouts konsistent
 * verhalten - Facetten je Motiv sind bewusst im selben handgesetzten
 * Platzhalter-Stil wie das ursprüngliche Katzenmotiv (siehe LowPolyMesh.tsx).
 */

const VIEW_BOX = "0 0 240 260";
const CENTER = { x: 120, y: 130 };

const CAT_FACETS: FacetDef[] = [
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

// Kopf: sechseckige Facettenkuppel (Fan aus einem Mittelpunkt) - Hals als
// schmaler Steg, Torso als sechseckiger Facetten-Faecher (Fan aus einem
// Mittelpunkt, wie der Kopf) mit breiter Schulterlinie, die dann leicht zur
// Taille zulaeuft - liest sich als Buerste/Oberkoerper statt als spitzer
// Anhaenger.
const PERSON_FACETS: FacetDef[] = [
  // Kopf (Fan um G=120,65)
  { points: "120,65 120,10 168,35", tone: "steelLight" },
  { points: "120,65 168,35 185,85", tone: "steel" },
  { points: "120,65 185,85 120,115", tone: "steelLight" },
  { points: "120,65 120,115 55,85", tone: "bronze" },
  { points: "120,65 55,85 72,35", tone: "steel" },
  { points: "120,65 72,35 120,10", tone: "steelLight" },
  // Hals
  { points: "120,115 100,155 140,155", tone: "steel" },
  // Torso (Fan um C=120,205): Hals -> breite Schulter -> leicht schmalere Taille
  { points: "120,205 100,155 35,185", tone: "steelLight" },
  { points: "120,205 35,185 60,250", tone: "bronze" },
  { points: "120,205 60,250 180,250", tone: "steel" },
  { points: "120,205 180,250 205,185", tone: "bronze" },
  { points: "120,205 205,185 140,155", tone: "steelLight" },
  { points: "120,205 140,155 100,155", tone: "steel" },
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
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "haustier",
    eyebrow: "Individuelle Metallkunst",
    headingLines: ["Dein Haustier.", "Als edle Low-Poly-Skulptur."],
    paragraph:
      "Ein Foto genügt. Unsere KI verwandelt es in ein facettiertes 3D-Kunstwerk — als massive Stahlskulptur gefertigt, in deiner Wunschfarbe, in wenigen Minuten vorab zu sehen.",
    facets: CAT_FACETS,
    viewBox: VIEW_BOX,
    center: CENTER,
    ariaLabel:
      "Low-Poly-Illustration eines Katzenkopfs aus facettierten Dreiecken, die sich zusammensetzen und dann der Maus folgt",
  },
  {
    id: "mensch",
    eyebrow: "Individuelle Metallkunst",
    headingLines: ["Du selbst.", "Als edle Low-Poly-Skulptur."],
    paragraph:
      "Nicht nur dein Haustier — auch dein eigenes Porträt wird zum facettierten 3D-Kunstwerk. Ein Foto genügt, der Rest ist Handwerk aus massivem Stahl.",
    facets: PERSON_FACETS,
    viewBox: VIEW_BOX,
    center: CENTER,
    ariaLabel:
      "Low-Poly-Illustration eines Porträtbüste aus facettierten Dreiecken, die sich zusammensetzt und dann der Maus folgt",
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
