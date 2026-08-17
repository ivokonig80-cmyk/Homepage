"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { Suspense, useEffect, useRef } from "react";
import type { Group } from "three";
import type { SculpturePart } from "@/lib/catalog";

/**
 * Rendert die Low-Poly-Skulptur aus einfachen Grundkörpern (siehe
 * Kommentar in lib/catalog.ts - Platzhalter bis echte Tripo-generierte
 * Meshes verfügbar sind). Bewusst ohne Environment-Map/Schatten/
 * Post-Processing, um pro Karte im Shop-Grid mehrere gleichzeitig laufende
 * Canvases performant zu halten (siehe Konzept: "möglichst interaktiv,
 * aber leicht in der Darstellung").
 */
function PartMesh({ part, color }: { part: SculpturePart; color: string }) {
  const scaleArr: [number, number, number] = Array.isArray(part.scale)
    ? part.scale
    : [part.scale, part.scale, part.scale];
  return (
    <mesh position={part.position} rotation={part.rotation ?? [0, 0, 0]} scale={scaleArr}>
      {part.geometry === "facet" && <icosahedronGeometry args={[1, 0]} />}
      {part.geometry === "sphere" && <icosahedronGeometry args={[1, 1]} />}
      {part.geometry === "cone" && <coneGeometry args={[1, 1.7, 6]} />}
      {part.geometry === "box" && <boxGeometry args={[1, 1, 1]} />}
      <meshStandardMaterial color={color} flatShading roughness={0.35} metalness={0.7} />
    </mesh>
  );
}

function RotatingGroup({
  speed,
  children,
}: {
  speed: number;
  children: React.ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current && speed > 0) {
      ref.current.rotation.y += delta * speed;
    }
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * Rendert nach dem ersten Frame ein PNG-Snapshot des Canvas (für die
 * "Bei dir zuhause"-Foto-Platzierung - siehe PlacementCanvas.tsx). Braucht
 * `preserveDrawingBuffer: true` auf dem Canvas, sonst ist der Framebuffer
 * beim Aufruf von toDataURL schon wieder gelöscht.
 */
function SnapshotCapture({ onSnapshot }: { onSnapshot: (dataUrl: string) => void }) {
  const { gl, scene, camera } = useThree();
  const captured = useRef(false);

  useEffect(() => {
    if (captured.current) return;
    const id = requestAnimationFrame(() => {
      gl.render(scene, camera);
      onSnapshot(gl.domElement.toDataURL("image/png"));
      captured.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [gl, scene, camera, onSnapshot]);

  return null;
}

interface SculptureViewerProps {
  parts: SculpturePart[];
  colorHex: string;
  scale?: number;
  interactive?: boolean;
  autoRotateSpeed?: number;
  className?: string;
  /** Wenn gesetzt, wird einmalig nach dem ersten Render ein transparentes
   * PNG-Snapshot des aktuellen Zustands erzeugt und zurückgegeben. */
  onSnapshot?: (dataUrl: string) => void;
}

export function SculptureViewer({
  parts,
  colorHex,
  scale = 1,
  interactive = false,
  autoRotateSpeed = 0.5,
  className,
  onSnapshot,
}: SculptureViewerProps) {
  const prefersReducedMotion = useReducedMotion();
  const effectiveSpeed = prefersReducedMotion ? 0 : autoRotateSpeed;

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: true }}
        camera={{ position: [0, 0.5, 4.4], fov: 36 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} />
        <directionalLight position={[-3, -1.5, -2]} intensity={0.3} />
        <Suspense fallback={null}>
          <group scale={scale}>
            <RotatingGroup speed={effectiveSpeed}>
              {parts.map((part, i) => (
                <PartMesh key={i} part={part} color={colorHex} />
              ))}
            </RotatingGroup>
          </group>
        </Suspense>
        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.7}
          />
        )}
        {onSnapshot && <SnapshotCapture onSnapshot={onSnapshot} />}
      </Canvas>
    </div>
  );
}
