import { Suspense } from "react";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import RequestSchoolForm from "@/components/request-school/RequestSchoolForm";
import { COMING_SOON_HEADING, REQUEST_SCHOOL_BLURB, REQUEST_SCHOOL_HEADING } from "@/lib/request-school";

function FormFromQuery({ school }: { school: string }) {
  return <RequestSchoolForm initialSchool={school} />;
}

export default async function RequestSchoolPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const { school = "" } = await searchParams;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-primary-light">
      <SectionContainer className="py-20 md:py-28">
        <AnimatedSection>
          <div className="max-w-2xl mx-auto text-center mb-10">
            <p className="inline-flex items-center px-4 py-1.5 bg-primary-light rounded-full text-primary-dark text-sm font-semibold mb-6">
              {COMING_SOON_HEADING}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-ink leading-tight mb-4">
              {REQUEST_SCHOOL_HEADING}
            </h1>
            <p className="text-lg text-muted">{REQUEST_SCHOOL_BLURB}</p>
          </div>
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <div className="max-w-lg mx-auto">
            <Suspense fallback={<div className="max-w-lg mx-auto h-96" />}>
              <FormFromQuery school={school} />
            </Suspense>
          </div>
        </AnimatedSection>
      </SectionContainer>
    </section>
  );
}
