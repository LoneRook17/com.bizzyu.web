import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import CountUp from "@/components/ui/gsap/CountUp";
import CampusDeals from "@/components/campus/CampusDeals";
import CampusNights from "@/components/campus/CampusNights";
import CampusEvents from "@/components/campus/CampusEvents";
import CampusWeekly from "@/components/campus/CampusWeekly";
import { fetchCampuses, type Campus } from "@/lib/campus";
import { fetchWeeklySummary } from "@/lib/weekly";
import { APP_STORE_URL } from "@/lib/constants";

/**
 * The campus hub page, lifted out of the route file unchanged.
 *
 * It moved because the single top-level dynamic segment now serves two kinds of
 * page (a campus and a venue), and a route file that dispatches between them
 * should not also be 200 lines of one of them. Nothing about what this renders
 * changed in the move.
 */
export default async function CampusPageView({ campus }: { campus: Campus }) {
  // Written weekly by Claude from this campus's real rows; null when it fails or
  // no key is set, and the section then renders nothing.
  const weekly = await fetchWeeklySummary(campus);

  const siblings = (await fetchCampuses()).filter((c) => c.slug !== campus.slug);
  const businesses = new Set(campus.deals.map((d) => d.business)).size;
  const totalSavings = campus.deals.reduce((sum, d) => sum + (Number(d.savings) || 0), 0);

  return (
    <>
      {/* ─── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(5,235,84,0.18),transparent_55%)] pointer-events-none" />
        <SectionContainer className="relative !py-16 md:!py-24">
          <AnimatedSection>
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">
              Bizzy at
            </p>
            {/* Deliberately NOT a SplitHeading. This is the LCP element on a
                page whose whole job is ranking, and SplitText starts its words
                at opacity 0, so animating it would hold first paint back by
                roughly the length of the stagger. Split headings live below the
                fold, where the cost is a scroll the reader already made. */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight mb-6 max-w-4xl text-white">
              {campus.fullName}
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed mb-8">
              Every deal below is live right now at {campus.name}. Claim one in the app,
              show your phone, and that is the whole thing. No coupon to print, no card to
              buy, no fee.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Button href={APP_STORE_URL} external size="lg">
                Get Bizzy Free
              </Button>
            </div>

            {/* Counts are computed from the rows rendered below, never typed in. */}
            <div className="flex flex-wrap gap-x-10 gap-y-5">
              {campus.deals.length > 0 && (
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-primary leading-none">
                    <CountUp to={campus.deals.length} />
                  </p>
                  <p className="text-xs text-white/60 mt-1.5">
                    Live {campus.deals.length === 1 ? "deal" : "deals"}
                  </p>
                </div>
              )}
              {businesses > 0 && (
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-white leading-none">
                    <CountUp to={businesses} />
                  </p>
                  <p className="text-xs text-white/60 mt-1.5">
                    Local {businesses === 1 ? "spot" : "spots"}
                  </p>
                </div>
              )}
              {campus.venues.length > 0 && (
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-white leading-none">
                    <CountUp to={campus.venues.length} />
                  </p>
                  <p className="text-xs text-white/60 mt-1.5">
                    {campus.venues.length === 1 ? "Bar" : "Bars"}
                  </p>
                </div>
              )}
              {totalSavings > 0 && (
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-white leading-none">
                    <CountUp to={Math.round(totalSavings)} prefix="$" />
                  </p>
                  <p className="text-xs text-white/60 mt-1.5">On the table today</p>
                </div>
              )}
            </div>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* ─── This week, in prose ───────────────────────────
          Sits above the cards: it is the only part of the page that reads as
          "right now" rather than "a catalog", and it is what a reader landing
          from a "what's happening at X this week" search came for. */}
      <CampusWeekly summary={weekly} campusName={campus.name} />

      {/* ─── The deals ─────────────────────────────────────── */}
      <CampusDeals campus={campus} />

      {/* ─── Upcoming events ──────────────────────────────
          Separate from CampusNights on purpose: events key off university_id,
          venues do not, and a campus can have one without the other. */}
      <CampusEvents campus={campus} />

      {/* ─── Bars (only where they exist) ─────────────────── */}
      <CampusNights campus={campus} />

      {/* ─── Other campuses ────────────────────────────────
          Real internal links between real pages. Only campuses that passed the
          same content bar appear, so this can never point at an empty page. */}
      {siblings.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-100">
          <SectionContainer className="!py-14 md:!py-16">
            <AnimatedSection>
              <h2 className="text-xl md:text-2xl font-bold text-ink tracking-tight mb-6">
                Bizzy is also live at
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {siblings.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/${s.slug}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-ink hover:border-primary/50 hover:text-primary-dark transition-colors"
                  >
                    {s.fullName}
                    <span className="text-muted text-xs">
                      {s.deals.length + s.venues.length}
                    </span>
                  </Link>
                ))}
              </div>
            </AnimatedSection>
          </SectionContainer>
        </section>
      )}

      {/* ─── CTA ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(5,235,84,0.28),transparent_60%)] pointer-events-none" />
        <SectionContainer className="relative text-center !py-16 md:!py-24">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-bold leading-[1.05] tracking-tight mb-5 text-white">
              Free at {campus.name}. Free everywhere.
            </h2>
            <p className="text-white/70 text-lg mb-9 max-w-xl mx-auto leading-relaxed">
              Bizzy costs nothing, takes no cut, and does not sell you a membership.
              Download it, pick {campus.name}, start claiming.
            </p>
            <Button href={APP_STORE_URL} external size="lg">
              Get Bizzy Free
            </Button>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}
