import Image from "next/image";
import type { Venue } from "@/lib/venues";

interface VenueCarouselProps {
  venues: Venue[];
}

/** Card + gap, per breakpoint. Must match the classes on the card below. */
const CARD_SM = 210 + 16; // w-[210px] + gap-4
const CARD_MD = 260 + 20; // md:w-[260px] + md:gap-5

/** How fast the strip actually travels. Tune speed here, never duration. */
const SPEED_SM = 300; // px/sec
const SPEED_MD = 330;

/**
 * Every venue Bizzy runs, scrolling past.
 *
 * Photo-led on purpose: most live venues have a room photo and only a third
 * have a business logo, so a logo strip would render two thirds empty. A photo
 * of a packed room is also the better argument on a nightlife page. Where a
 * logo exists it rides on the photo as a badge.
 *
 * The heading names what these rooms are rather than counting them. A count
 * reads as small while the list is short and dates itself the moment a venue is
 * added or drops off; the rooms themselves are the argument.
 *
 * Duration is DERIVED, not chosen. The strip travels exactly one copy of
 * itself, so a hardcoded duration silently re-times the whole thing whenever a
 * venue is added or drops off. Fixing px/sec and solving for duration keeps it
 * moving at the same speed forever. Two breakpoints because the mobile card is
 * smaller, so an equal duration would crawl on a phone.
 *
 * Does NOT pause on hover. It used to, and the strip is full-bleed and ~250px
 * tall, so a cursor resting anywhere near the middle of the screen froze it and
 * the loop read as broken rather than paused.
 */
export default function VenueCarousel({ venues }: VenueCarouselProps) {
  if (venues.length === 0) return null;

  // 4 copies, so there is always a card on screen while the lane travels one
  // copy's width and resets.
  const lane = [...venues, ...venues, ...venues, ...venues];

  // Distance from a card's left edge to its counterpart one copy later: n cards
  // and the n gaps that follow them. Exact, unlike 25% of a lane whose width
  // includes one fewer gap than that.
  const shiftSm = venues.length * CARD_SM;
  const shiftMd = venues.length * CARD_MD;

  const durSm = Math.max(8, Math.round(shiftSm / SPEED_SM));
  const durMd = Math.max(8, Math.round(shiftMd / SPEED_MD));

  return (
    <section className="relative overflow-hidden bg-ink py-14 md:py-20">
      <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
            Already running on Bizzy
          </p>
          <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
            Some of the largest nightlife venues across the U.S.
          </h2>
        </div>

        {/* The lane is aria-hidden because it repeats the list four times to
            hide the marquee seam, and nobody should hear it four times. That
            used to be covered by the heading stating the count; the heading no
            longer does, so the real names go here instead. Better information
            than the count was: a reader gets the venues, not a total. */}
        <ul className="sr-only">
          {venues.map((v) => (
            <li key={v.id}>
              {v.name}, {v.campus}
            </li>
          ))}
        </ul>

        <div className="relative" aria-hidden>
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-ink to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-ink to-transparent z-10 pointer-events-none" />

          {/* Custom properties, NOT animation-duration: .animate-marquee-shift
              sets the animation SHORTHAND, which resets duration and beats a
              utility class. .marquee-responsive picks the sm or md pair. */}
          <div
            className="flex animate-marquee-shift marquee-responsive items-stretch gap-4 md:gap-5"
            style={
              {
                "--marquee-dur-sm": `${durSm}s`,
                "--marquee-dur-md": `${durMd}s`,
                "--marquee-shift-sm": `${shiftSm}px`,
                "--marquee-shift-md": `${shiftMd}px`,
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
