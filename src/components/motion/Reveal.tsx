"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Verzögerung in Sekunden, z.B. für gestaffelte Listen. */
  delay?: number;
  /** Richtung, aus der eingeblendet wird. */
  direction?: "up" | "left" | "right" | "none";
}

const OFFSETS: Record<NonNullable<RevealProps["direction"]>, { x?: number; y?: number }> = {
  up: { y: 24 },
  left: { x: -24 },
  right: { x: 24 },
  none: {},
};

/**
 * Scroll-getriggerte Einblend-Animation. Respektiert `prefers-reduced-motion`
 * über Framer Motions `useReducedMotion()` - bei aktivierter Einstellung wird
 * der Inhalt direkt sichtbar gerendert, ohne Bewegung/Verzögerung
 * (Barrierefreiheit, siehe Konzept Abschnitt 6).
 */
export function Reveal({ children, className, delay = 0, direction = "up" }: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const offset = OFFSETS[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
