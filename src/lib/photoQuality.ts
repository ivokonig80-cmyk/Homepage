// Rein clientseitige, kostenlose Grob-Pruefung hochgeladener Fotos - bewusst
// KEINE Vision-KI (wuerde einen zusaetzlichen kostenpflichtigen Call bei
// JEDEM Upload bedeuten, nicht nur bei tatsaechlich schlechten Fotos).

const BRIGHTNESS_THRESHOLD = 55; // von 255 - grober Erfahrungswert
const SAMPLE_SIZE = 64; // klein gehalten, reicht fuer einen Helligkeits-Mittelwert

export interface BrightnessCheckResult {
  ok: boolean;
  brightness: number;
}

/** Laedt das Bild in ein kleines Offscreen-Canvas und berechnet die
 * durchschnittliche Helligkeit (0-255) ueber alle Pixel. */
export function checkBrightness(file: File): Promise<BrightnessCheckResult> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ ok: true, brightness: 255 });
          return;
        }
        // Weiss vorfuellen, BEVOR das Bild gezeichnet wird: transparente
        // Bereiche (z.B. freigestellte PNGs/WebPs) zaehlen sonst als
        // Schwarz mit in den Durchschnitt und ziehen die gemessene
        // Helligkeit kuenstlich weit unter den tatsaechlichen Wert (live
        // beobachtet: ein normal helles, aber freigestelltes Testfoto kam
        // sonst auf ~54 statt ~92 von 255).
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const brightness = sum / (data.length / 4);
        resolve({ ok: brightness >= BRIGHTNESS_THRESHOLD, brightness });
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_load_failed"));
    };
    img.src = url;
  });
}
