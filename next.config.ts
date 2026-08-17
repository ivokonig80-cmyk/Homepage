import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Verhindert, dass Turbopack fälschlich das Home-Verzeichnis als
  // Workspace-Root erkennt, nur weil dort (von einem anderen Tool/Projekt)
  // zufällig eine pnpm-lock.yaml liegt - der Projektordner selbst ist
  // eindeutig die Wurzel.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
