// Minimaler .env-Loader fuer lokale/manuelle Laeufe der reporting/-Skripte
// (kein dotenv-Package, um reporting/ bewusst ohne zusaetzliche npm-
// Abhaengigkeiten fuer diesen Teil lauffaehig zu halten). Automatisierte
// Laeufe (GitHub Actions) setzen die Env-Vars stattdessen direkt ueber
// Secrets, brauchen diese Datei also nicht.

import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadLocalEnv() {
  try {
    const raw = await readFile(path.join(process.cwd(), "reporting", ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  } catch {
    // Keine lokale .env vorhanden - kein Problem, z.B. in CI.
  }
}
