import AnimatedSection from "@/components/ui/AnimatedSection";

const STEPS = [
  {
    num: "1",
    title: "Create your event",
    desc: "Add your event, upload a flyer, set ticket tiers and prices. Everything from your dashboard in under 2 minutes.",
  },
  {
    num: "2",
    title: "We promote it",
    desc: "Your event appears in the Bizzy app for students at your campus. We handle the discovery — you fill the room.",
  },
  {
    num: "3",
    title: "Scan and get paid",
    desc: "Check students in with the Bizzy scanner or tap-to-pay at the door. Ticket revenue hits your Stripe account the next day.",
  },
];

export default function EventsHowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-8 md:pb-10">
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl font-bold text-ink text-center mb-4">
            How events work on Bizzy
          </h2>
          <p className="text-muted text-center mb-14 max-w-md mx-auto">
            Three steps. No contracts. You keep every dollar.
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
