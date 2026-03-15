import AnimatedSection from "./AnimatedSection";

const DEAL_TYPES = [
  {
    icon: "🎁",
    title: "BOGO Deals",
    desc: "Buy one, get one free on meals, drinks, and more.",
  },
  {
    icon: "🎉",
    title: "Free Items",
    desc: "Free appetizers, desserts, or drinks with purchase.",
  },
  {
    icon: "🍔",
    title: "Meal Deals",
    desc: "Complete meals at unbeatable student prices.",
  },
  {
    icon: "💰",
    title: "Flat $ Off",
    desc: "$5, $10, $15 off your favorite local spots.",
  },
];

export default function DealTypeGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {DEAL_TYPES.map((deal, i) => (
        <AnimatedSection key={deal.title} delay={i * 0.08}>
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
              {deal.icon}
            </div>
            <h3 className="font-bold text-ink mb-2">{deal.title}</h3>
            <p className="text-muted text-sm leading-relaxed">{deal.desc}</p>
          </div>
        </AnimatedSection>
      ))}
    </div>
  );
}
