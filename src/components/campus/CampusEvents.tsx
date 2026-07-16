import Image from "next/image";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import StaggerGrid from "@/components/ui/gsap/StaggerGrid";
import SplitHeading from "@/components/ui/gsap/SplitHeading";
import type { Campus } from "@/lib/campus";

/**
 * This campus's upcoming events, straight from the app.
 *
 * Deliberately NOT inside CampusNights, which renders nothing when a campus has
 * no venues. That coupling was the bug: events keyed off the venues endpoint, so
 * a campus with a real ticketed event but no venue row showed nothing. The White
 * Lies Party tour runs at ~27 campuses with venue_name "VENUE ANNOUNCED SOON"
 * and no venue_id, and every one of those pages was blank. Events stand alone
 * now, and a campus with events but no bars still shows them.
 */
export default function CampusEvents({ campus }: { campus: Campus }) {
  if (campus.events.length === 0) return null;

  const fmt = (raw: string) => {
    // "2026-08-21 21:00:00" is not ISO-8601; Safari returns Invalid Date for it.
    const d = new Date(raw.replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return "";
    // Fixed zone: server and browser must agree or React logs a hydration
    // mismatch, and the venues are US college towns.
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      timeZone: "America/New_York",
    }).format(d);
  };

  return (
    <section className="relative overflow-hidden bg-ink text-white" id="events">
      <div className="absolute -right-40 top-0 w-[32rem] h-[32rem] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <SectionContainer className="relative !py-16 md:!py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
            On Bizzy right now
          </p>
          <SplitHeading className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
            {campus.events.length === 1
              ? `What's next at ${campus.name}.`
              : `${campus.events.length} nights coming up at ${campus.name}.`}
          </SplitHeading>
          <p className="text-white/60 text-lg leading-relaxed">
            Tap any night to grab a ticket before you go.
          </p>
        </div>

        {/* /event/:id: app-claimed in AASA, so an iPhone opens the app and
            everyone else 307s to the checkout. */}
        <StaggerGrid className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {campus.events.map((e) => (
            <Link
              key={e.id}
              href={`/event/${e.id}`}
              className="group rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/[0.04] flex flex-col h-full hover:ring-primary/50 hover:-translate-y-1 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                {e.is21Plus && (
                  <span className="absolute top-2 left-2 bg-black/70 backdrop-blur text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                    21+
                  </span>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <p className="text-white font-bold text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {e.name}
                </p>
                {e.venue && (
                  <p className="text-white/50 text-[11px] mt-1 truncate">{e.venue}</p>
                )}
                {fmt(e.startsAt) && (
                  <p className="text-primary text-[11px] font-semibold mt-auto pt-2">
                    {fmt(e.startsAt)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </StaggerGrid>
      </SectionContainer>
    </section>
  );
}
