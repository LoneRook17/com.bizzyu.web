import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import RequestSchoolForm from "@/components/request-school/RequestSchoolForm";
import type { University } from "@/lib/universities";
import { COMING_SOON_BLURB, comingSoonTitle } from "@/lib/request-school";

export default function ComingSoonCampus({ university }: { university: University }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(5,235,84,0.18),transparent_55%)] pointer-events-none" />
      <SectionContainer className="relative !py-16 md:!py-24">
        <AnimatedSection>
          <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">
            Coming soon
          </p>
          <h1 className="text-4xl md:text-6xl font-bold leading-[1.02] tracking-tight mb-6 max-w-4xl text-white">
            {comingSoonTitle(university.fullName)}
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed mb-10">
            {COMING_SOON_BLURB}
          </p>
        </AnimatedSection>
        <div className="max-w-lg">
          <RequestSchoolForm initialSchool={university.fullName} compact />
        </div>
      </SectionContainer>
    </section>
  );
}
