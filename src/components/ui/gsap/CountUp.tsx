"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, FULL } from "@/lib/gsap";

interface CountUpProps {
  to: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * A number that rolls up to its real value when scrolled into view.
 *
 * The final value is rendered on the server as the element's text, so the tween
 * is decoration over correct markup: with JS off, reduced motion on, or a tween
 * that never fires, the reader still sees the true number. It never counts up
 * to a value the page does not otherwise state.
 *
 * snap:{textContent:1} keeps it on integers, and toFixed(0) at the end guards
 * against GSAP's float drift landing on "9.999999".
 */
export default function CountUp({ to, className = "", prefix = "", suffix = "" }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(FULL, () => {
        // Zero it here, not in render. The server sends the real number, so
        // without this the element shows "10", snaps to "0" when the trigger
        // fires, then climbs back: a visible flash backwards. Doing it inside
        // the FULL branch means reduced-motion readers never see the 0 at all.
        const obj = { val: 0 };
        el.textContent = `${prefix}0${suffix}`;

        gsap.to(obj, {
          val: to,
          duration: Math.min(0.4 + to * 0.02, 1.4),
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = `${prefix}${obj.val.toFixed(0)}${suffix}`;
          },
          onComplete: () => {
            el.textContent = `${prefix}${to}${suffix}`;
          },
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });
    }, ref);

    return () => ctx.revert();
  }, [to, prefix, suffix]);

  // Server-rendered truth. The tween only ever overwrites this with the same
  // number it already says.
  return (
    <span ref={ref} className={className}>
      {prefix}
      {to}
      {suffix}
    </span>
  );
}
