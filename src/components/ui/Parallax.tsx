"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ReactNode, useRef } from "react";

interface ParallaxProps {
  children: ReactNode;
  /** Pixels of drift across the full pass through the viewport. Keep it small:
      past ~60px it stops reading as depth and starts reading as a glitch. */
  distance?: number;
  className?: string;
}

/**
 * Scroll-linked vertical drift. The element floats slightly against the page
 * as it passes through the viewport, which gives the layout depth without any
 * of it being load-bearing: the content is identical whether this runs or not.
 *
 * Spring-smoothed so it eases rather than tracking the scroll wheel 1:1, and
 * disabled outright under prefers-reduced-motion.
 */
export default function Parallax({ children, distance = 40, className = "" }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Hooks must run unconditionally, so compute the transform either way and
  // only decide what to render afterwards.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const y = useSpring(raw, { stiffness: 70, damping: 22, mass: 0.4 });

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
