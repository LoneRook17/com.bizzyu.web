"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap, FULL } from "@/lib/gsap";

interface StaggerGridProps {
  children: ReactNode;
  className?: string;
  /** Cards per row, so the stagger sweeps diagonally rather than in a line. */
  from?: "start" | "center" | "edges";
}

/**
 * A grid whose cards deal in as it enters the viewport.
 *
 * Worth GSAP rather than wrapping each card in AnimatedSection: that puts one
 * IntersectionObserver and one motion component on every card, so a 10-deal
 * grid mounts 10 of each. This is a single ScrollTrigger and a single tween,
 * and it staggers by real DOM order instead of a hand-tuned delay prop per
 * index.
 *
 * Only ever used on markup that is NOT already inside an AnimatedSection. Two
 * libraries writing opacity on one element is a race, and the loser is usually
 * a card stuck at opacity 0.
 */
export default function StaggerGrid({
  children,
  className = "",
  from = "start",
}: StaggerGridProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(FULL, () => {
        const cards = gsap.utils.toArray<HTMLElement>(el.children);
        if (!cards.length) return;

        gsap.from(cards, {
          y: 28,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: { each: 0.06, from, grid: "auto" },
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      // Reduced motion: cards render where they belong, no tween, no trigger.
    }, ref);

    return () => ctx.revert();
  }, [from]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
