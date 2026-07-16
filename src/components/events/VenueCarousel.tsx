import Image from "next/image";
import type { Venue } from "@/lib/venues";

interface VenueCarouselProps {
  venues: Venue[];
}

/** Card + gap, per breakpoint. Must match the classes on the card below. */
const CARD_SM = 210 + 16; // w-[210px] + gap-4
const CARD_MD = 260 + 20; // md:w-[260px] + md:gap-5

/** How fast the strip actually travels. Tune speed here, never duration. */
const SPEED_SM = 210; // px/sec
const SPEED_MD = 230;

/**
 * Every venue Bizzy runs, scrolling past.
 *
 * Photo-led on purpose: most live venues have a room photo and only a third
 * have a business logo, so a logo strip would render two thirds empty. A photo
 * of a packed room is also the better argument on a nightlife page. Where a
 * logo exists it rides on the photo as a badge.
 *
 * Duration is DERIVED, not chosen. The strip travels exactly one copy of
 * itself, so a hardcoded duration silently re-times the whole thing whenever a
 * venue is added or drops off. Fixing px/sec and solving for duration keeps it
 * moving at the same speed forever. Two breakpoints because the mobile card is
 * smaller, so an equal duration would crawl on a phone.
 *
 * Pauses on hover so a name can be read.
 */
export default function VenueCarousel({ venues }: VenueCarouselProps) {
  if (venues.length === 0) return null;

  // 4 copies: .animate-marquee translates -25%, so it needs 4x the width to
  // hide the seam. One "copy" is therefore exactly the travel distance.
  const lane = [...venues, ...venues, ...venues, ...venues];

  const durSm = Math.max(8, Math.round((venues.length * CARD_SM) / SPEED_SM));
  const durMd = Math.max(8, Math.round((venues.length * CARD_MD) / SPEED_MD));

  return (
    <section className="relative overflow-hidden bg-ink py-14 md:py-20">
      <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
            Already running on Bizzy
          </p>
          <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
            {venues.length} college {venues.length === 1 ? "bar" : "bars"} and counting.
          </h2>
        </div>

        {/* Decorative repetition; the heading above states the count, so screen
            readers get the fact without four passes of the list. */}
        <div className="relative" aria-hidden>
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-ink to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-ink to-transparent z-10 pointer-events-none" />

          {/* Custom properties, NOT animation-duration: .animate-marquee sets
              the animation SHORTHAND, which resets duration and beats a
              utility class. .marquee-responsive picks sm or md from these. */}
          <div
            className="flex animate-marquee marquee-responsive items-stretch gap-4 md:gap-5 hover:[animation-play-state:paused]"
            style={
              {
                "--marquee-dur-sm": `${durSm}s`,
                "--marquee-dur-md": `${durMd}s`,
              } as React.CSSProperties
            }
          >
            {lane.map((v, i) => (
              <div
                key={`${v.id}-${i}`}
                className="relative flex-shrink-0 w-[210px] md:w-[260px] rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5"
              >
                <div className="relative aspect-[4/3]">
                  {v.photo && (
                    <Image
                      src={v.photo}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 210px, 260px"
                      className="object-cover"
                    />
                  )}
                  {/* Scrim so the name stays legible over any photo. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                  {v.logo && (
                    <div className="absolute top-2.5 left-2.5 w-9 h-9 rounded-lg bg-white/95 p-1 shadow-lg">
                      <div className="relative w-full h-full">
                        <Image src={v.logo} alt="" fill sizes="36px" className="object-contain" />
                      </div>
                    </div>
                  )}

                  {v.upcomingEvents > 0 && (
                    <span className="absolute top-2.5 right-2.5 bg-primary text-ink text-[10px] font-bold rounded-full px-2 py-0.5">
                      {v.upcomingEvents} upcoming
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight truncate">{v.name}</p>
                    <p className="text-white/60 text-[11px] mt-0.5">{v.campus}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
