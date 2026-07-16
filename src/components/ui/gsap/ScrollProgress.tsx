"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, FULL } from "@/lib/gsap";

/**
 * A hairline of brand green across the top, tracking how far down the page you are.
 *
 * These pages run long (the events page is ~11,000px), so this earns its keep
 * as orientation rather than decoration. It is the textbook ScrollTrigger
 * scrub: framer-motion's useScroll can do it too, but this is already the
 * library doing the page's other scroll work, and one scroll system beats two.
 *
 * aria-hidden and pointer-events-none: it is a picture of the scrollbar, and
 * the scrollbar is the accessible control.
 */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Reduced motion still gets the bar. A scrub is a direct readout of
      // scroll position, not motion the user did not ask for: it only moves
      // because they are already moving the page.
      mm.add("all", () => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            transformOrigin: "left center",
            scrollTrigger: {
              trigger: document.documentElement,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.25,
            },
          },
        );
      });
    }, ref);

    // Images and fonts land after mount and change page height, which leaves
    // the bar full at 70% down the page until something else recalculates.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[3px] bg-primary z-[100] origin-left scale-x-0 pointer-events-none"
    />
  );
}
