import Image from "next/image";
import AnimatedSection from "@/components/ui/AnimatedSection";

interface Testimonial {
  quote: string;
  /** Who said it, as it will appear publicly. */
  name: string;
  /** e.g. "Backroads Brewhouse · Fort Myers, FL" */
  business: string;
  /** Headshot or venue photo in /public/images/testimonials/. */
  photo: string;
}

/**
 * Empty until each business has APPROVED its quote in writing.
 *
 * Publishing a testimonial the named business never agreed to is a fabricated
 * endorsement, barred by the FTC's Rule on Consumer Reviews and Testimonials
 * (16 CFR Part 465), which carries per-violation civil penalties, and it
 * borrows the reputation of a real business that could object. Drafting the
 * wording for them is fine and normal; publishing before they sign off is not.
 *
 * Drafted wording awaiting approval lives in TESTIMONIAL_DRAFTS.md, along with
 * the email to send. Once a business replies "approved", move its entry here
 * and drop the photo in, and the section renders itself.
 */
const TESTIMONIALS: Testimonial[] = [];

export default function DiscountTestimonials() {
  // No approved quotes yet, so render nothing rather than filler.
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <AnimatedSection>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-3">
              From the businesses
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-ink leading-tight tracking-tight">
              What owners near campus say.
            </h2>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {TESTIMONIALS.map((t, i) => (
            <AnimatedSection key={t.name} delay={i * 0.1}>
              <div className="bg-white rounded-3xl p-7 border border-gray-100 h-full flex flex-col shadow-sm">
                <div className="flex gap-0.5 mb-4" role="img" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <svg key={s} className="w-4 h-4 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
                    </svg>
                  ))}
                </div>
                <p className="text-ink leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center gap-3">
                  <Image
                    src={t.photo}
                    alt=""
                    width={96}
                    height={96}
                    className="w-11 h-11 rounded-full object-cover bg-gray-100"
                  />
                  <div>
                    <p className="font-bold text-ink text-sm">{t.name}</p>
                    <p className="text-muted text-xs">{t.business}</p>
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
