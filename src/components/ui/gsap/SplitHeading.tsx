"use client";

import { useLayoutEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap, SplitText, FULL } from "@/lib/gsap";

interface SplitHeadingProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Delay before the words start rising, in seconds. */
  delay?: number;
}

/**
 * A headline whose words rise out from behind their own line.
 *
 * This is the one thing GSAP does here that framer-motion cannot: SplitText
 * rewrites the text into per-word and per-line elements and, with mask:"lines",
 * wraps each line in its own overflow-hidden clip. That clip is what makes the
 * words look like they are rising from behind an edge rather than just fading
 * up. Doing it by hand means shipping a splitter and re-splitting on resize.
 *
 * Three things this has to get right or it does more harm than good:
 *
 * 1. Fonts. Splitting before the webfont swaps measures the fallback, so the
 *    lines break in the wrong places and never re-break. Hence document.fonts.
 * 2. Screen readers and SEO. Split text becomes a pile of <div>s, so a reader
 *    can announce it letter-salad and a crawler sees fragments. SplitText's
 *    aria:"auto" restores the original string on the parent and hides the
 *    fragments, so the accessible name stays the real headline.
 * 3. Reduced motion. The reduced branch does nothing at all, which leaves the
 *    unsplit text sitting there at full opacity. It never animates "quickly".
 */
export default function SplitHeading({
  children,
  className = "",
  as: Tag = "h2",
  delay = 0,
}: SplitHeadingProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(FULL, () => {
        let split: SplitText | null = null;

        // Wait for the webfont: splitting against the fallback bakes in the
        // wrong line breaks. .ready resolves immediately if fonts are done.
        const run = () => {
          split = SplitText.create(el, {
            type: "lines,words",
            mask: "lines",
            aria: "auto",
            linesClass: "overflow-hidden",
          });

          gsap.from(split.words, {
            yPercent: 115,
            opacity: 0,
            duration: 0.85,
            ease: "power3.out",
            stagger: 0.035,
            delay,
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        };

        let cancelled = false;
        document.fonts.ready.then(() => { if (!cancelled) run(); });

        return () => {
          cancelled = true;
          // revert() puts the original text node back. Without it, a
          // re-render or a reduced-motion flip leaves the DOM full of
          // orphaned line wrappers.
          split?.revert();
        };
      });

      // No reduced-motion branch on purpose: unsplit text, already visible.
    }, ref);

    return () => ctx.revert();
  }, [delay]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
