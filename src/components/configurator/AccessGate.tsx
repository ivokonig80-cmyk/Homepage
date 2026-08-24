"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ACCESS_TOKEN_STORAGE_KEY } from "@/lib/sculptureApi";

/**
 * Schuetzt den Konfigurator waehrend der Testphase vor unkontrolliertem
 * Zugriff (der Foto-zu-3D-Schritt loest echte, kostenpflichtige Tripo-Tasks
 * aus - siehe backend/src/main.rs). Bewusst kein Passwortfeld/echtes Login:
 * der Code wird nur lokal gemerkt und bei jeder Anfrage an das Backend
 * mitgeschickt, das ihn serverseitig gegen ACCESS_TOKEN prueft (siehe dort) -
 * die Gate-Komponente selbst validiert nichts, sonst stuende der Code im
 * oeffentlichen JS-Bundle.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const [hasCode, setHasCode] = useState(
    () => typeof window !== "undefined" && Boolean(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY))
  );
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, value.trim());
    setHasCode(true);
  }

  if (hasCode) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight">Zugangscode</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Der Konfigurator befindet sich im Testbetrieb. Bitte gib den
          Zugangscode ein, den du vom Betreiber erhalten hast.
        </p>
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Zugangscode"
          className="mt-6 w-full rounded-xl border border-border-subtle bg-background px-4 py-2.5 text-center text-sm outline-none transition-colors focus-visible:border-accent-warm focus-visible:ring-2 focus-visible:ring-accent-warm"
        />
        <button
          type="submit"
          className="mt-4 w-full rounded-full bg-accent-warm px-6 py-3 text-center font-medium text-background transition-opacity hover:opacity-90"
        >
          Weiter
        </button>
      </form>
    </div>
  );
}
