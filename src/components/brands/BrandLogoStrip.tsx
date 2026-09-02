import Image from "next/image";
import type { NationalDeal } from "@/lib/brands/nationalDeals";

/**
 * Real brands already listed in National Deals, as a quiet logo marquee under
 * the hero. Same mechanics as BizzyVenuesMarquee (four copies, translateX
 * -25%); reduced motion stops it in place via globals.css.
 */
export default function BrandLogoStrip({ deals, limit = 24 }: { deals: NationalDeal[]; limit?: number }) {
  const logos = deals.slice(0, limit);
  if (logos.length < 6) return null;
  const repeated = [...logos, ...logos, ...logos, ...logos];

  return (
    <section className="bg-white border-y border-gray-100 overflow-hidden py-8 md:py-10" aria-label="Brands already on Bizzy">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-primary-dark mb-6 px-6">
        {logos.length}+ brands students already claim on Bizzy
      </p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="flex animate-marquee items-center" style={{ animationDuration: `${Math.max(30, logos.length * 2.2)}s` }}>
          {repeated.map((d, i) => (
            <div
              key={`${d.id}-${i}`}
              className="flex-shrink-0 mx-3 md:mx-4 flex items-center gap-2.5 rounded-full border border-gray-200 bg-white pl-1.5 pr-4 py-1.5"
              title={d.brand}
              aria-hidden={i >= logos.length}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-200 flex-shrink-0 bg-white">
                <Image src={d.imageUrl} alt={i < logos.length ? d.brand : ""} width={32} height={32} className="w-full h-full object-cover" unoptimized />
              </div>
              <span className="text-sm font-semibold text-ink whitespace-nowrap">{d.brand}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
