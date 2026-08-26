// Katalog der 5-10 vorgefertigten Skulpturen für den "Fertige Modelle"-Shop
// (siehe Konzept: löst nebenbei die Abhängigkeit von Live-Tripo-Guthaben für
// die Kern-Shop-Erfahrung - hier wird nichts pro Kunde live generiert).
//
// WICHTIG - aktueller Stand: Die `parts` unten sind bewusst einfache,
// komplett selbst geschriebene Low-Poly-Formen aus Grundkörpern
// (Ikosaeder/Kegel/Box), damit wir schon jetzt (ohne Tripo-Guthaben, ohne
// Lizenzfragen bei externen Assets) den kompletten Shop-Flow inkl. 3D-
// Vorschau, Material-/Größenwahl und Interaktion bauen und zeigen können.
// Sobald echtes Tripo-Guthaben da ist, ersetzen wir `parts` pro Artikel
// durch ein echtes generiertes Mesh (glTF/GLB), ohne dass sich an Shop-UI,
// Routing oder Preislogik etwas ändern muss - der SculptureViewer bekommt
// dafür einfach zusätzlich eine `modelUrl`-Prop (kommt in einem späteren
// Schritt dazu).

export type MaterialOption = {
  id: string;
  label: string;
  colorHex: string;
  priceDelta: number;
};

export type SizeOption = {
  id: string;
  label: string;
  scale: number;
  priceDelta: number;
};

export type SculpturePart = {
  geometry: "facet" | "cone" | "sphere" | "box";
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number] | number;
};

export type CatalogItem = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  basePrice: number;
  parts: SculpturePart[];
};

export const MATERIALS: MaterialOption[] = [
  { id: "anthrazit", label: "Stahl Anthrazit", colorHex: "#3a3d42", priceDelta: 0 },
  { id: "rohstahl", label: "Rohstahl gebürstet", colorHex: "#9195a0", priceDelta: 0 },
  { id: "messing", label: "Messing-Finish", colorHex: "#c9a961", priceDelta: 45 },
  { id: "kupfer", label: "Kupfer-Finish", colorHex: "#b5652f", priceDelta: 45 },
];

export const SIZES: SizeOption[] = [
  { id: "s", label: "S — ca. 18 cm", scale: 0.78, priceDelta: 0 },
  { id: "m", label: "M — ca. 28 cm", scale: 1, priceDelta: 60 },
  { id: "l", label: "L — ca. 42 cm", scale: 1.3, priceDelta: 140 },
];

export const DEFAULT_MATERIAL_ID = MATERIALS[0].id;
export const DEFAULT_SIZE_ID = SIZES[1].id;

export const CATALOG: CatalogItem[] = [
  {
    slug: "fuchs",
    name: "Fuchs",
    tagline: "Wachsam, schlank, aufmerksam",
    description:
      "Ein spitzköpfiger Fuchs in klaren Facetten - schlanke Schnauze, aufgestellte Ohren, buschiger Schwanz. Wirkt am Eingang oder auf dem Regal am besten.",
    basePrice: 249,
    parts: [
      { geometry: "facet", position: [0, 0.35, 0.5], scale: [0.55, 0.5, 0.75] },
      { geometry: "cone", position: [0, 0.25, 1.1], rotation: [Math.PI / 2, 0, 0], scale: [0.32, 0.7, 0.32] },
      { geometry: "cone", position: [-0.28, 0.75, 0.4], rotation: [0, 0, -0.15], scale: [0.18, 0.4, 0.18] },
      { geometry: "cone", position: [0.28, 0.75, 0.4], rotation: [0, 0, 0.15], scale: [0.18, 0.4, 0.18] },
      { geometry: "facet", position: [0, 0, -0.3], scale: [0.6, 0.55, 0.9] },
      { geometry: "cone", position: [0, -0.05, -1.15], rotation: [Math.PI / 2.3, 0, 0], scale: [0.3, 1, 0.3] },
      { geometry: "box", position: [0.32, -0.5, 0.2], scale: [0.16, 0.9, 0.16] },
      { geometry: "box", position: [-0.32, -0.5, 0.2], scale: [0.16, 0.9, 0.16] },
      { geometry: "box", position: [0.3, -0.5, -0.6], scale: [0.16, 0.9, 0.16] },
      { geometry: "box", position: [-0.3, -0.5, -0.6], scale: [0.16, 0.9, 0.16] },
    ],
  },
  {
    slug: "eule",
    name: "Eule",
    tagline: "Rund, ruhig, gefiedert",
    description:
      "Kompakte, runde Silhouette mit markanten Facettenaugen - eine ruhige Präsenz für Regal oder Fensterbank.",
    basePrice: 219,
    parts: [
      { geometry: "sphere", position: [0, 0.3, 0], scale: [0.85, 0.9, 0.8] },
      { geometry: "cone", position: [-0.4, 0.85, 0.1], rotation: [0, 0, 0.35], scale: [0.2, 0.35, 0.2] },
      { geometry: "cone", position: [0.4, 0.85, 0.1], rotation: [0, 0, -0.35], scale: [0.2, 0.35, 0.2] },
      { geometry: "cone", position: [0, 0.15, 0.75], rotation: [Math.PI / 2, 0, 0], scale: [0.14, 0.3, 0.14] },
      { geometry: "facet", position: [0, -0.55, 0], scale: [0.6, 0.35, 0.55] },
    ],
  },
  {
    slug: "wolf",
    name: "Wolf",
    tagline: "Markant, aufrecht, kraftvoll",
    description:
      "Ein aufrecht sitzender Wolfskopf mit breiter Stirn und langer Schnauze - die größte, präsenteste Figur im Katalog.",
    basePrice: 289,
    parts: [
      { geometry: "facet", position: [0, 0.5, 0.3], scale: [0.7, 0.65, 0.85] },
      { geometry: "cone", position: [0, 0.35, 1.15], rotation: [Math.PI / 2, 0, 0], scale: [0.38, 0.8, 0.38] },
      { geometry: "cone", position: [-0.35, 1.05, 0.15], rotation: [0, 0, -0.1], scale: [0.22, 0.45, 0.22] },
      { geometry: "cone", position: [0.35, 1.05, 0.15], rotation: [0, 0, 0.1], scale: [0.22, 0.45, 0.22] },
      { geometry: "facet", position: [0, -0.35, -0.1], scale: [0.75, 0.7, 1.05] },
      { geometry: "box", position: [0.35, -1.05, 0.3], scale: [0.2, 0.7, 0.2] },
      { geometry: "box", position: [-0.35, -1.05, 0.3], scale: [0.2, 0.7, 0.2] },
    ],
  },
  {
    slug: "hase",
    name: "Hase",
    tagline: "Verspielt, langohrig, leicht",
    description:
      "Schlanker Körper mit den charakteristisch langen, aufgestellten Ohren - wirkt besonders gut in kleiner Größe.",
    basePrice: 199,
    parts: [
      { geometry: "facet", position: [0, 0.4, 0.2], scale: [0.5, 0.55, 0.65] },
      { geometry: "cone", position: [-0.18, 1.15, 0.1], rotation: [0, 0, -0.1], scale: [0.13, 0.75, 0.13] },
      { geometry: "cone", position: [0.18, 1.15, 0.1], rotation: [0, 0, 0.1], scale: [0.13, 0.75, 0.13] },
      { geometry: "sphere", position: [0, -0.4, -0.05], scale: [0.65, 0.6, 0.85] },
      { geometry: "sphere", position: [0, -1.0, -0.55], scale: [0.32, 0.28, 0.32] },
    ],
  },
  {
    slug: "baer",
    name: "Bär",
    tagline: "Massiv, ruhig, bodenständig",
    description:
      "Breite, wuchtige Form mit runden Ohren - die massivste Silhouette im Katalog, wirkt besonders auf dem Boden oder einem stabilen Sockel.",
    basePrice: 269,
    parts: [
      { geometry: "sphere", position: [0, 0.55, 0.35], scale: [0.6, 0.55, 0.6] },
      { geometry: "sphere", position: [-0.35, 0.95, 0.2], scale: [0.18, 0.18, 0.18] },
      { geometry: "sphere", position: [0.35, 0.95, 0.2], scale: [0.18, 0.18, 0.18] },
      { geometry: "sphere", position: [0, -0.3, -0.1], scale: [0.9, 0.75, 1] },
      { geometry: "box", position: [0.4, -1.05, 0.25], scale: [0.24, 0.55, 0.3] },
      { geometry: "box", position: [-0.4, -1.05, 0.25], scale: [0.24, 0.55, 0.3] },
    ],
  },
  {
    slug: "katze",
    name: "Katze",
    tagline: "Elegant, sitzend, aufmerksam",
    description:
      "Die klassische sitzende Katzensilhouette mit spitzen Ohren und aufrechtem Schwanz - unser meistverkauftes Motiv.",
    basePrice: 229,
    parts: [
      { geometry: "facet", position: [0, 0.75, 0.15], scale: [0.45, 0.42, 0.5] },
      { geometry: "cone", position: [-0.22, 1.15, 0.05], rotation: [0, 0, -0.25], scale: [0.15, 0.35, 0.15] },
      { geometry: "cone", position: [0.22, 1.15, 0.05], rotation: [0, 0, 0.25], scale: [0.15, 0.35, 0.15] },
      { geometry: "facet", position: [0, -0.15, 0], scale: [0.55, 0.85, 0.6] },
      { geometry: "cone", position: [0.35, 0.15, -0.4], rotation: [0, 0, 0.9], scale: [0.12, 0.9, 0.12] },
    ],
  },
  {
    slug: "reh",
    name: "Reh",
    tagline: "Schlank, hochbeinig, anmutig",
    description:
      "Ein schlankes Reh mit zartem Geweih und langen, filigranen Beinen - wirkt besonders elegant auf einem freistehenden Sockel oder Beistelltisch.",
    basePrice: 275,
    parts: [
      { geometry: "facet", position: [0, 0.55, 0.45], scale: [0.38, 0.36, 0.5] },
      { geometry: "cone", position: [0, 0.42, 0.9], rotation: [Math.PI / 2, 0, 0], scale: [0.14, 0.45, 0.14] },
      { geometry: "cone", position: [-0.2, 0.85, 0.35], rotation: [0, 0, -0.2], scale: [0.11, 0.28, 0.11] },
      { geometry: "cone", position: [0.2, 0.85, 0.35], rotation: [0, 0, 0.2], scale: [0.11, 0.28, 0.11] },
      { geometry: "cone", position: [-0.15, 0.98, 0.5], rotation: [-0.3, 0, -0.35], scale: [0.05, 0.35, 0.05] },
      { geometry: "cone", position: [0.15, 0.98, 0.5], rotation: [-0.3, 0, 0.35], scale: [0.05, 0.35, 0.05] },
      { geometry: "facet", position: [0, 0.05, -0.4], scale: [0.48, 0.46, 0.95] },
      { geometry: "cone", position: [0, 0.15, -1.3], rotation: [Math.PI / 2.3, 0, 0], scale: [0.1, 0.22, 0.1] },
      { geometry: "box", position: [0.16, -0.655, 0.05], scale: [0.085, 0.95, 0.085] },
      { geometry: "box", position: [-0.16, -0.655, 0.05], scale: [0.085, 0.95, 0.085] },
      { geometry: "box", position: [0.16, -0.655, -0.85], scale: [0.085, 0.95, 0.085] },
      { geometry: "box", position: [-0.16, -0.655, -0.85], scale: [0.085, 0.95, 0.085] },
    ],
  },
  {
    slug: "eichhoernchen",
    name: "Eichhörnchen",
    tagline: "Verspielt, wach, kompakt",
    description:
      "Ein sitzendes Eichhörnchen mit großem, geschwungenem Schwanz - kompakt und verspielt, ideal für Regal oder Fensterbank.",
    basePrice: 209,
    parts: [
      { geometry: "sphere", position: [0, -0.15, 0], scale: [0.42, 0.5, 0.42] },
      { geometry: "facet", position: [0, 0.45, 0.15], scale: [0.3, 0.3, 0.32] },
      { geometry: "cone", position: [-0.14, 0.72, 0.12], rotation: [0, 0, -0.15], scale: [0.08, 0.18, 0.08] },
      { geometry: "cone", position: [0.14, 0.72, 0.12], rotation: [0, 0, 0.15], scale: [0.08, 0.18, 0.08] },
      { geometry: "cone", position: [0, 0.38, 0.42], rotation: [Math.PI / 2, 0, 0], scale: [0.1, 0.22, 0.1] },
      { geometry: "sphere", position: [0, -0.05, -0.55], scale: [0.22, 0.3, 0.35] },
      { geometry: "sphere", position: [0, 0.35, -0.75], scale: [0.26, 0.35, 0.3] },
      { geometry: "sphere", position: [0, 0.75, -0.55], scale: [0.24, 0.3, 0.24] },
    ],
  },
  {
    slug: "pinguin",
    name: "Pinguin",
    tagline: "Rundlich, aufrecht, freundlich",
    description:
      "Ein rundlicher, aufrecht stehender Pinguin in klaren Facetten - freundliche, standfeste Silhouette für Regal oder Schreibtisch.",
    basePrice: 225,
    parts: [
      { geometry: "sphere", position: [0, -0.1, 0], scale: [0.55, 0.75, 0.5] },
      { geometry: "sphere", position: [0, 0.65, 0.05], scale: [0.35, 0.35, 0.35] },
      { geometry: "cone", position: [0, 0.6, 0.35], rotation: [Math.PI / 2, 0, 0], scale: [0.1, 0.25, 0.1] },
    ],
  },
  {
    slug: "igel",
    name: "Igel",
    tagline: "Kompakt, stachelig, bodennah",
    description:
      "Ein kompakter, niedriger Igel mit angedeuteten Stacheln - bodennahe, gemütliche Präsenz für Fensterbank oder Eingangsbereich.",
    basePrice: 189,
    parts: [
      { geometry: "sphere", position: [0, -0.15, 0], scale: [0.65, 0.42, 0.6] },
      { geometry: "cone", position: [0, -0.05, 0.62], rotation: [Math.PI / 2, 0, 0], scale: [0.13, 0.3, 0.13] },
      { geometry: "cone", position: [0, 0.32, 0], rotation: [0, 0, 0], scale: [0.07, 0.3, 0.07] },
      { geometry: "cone", position: [-0.25, 0.2, -0.15], rotation: [0.2, 0, -0.3], scale: [0.07, 0.26, 0.07] },
      { geometry: "cone", position: [0.25, 0.2, -0.15], rotation: [0.2, 0, 0.3], scale: [0.07, 0.26, 0.07] },
      { geometry: "cone", position: [0, 0.25, -0.3], rotation: [0.3, 0, 0], scale: [0.07, 0.28, 0.07] },
      { geometry: "cone", position: [-0.3, 0.15, 0.15], rotation: [-0.1, 0, -0.4], scale: [0.06, 0.24, 0.06] },
      { geometry: "cone", position: [0.3, 0.15, 0.15], rotation: [-0.1, 0, 0.4], scale: [0.06, 0.24, 0.06] },
    ],
  },
];
