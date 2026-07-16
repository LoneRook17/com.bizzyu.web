import Image from "next/image";
import SectionContainer from "@/components/ui/SectionContainer";
import StaggerGrid from "@/components/ui/gsap/StaggerGrid";
import SplitHeading from "@/components/ui/gsap/SplitHeading";
import type { Campus } from "@/lib/campus";

/**
 * The bars Bizzy runs at this campus.
 *
 * Venues ONLY. Events used to live here too, gated behind this component's
 * "no venues, render nothing" rule, which meant a campus with a real ticketed
 * event but no venue row showed neither. They are CampusEvents' job now.
 *
 * Still returns null with no venues, which is most campuses: UF has 10 and FGCU
 * has 4, the rest are deals-only. A "Nights out" heading over an empty grid is
 * worse than no heading.
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

      </SectionContainer>
    </section>
  );
}
