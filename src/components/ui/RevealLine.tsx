"use client";

import { motion, useReducedMotion } from "framer-motion";

interface RevealLineProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
  delay?: number;
}

/**
 * A rule that strokes itself in when scrolled to, like the .marker-draw
 * highlighter in globals.css. Purely decorative (aria-hidden): it connects
 * steps that are already numbered in the markup.
 *
 * Under reduced motion it renders fully drawn, so the connection still reads.
 */
export default function RevealLine({
  className = "",
  orientation = "horizontal",
  delay = 0,
}: RevealLineProps) {
  const reduced = useReducedMotion();
  const axis = orientation === "horizontal" ? "scaleX" : "scaleY";

  if (reduced) return <div className={className} aria-hidden />;

  return (
    <motion.div
      aria-hidden
      className={className}
      initial={{ [axis]: 0 }}
      whileInView={{ [axis]: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
      style={{ originX: 0, originY: 0 }}
    />
  );
}
