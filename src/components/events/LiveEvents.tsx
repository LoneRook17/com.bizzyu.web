import Image from "next/image";
import Link from "next/link";
import type { CampusEvent } from "@/lib/events";

interface LiveEventsProps {
  events: CampusEvent[];
  /** How many cards to show. Beyond ~12 this stops being proof and starts being a list. */
  limit?: number;
}

/**
 * Real events running on Bizzy right now, with their real flyers.
 *
 * Reads the events list directly rather than pulling them off venues. Via
 * venues this could only ever surface each venue's ONE next event, and only for
 * venues in the "popular" list, so it showed 6 of the 58 that are actually live
 * and hid every venue-less event outright.
 *
 * A venue owner reading this page wants to know other rooms actually use it.
 * A screenshot of the events tab asserts that; these are the actual nights,
 * pulled from the same endpoint the app reads, so the section is right by
 * construction and can never go stale.
 */
export default function LiveEvents({ events, limit = 12 }: LiveEventsProps) {
  const shown = events.slice(0, limit);
  if (shown.length === 0) return null;

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
          {shown.map((e) => (
            <li key={e.id} className="flex">
              {/* /event/:id, NOT the checkout URL directly. That path is
                  app-claimed in the AASA file, so an iPhone with Bizzy opens
                  the event in the app, and everyone else gets 307'd to the
                  Laravel checkout by next.config's redirect. One href, both
                  behaviours, and the checkout host stays configurable per
                  deploy rather than hardcoded here.

                  Whole card is the target: at this size a text-only link would
                  be a ~120px hit area next to a 200px flyer that reads as the
                  button. */}
              <Link
                href={`/event/${e.id}`}
                className="group rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/[0.04] flex flex-col w-full hover:ring-primary/50 hover:-translate-y-1 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="relative aspect-[4/5] bg-white/5">
                  {e.flyer && (
                    <Image
                      src={e.flyer}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 45vw, 200px"
                      className="object-cover"
                    />
                  )}
                  {e.price != null && e.price > 0 && (
                    <span className="absolute top-2 right-2 bg-primary text-ink text-[10px] font-bold rounded-full px-2 py-0.5">
                      ${e.price.toFixed(0)}
                    </span>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <p className="text-white font-bold text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {e.name}
                  </p>
                  {e.venue && <p className="text-white/50 text-[11px] mt-1 truncate">{e.venue}</p>}
                  {fmt(e.startsAt) && (
                    <p className="text-primary text-[11px] font-semibold mt-auto pt-2">
                      {fmt(e.startsAt)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
