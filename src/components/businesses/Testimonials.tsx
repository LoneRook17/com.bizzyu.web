import Image from "next/image";
import AnimatedSection from "@/components/ui/AnimatedSection";

const TESTIMONIALS = [
  {
    quote:
      "Since listing on Bizzy, we've seen a steady stream of new student customers walking in every week. It's been a game-changer for our lunch rush.",
    brand: "Jersey Mike's",
    location: "Fort Myers",
    logo: "/images/logos/jersey-mikes.svg",
  },
  {
    quote:
      "Setup was incredibly easy - no tech headaches, no fees. We just submitted our deal and students started showing up. It's that simple.",
    brand: "Chick-fil-A",
    location: "Athens",
    logo: "/images/logos/chick-fil-a.svg",
  },
  {
    quote:
      "Bizzy students don't just come once - they keep coming back. We've turned first-time visitors into regulars without spending a dime on ads.",
    brand: "Tropical Smoothie",
    location: "USF",
    logo: "/images/logos/tropical-smoothie.svg",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl font-bold text-ink text-center mb-4">
            Trusted by large businesses near college towns
          </h2>
          <p className="text-muted text-center mb-14 max-w-md mx-auto">
            Hear from brands already reaching students on Bizzy.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, i) => (
            <AnimatedSection key={t.brand} delay={i * 0.1}>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 h-full flex flex-col">
                {/* Green quote mark */}
                <span className="text-primary text-4xl font-serif leading-none mb-3">
                  &ldquo;
                </span>
                <p className="text-ink text-sm leading-relaxed flex-1">
                  {t.quote}
                </p>
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3">
                  <Image
                    src={t.logo}
                    alt={t.brand}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-contain bg-white border border-gray-100"
                  />
                  <div>
                    <p className="font-bold text-ink text-sm">{t.brand}</p>
                    <p className="text-muted text-xs">{t.location}</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
