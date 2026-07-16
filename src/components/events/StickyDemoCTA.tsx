"use client";

import { useEffect, useState } from "react";
import { CALENDLY_DEMO_URL } from "@/lib/constants";

export default function StickyDemoCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pt-3 bg-gradient-to-t from-ink via-ink to-transparent transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* text-ink, not white: this hand-rolls Button's primary gradient, and
          white on that green is 1.61:1. Button itself uses ink (12.78:1),
          which is what every other CTA on the page already looks like. */}
      <a
        href={CALENDLY_DEMO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] text-ink font-semibold py-4 rounded-full shadow-lg shadow-primary/30"
      >
        Book a 15-Min Demo
      </a>
    </div>
  );
}
