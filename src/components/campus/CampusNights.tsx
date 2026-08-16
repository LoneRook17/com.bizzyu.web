import Image from "next/image";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import StaggerGrid from "@/components/ui/gsap/StaggerGrid";
import SplitHeading from "@/components/ui/gsap/SplitHeading";
import type { Campus } from "@/lib/campus";
import { fetchVenueDirectory } from "@/lib/venuePages";

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
export default async function CampusNights({ campus }: { campus: Campus }) {
  if (campus.venues.length === 0) return null;

  // Each bar's own page, where it has one. This is the link DOWN: a brand new
  // venue page is otherwise an orphan with nothing pointing at it, and an
  // orphan is a page Google crawls late and ranks badly.
  //
  // A venue missing from the directory renders exactly as it did before, as an
  // unlinked card. Never a link into a 404.
  let venuePaths = new Map<number, string>();
  try {
    venuePaths = new Map((await fetchVenueDirectory()).map((v) => [v.id, v.slug]));
  } catch {
    // Decorative. A dead directory costs the links, not the section.
  }

  // A date formatter used to live here, left behind when events moved out to
  // CampusEvents. Removed rather than kept: eslint had been flagging it as
  // unused since that move, and these cards render no dates.

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
          {campus.venues.map((v) => {
            const path = venuePaths.get(v.id);
            const card = (
              <>
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
              </>
            );
            const shell =
              "relative block rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5 aspect-[4/5]";

            return path ? (
              <Link
                key={v.id}
                href={`/${path}`}
                className={`${shell} hover:ring-primary/50 transition-colors`}
              >
                {card}
              </Link>
            ) : (
              <div key={v.id} className={shell}>
                {card}
              </div>
            );
          })}
        </StaggerGrid>

      </SectionContainer>
    </section>
  );
}
