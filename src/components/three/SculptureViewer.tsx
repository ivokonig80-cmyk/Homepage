"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Box3, Vector3, MeshStandardMaterial, type Group, type Mesh } from "three";
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

const GENERATED_MODEL_TARGET_SIZE = 2.2;

/**
 * Rendert ein echtes von Tripo generiertes Modell (glTF/GLB, per
 * modelUrl-Prop von SculptureViewer). Der Task wird bewusst ohne Textur/PBR
 * erzeugt (siehe backend/providers/tripo.rs), deshalb bekommt jedes Mesh
 * hier dasselbe Low-Poly-Flatshading-Material wie die Platzhalter-Formen,
 * eingefärbt nach der gewählten Material-Farbe. Größe/Position schwankt von
 * Modell zu Modell stark, daher Auto-Fit auf eine feste Zielgröße anhand der
 * Bounding Box - sonst wäre der Zoom je nach Upload-Foto unterschiedlich.
 */
function GeneratedModel({ url, color }: { url: string; color: string }) {
  const { scene } = useGLTF(url);

  const { model, autoScale } = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((child) => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).material = new MeshStandardMaterial({
          color,
          flatShading: true,
          roughness: 0.35,
          metalness: 0.7,
        });
      }
    });

    const box = new Box3().setFromObject(cloned);
    const size = new Vector3();
    box.getSize(size);
    const center = new Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    cloned.position.set(-center.x, -center.y, -center.z);
    return { model: cloned, autoScale: GENERATED_MODEL_TARGET_SIZE / maxDim };
  }, [scene, color]);

  return (
    <group scale={autoScale}>
      <primitive object={model} />
    </group>
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
  /** Prozedurale Platzhalter-Form. Wird ignoriert, wenn modelUrl gesetzt ist. */
  parts?: SculpturePart[];
  /** URL eines echten, von Tripo generierten glTF/GLB-Modells. Hat Vorrang vor parts. */
  modelUrl?: string;
  colorHex: string;
  scale?: number;
  interactive?: boolean;
  autoRotateSpeed?: number;
  /** Fester Basis-Drehwinkel in Radiant (z.B. fuer mehrere Blickwinkel-
   * Snapshots aus verschiedenen Perspektiven, siehe StepPlatzierung.tsx).
   * Addiert sich zur laufenden RotatingGroup-Rotation, aendert bei
   * autoRotateSpeed=0 also einfach die statische Ausgangsposition. */
  rotationY?: number;
  className?: string;
  /** Wenn gesetzt, wird einmalig nach dem ersten Render ein transparentes
   * PNG-Snapshot des aktuellen Zustands erzeugt und zurückgegeben. Der
   * Canvas rendert in diesem Fall bewusst mit hoeherem dpr (schaerferes
   * Ergebnis) - kein Performance-Problem, da es sich um einen einmaligen,
   * unsichtbaren Off-Screen-Render handelt, keinen dauerhaften. */
  onSnapshot?: (dataUrl: string) => void;
}

export function SculptureViewer({
  parts,
  modelUrl,
  colorHex,
  scale = 1,
  interactive = false,
  autoRotateSpeed = 0.5,
  rotationY = 0,
  className,
  onSnapshot,
}: SculptureViewerProps) {
  const prefersReducedMotion = useReducedMotion();
  const effectiveSpeed = prefersReducedMotion ? 0 : autoRotateSpeed;

  return (
    <div className={className}>
      <Canvas
        dpr={onSnapshot ? [2, 3] : [1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: true }}
        camera={{ position: [0, 0.5, 4.4], fov: 36 }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 2]} intensity={1.6} />
        <directionalLight position={[-3, -1.5, -2]} intensity={0.6} />
        <directionalLight position={[0, 5, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          <group scale={scale} rotation-y={rotationY}>
            <RotatingGroup speed={effectiveSpeed}>
              {modelUrl ? (
                <GeneratedModel url={modelUrl} color={colorHex} />
              ) : (
                (parts ?? []).map((part, i) => <PartMesh key={i} part={part} color={colorHex} />)
              )}
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
