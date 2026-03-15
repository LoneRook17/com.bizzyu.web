import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";

const STEPS = [
  {
    num: "1",
    title: "Fill Out Your Deal",
    desc: "Submit your exclusive deal through our quick form. Takes less than 5 minutes.",
  },
  {
    num: "2",
    title: "We Review & Publish",
    desc: "We review your deal and get it live on Bizzy for students to discover.",
  },
  {
    num: "3",
    title: "Students Walk In",
    desc: "Students see your deal, come to your business, and spend money.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-8 md:pb-10">
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl font-bold text-ink text-center mb-4">
            Getting started takes 5 minutes
          </h2>
          <p className="text-muted text-center mb-14 max-w-md mx-auto">
            Three steps. No tech setup. No contracts.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {STEPS.map((step, i) => (
            <AnimatedSection key={step.num} delay={i * 0.1}>
              <div className="text-center">
                <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-5">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-ink mb-2">
                  {step.title}
                </h3>
                <p className="text-muted text-sm max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
