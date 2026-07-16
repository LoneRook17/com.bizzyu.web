import Image from "next/image";
import type { Venue } from "@/lib/venues";
import { upcomingEvents } from "@/lib/venues";

interface LiveEventsProps {
  venues: Venue[];
  /** How many cards to show. Beyond ~6 this stops being proof and starts being a list. */
  limit?: number;
}

/**
 * Real events running on Bizzy right now, with their real flyers.
 *
 * A venue owner reading this page wants to know other rooms actually use it.
 * A screenshot of the events tab asserts that; these are the actual nights,
 * pulled from the same endpoint the app reads, so the section is right by
 * construction and can never go stale.
 *
 * Dates are formatted in a fixed timezone: the server and the browser must
 * agree or React logs a hydration mismatch, and "tonight" is meaningless to a
 * server in UTC anyway. Venues are US college towns.
 */
export default function LiveEvents({ venues, limit = 6 }: LiveEventsProps) {
  const events = upcomingEvents(venues).slice(0, limit);
  if (events.length === 0) return null;

  const fmt = (iso: string) => {
    // "2026-07-15 21:00:00" is not ISO-8601; Safari returns Invalid Date for it.
    const d = new Date(iso.replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      timeZone: "America/New_York",
    }).format(d);
  };

  return (
    <section className="relative overflow-hidden bg-ink border-t border-white/10">
      <div className="absolute -right-40 top-0 w-[32rem] h-[32rem] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 py-14 md:py-20">
        <div className="mb-8 md:mb-10">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
            On Bizzy right now
          </p>
          <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
            Tonight, and the rest of the week.
          </h2>
          <p className="text-white/60 mt-3 max-w-lg leading-relaxed">
            Real nights, running at real venues, pulled live from the app.
          </p>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/[0.04] flex flex-col"
            >
              <div className="relative aspect-[4/5] bg-white/5">
                {(e.flyer || e.venuePhoto) && (
                  <Image
                    src={(e.flyer || e.venuePhoto) as string}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 45vw, 200px"
                    className="object-cover"
                  />
                )}
                {e.coverPrice != null && e.coverPrice > 0 && (
                  <span className="absolute top-2 right-2 bg-primary text-ink text-[10px] font-bold rounded-full px-2 py-0.5">
                    ${e.coverPrice.toFixed(0)}
                  </span>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <p className="text-white font-bold text-xs leading-snug line-clamp-2">{e.name}</p>
                <p className="text-white/50 text-[11px] mt-1 truncate">{e.venue}</p>
                {fmt(e.startsAt) && (
                  <p className="text-primary text-[11px] font-semibold mt-auto pt-2">
                    {fmt(e.startsAt)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
