import AnimatedSection from "./AnimatedSection";

const POINTS = [
  "100% free - no fees, no commissions, ever",
  "No POS integration or technical setup required",
  "No contracts - cancel anytime",
  "Takes less than 5 minutes to get started",
  "Staff just taps one button to verify deals",
];

export default function ZeroFrictionBanner() {
  return (
    <AnimatedSection>
      <div className="bg-gradient-to-br from-primary to-emerald-500 rounded-3xl p-8 md:p-12 text-white">
        <h3 className="text-2xl md:text-3xl font-bold mb-6">
          Zero friction. Zero cost. Seriously.
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {POINTS.map((point, i) => (
            <div key={i} className="flex items-start gap-3">
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-white/90 text-lg">{point}</span>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
