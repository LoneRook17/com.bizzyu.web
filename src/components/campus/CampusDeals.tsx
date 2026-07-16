import Image from "next/image";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import StaggerGrid from "@/components/ui/gsap/StaggerGrid";
import SplitHeading from "@/components/ui/gsap/SplitHeading";
import type { Campus } from "@/lib/campus";

/**
 * This campus's live deals, exactly as the app serves them.
 *
 * No prose is generated about them: the deal rows change on their own, which is
 * what makes the page fresh week to week. Writing copy around them would add a
 * claim about a real business that nobody at that business approved.
 */
export default function CampusDeals({ campus }: { campus: Campus }) {
  if (campus.deals.length === 0) return null;

  return (
    <section className="bg-white" id="deals">
      <SectionContainer className="!py-16 md:!py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.18em] mb-3">
            Live right now
          </p>
          <SplitHeading className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight mb-4">
            This week around {campus.name}.
          </SplitHeading>
          <p className="text-muted text-lg leading-relaxed">
            Straight from the app. When a spot swaps its deal, this page swaps with it.
          </p>
        </div>

        {/* StaggerGrid replaces the per-card AnimatedSection rather than
            wrapping it: two libraries animating one card's opacity race, and
            the card loses. */}
        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {campus.deals.map((deal) => (
            <article
              key={deal.id}
              className="group h-full flex flex-col rounded-2xl overflow-hidden border border-gray-200 bg-white hover:border-primary/40 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative aspect-[16/10] bg-gray-100">
                {deal.image && (
                  <Image
                    src={deal.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                    className="object-cover"
                  />
                )}
                {deal.savings > 0 && (
                  <span className="absolute top-3 right-3 bg-primary text-ink text-xs font-bold rounded-full px-2.5 py-1 shadow-lg">
                    ${Number(deal.savings).toFixed(0)} off
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <p className="text-ink font-bold leading-snug mb-1.5">{deal.business}</p>
                <p className="text-muted text-sm leading-relaxed line-clamp-3 flex-1">
                  {deal.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  {deal.type && (
                    <span className="text-[11px] font-semibold text-primary-dark bg-primary-light rounded-full px-2.5 py-1">
                      {deal.type}
                    </span>
                  )}
                  {deal.category && (
                    <span className="text-[11px] font-medium text-muted">{deal.category}</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </StaggerGrid>

        {/* The endpoint caps at 10 per school, so say so rather than implying
            this is the whole list. */}
        {campus.deals.length >= 10 && (
          <AnimatedSection delay={0.2}>
            <p className="text-muted text-sm mt-8">
              Showing the top {campus.deals.length}. There are more in the app.
            </p>
          </AnimatedSection>
        )}
      </SectionContainer>
    </section>
  );
}
