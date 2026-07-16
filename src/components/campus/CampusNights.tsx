import Image from "next/image";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import StaggerGrid from "@/components/ui/gsap/StaggerGrid";
import SplitHeading from "@/components/ui/gsap/SplitHeading";
import type { Campus } from "@/lib/campus";

/**
 * The bars Bizzy runs at this campus, and any nights already on the books.
 *
 * Renders nothing when a campus has no venues, which is most of them: UF has 10
 * and FGCU has 4, while the rest of the published campuses are deals-only. A
 * "Nightlife" heading over an empty grid is worse than no heading.
 */
export default function CampusNights({ campus }: { campus: Campus }) {
  if (campus.venues.length === 0) return null;

  const fmt = (iso: string) => {
    // "2026-07-15 21:00:00" is not ISO-8601; Safari returns Invalid Date for it.
    const d = new Date(iso.replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return "";
    // Fixed zone: server and browser must agree or React logs a hydration
    // mismatch, and "tonight" means nothing to a server in UTC.
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      timeZone: "America/New_York",
    }).format(d);
  };

  return (
    <section className="relative overflow-hidden bg-ink text-white" id="nights">
      <div className="absolute -left-40 top-1/3 w-[32rem] h-[32rem] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <SectionContainer className="relative !py-16 md:!py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
            Nights out
          </p>
          <SplitHeading className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
            {campus.venues.length === 1
              ? "The bar on Bizzy."
              : `${campus.venues.length} bars on Bizzy.`}
          </SplitHeading>
          <p className="text-white/60 text-lg leading-relaxed">
            Tickets, cover, and line skips, bought before you get there.
          </p>
        </div>

        <StaggerGrid className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-14">
          {campus.venues.map((v) => (
            <div key={v.id} className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5 aspect-[4/5]">
                {v.photo && (
                  <Image
                    src={v.photo}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 45vw, 220px"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                {v.upcomingEvents > 0 && (
                  <span className="absolute top-2.5 right-2.5 bg-primary text-ink text-[10px] font-bold rounded-full px-2 py-0.5">
                    {v.upcomingEvents} upcoming
                  </span>
                )}
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="text-white font-bold text-sm leading-tight truncate">{v.name}</p>
              </div>
            </div>
          ))}
        </StaggerGrid>

        {campus.events.length > 0 && (
          <>
            <AnimatedSection>
              <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-6">
                Already on the books
              </h3>
            </AnimatedSection>
            {/* Same /event/:id link as the /events page: app-claimed in AASA so
                an iPhone opens the app, everyone else 307s to the checkout. */}
            <StaggerGrid className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {campus.events.map((e) => (
                <Link
                  key={e.id}
                  href={`/event/${e.id}`}
                  className="group rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/[0.04] flex flex-col h-full hover:ring-primary/50 hover:-translate-y-1 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                    <p className="text-white font-bold text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {e.name}
                    </p>
                    <p className="text-white/50 text-[11px] mt-1 truncate">{e.venue}</p>
                    {fmt(e.startsAt) && (
                      <p className="text-primary text-[11px] font-semibold mt-auto pt-2">
                        {fmt(e.startsAt)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </StaggerGrid>
          </>
        )}
      </SectionContainer>
    </section>
  );
}
