"use client";

import { useEffect, useState } from "react";
import { BRANDS_FORM_ID } from "@/lib/brands/copy";

/**
 * Phone-only "Apply" bar. A partnerships manager opens this page from a cold
 * email on their phone, and the form is a long scroll away; this keeps the
 * one action in reach. It shows once the hero CTAs have scrolled off and hides
 * again while the form itself is on screen, so it never covers the Submit
 * button. Mirrors events/StickyDemoCTA, minus the demo link.
 */
export default function StickyApplyCTA() {
  const [pastHero, setPastHero] = useState(false);
  const [formInView, setFormInView] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const form = document.getElementById(BRANDS_FORM_ID);
    let io: IntersectionObserver | null = null;
    if (form && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        ([entry]) => setFormInView(entry.isIntersecting),
        // Fire a little before the section edge, so the bar is gone by the
        // time the first field arrives.
        { rootMargin: "0px 0px -120px 0px", threshold: 0 },
      );
      io.observe(form);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  const visible = pastHero && !formInView;

  return (
    <div
      aria-hidden={!visible}
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white/95 to-transparent transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <a
        href={`#${BRANDS_FORM_ID}`}
        tabIndex={visible ? 0 : -1}
        className="flex items-center justify-between gap-3 w-full bg-ink text-white font-semibold pl-5 pr-2 py-2 rounded-full shadow-xl shadow-black/20"
      >
        <span className="text-[15px]">Apply to list your offer</span>
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-ink flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </span>
      </a>
    </div>
  );
}
