"use client";

import { useRef, useState, type PointerEvent } from "react";

interface PlacementCanvasProps {
  backgroundUrl: string;
  stickerUrl: string;
}

/**
 * Client-seitiges Foto-Compositing (siehe Konzept Abschnitt 4.4): Kein
 * KI-Aufruf nötig, nur ein PNG-Snapshot der 3D-Skulptur (aus
 * SculptureViewer, siehe onSnapshot) als per Drag frei platzierbarer,
 * skalierbarer Sticker über dem eigenen Foto.
 */
export function PlacementCanvas({ backgroundUrl, stickerUrl }: PlacementCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 62 });
  const [scalePct, setScalePct] = useState(32);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );

  function handlePointerDown(e: PointerEvent<HTMLImageElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }

  function handlePointerMove(e: PointerEvent<HTMLImageElement>) {
    if (!dragState.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - dragState.current.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragState.current.startY) / rect.height) * 100;
    setPos({
      x: Math.min(95, Math.max(5, dragState.current.origX + dxPct)),
      y: Math.min(95, Math.max(5, dragState.current.origY + dyPct)),
    });
  }

  function handlePointerUp(e: PointerEvent<HTMLImageElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragState.current = null;
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border-subtle bg-background-elevated"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={backgroundUrl} alt="Dein hochgeladenes Foto" className="h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stickerUrl}
          alt="Vorschau der Skulptur an gewählter Position — ziehen zum Verschieben"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          draggable={false}
          style={{
            position: "absolute",
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            width: `${scalePct}%`,
            transform: "translate(-50%, -50%)",
            touchAction: "none",
            cursor: "grab",
            filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.5))",
          }}
        />
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm text-foreground-muted">
        Größe in der Vorschau
        <input
          type="range"
          min={15}
          max={70}
          value={scalePct}
          onChange={(e) => setScalePct(Number(e.target.value))}
          className="flex-1 accent-accent-warm"
        />
      </label>
      <p className="mt-2 text-xs text-foreground-muted">
        Skulptur ziehen, um sie an die gewünschte Stelle zu verschieben.
      </p>
    </div>
  );
}
