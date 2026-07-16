"use client";

import { useReducedMotion } from "framer-motion";
import type { University } from "@/lib/universities";

/**
 * The campuses Bizzy is live on, as a slow typographic drift.
 *
 * Names, not crests. University logos are licensed marks and would imply a
 * sponsorship that does not exist; the names are simply true, and come from
 * the same API the app reads (lib/universities).
 *
 * Under reduced motion the drift is replaced by a static wrapped list rather
 * than a paused one, because a paused marquee is a list with most of itself
 * cropped off the edge.
 */
export default function CampusStrip({ universities }: { universities: University[] }) {
  const reduced = useReducedMotion();

  if (universities.length === 0) return null;

  const Dot = () => (
    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden />
  );

  if (reduced) {
    return (
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 max-w-4xl mx-auto">
        {universities.map((u) => (
          <li key={u.id} className="flex items-center gap-5">
            <span className="text-sm font-semibold text-muted whitespace-nowrap">{u.fullName}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Four copies: .animate-marquee translates -25%, so the seam needs 4x width.
  const lane = [...universities, ...universities, ...universities, ...universities];

  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      {/* The list is decorative repetition; the heading above states the count,
          so screen readers get the fact without four passes of 35 names.

          Duration is set per breakpoint because .animate-marquee moves a
          PERCENTAGE, so a single duration means the wider desktop lane travels
          faster than the mobile one. These land both near ~170px/s.
          Pauses on hover so a name can actually be read. */}
      <div
        className="flex animate-marquee items-center gap-7 [--marquee-duration:16s] md:[--marquee-duration:19s] hover:[animation-play-state:paused]"
        aria-hidden
      >
        {lane.map((u, i) => (
          <div key={`${u.id}-${i}`} className="flex items-center gap-7 flex-shrink-0">
            <span className="text-base md:text-lg font-semibold text-ink/70 whitespace-nowrap">
              {u.fullName}
            </span>
            <Dot />
          </div>
        ))}
      </div>
      <ul className="sr-only">
        {universities.map((u) => (
          <li key={u.id}>{u.fullName}</li>
        ))}
      </ul>
    </div>
  );
}
