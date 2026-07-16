import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import type { WeeklySummary } from "@/lib/weekly";

interface CampusWeeklyProps {
  summary: WeeklySummary | null;
  campusName: string;
}

/**
 * This week, in a sentence or three.
 *
 * Deliberately a section on the campus page rather than a /blog/ post per school
 * per week. Two reasons. A separate URL would compete with this page for the
 * same "<school> student deals" query, so we would be splitting our own ranking
 * rather than adding to it. And a weekly "what's on" post is worthless the week
 * after: at 9 schools that accumulates ~470 dated pages a year that are all
 * stale within 7 days, which is the shape Google's scaled-content policy exists
 * to catch, and the penalty there is site-wide.
 *
 * Here it does the two things prose actually adds (a freshness signal, and
 * natural phrasing that catches queries the cards' business names do not) on the
 * page that is already ranking.
 *
 * Renders nothing when generation fails or no key is configured, which is the
 * local-dev case.
 */
export default function CampusWeekly({ summary, campusName }: CampusWeeklyProps) {
  if (!summary) return null;

  const dateline = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(summary.generatedAt));

  return (
    <section className="bg-gray-50 border-b border-gray-100">
      <SectionContainer className="!py-12 md:!py-16">
        <AnimatedSection>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.18em]">
                This week at {campusName}
              </p>
              {/* A real dateline, not decoration: it is the one honest signal
                  that the paragraph below is current, and it is the thing a
                  reader checks before trusting a "this week" claim. */}
              <span className="text-muted text-xs" aria-hidden>
                •
              </span>
              <time
                dateTime={summary.generatedAt.slice(0, 10)}
                className="text-muted text-xs font-medium"
              >
                Updated {dateline}
              </time>
            </div>

            <p className="text-ink text-lg md:text-xl leading-relaxed">{summary.paragraph}</p>
          </div>
        </AnimatedSection>
      </SectionContainer>
    </section>
  );
}
