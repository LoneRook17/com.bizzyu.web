import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import DealsBrowser from "@/components/deals/DealsBrowser";
import { APP_STORE_URL } from "@/lib/constants";
import { categoriesOf, fetchAllNationalDeals } from "@/lib/brands/nationalDeals";
import { og } from "@/lib/og";

const PAGE_URL = "https://bizzyu.com/deals";

export const metadata: Metadata = {
  title: "Student Discounts from National Brands",
  description:
    "Every student discount, student plan, and free trial Bizzy has verified from national brands: streaming, food delivery, tech, fashion, and more. Free to use.",
  alternates: { canonical: PAGE_URL },
  ...og({
    title: "Student discounts, all in one place",
    description:
      "Verified student offers from Spotify, DoorDash, Amazon, ChatGPT, Nike and more. Browse by category and claim on the brand's own site.",
  }),
};

// The feed is cached 30 minutes inside fetchAllNationalDeals; the page itself
// re-renders on that schedule so a brand added on Monday shows without a deploy.
export const revalidate = 1800;

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ missing?: string }>;
}) {
  const [{ missing }, deals] = await Promise.all([searchParams, fetchAllNationalDeals()]);
  const categories = categoriesOf(deals);

  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Student discounts from national brands on Bizzy",
    numberOfItems: deals.length,
    itemListElement: deals.slice(0, 50).map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${d.brand}: ${d.title}`,
      url: `https://bizzyu.com/go/${d.id}`,
    })),
  };

  return (
    <>
      <JsonLd data={listJsonLd} />

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(80%_70%_at_10%_0%,black,transparent_70%)] [-webkit-mask-image:radial-gradient(80%_70%_at_10%_0%,black,transparent_70%)] pointer-events-none opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_45%_at_100%_0%,rgba(5,235,84,0.12),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-8 md:pt-20 md:pb-10">
          <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-4">National Deals</p>
          <h1 className="text-[2.35rem] sm:text-5xl md:text-6xl font-bold text-ink leading-[1.05] tracking-tight max-w-3xl">
            Student discounts from the brands you{" "}
            <span className="marker-underline marker-draw">already use</span>.
          </h1>
          <p className="mt-5 text-[17px] md:text-xl text-muted max-w-2xl leading-relaxed">
            {deals.length > 0 ? `${deals.length} verified ` : "Verified "}student offers, student plans, and free
            trials. Pick one, claim it on the brand&apos;s own site, keep the savings.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
          {deals.length > 0 ? (
            <DealsBrowser deals={deals} categories={categories} missingId={missing} />
          ) : (
            <div className="rounded-2xl border border-gray-200 p-10 text-center">
              <p className="text-lg font-semibold text-ink">The list is taking a moment.</p>
              <p className="text-muted mt-1">
                Refresh in a minute, or open the National Deals tab in the app.
              </p>
            </div>
          )}

          <div className="mt-14 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-3xl bg-ink text-white p-7 md:p-9">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">Near campus</p>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">
                Local deals, events, and line skips live in the app.
              </h2>
              <p className="mt-3 text-white/60 leading-relaxed">
                The restaurants and bars around your school are student-only and app-only.
              </p>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center px-6 py-3 rounded-full bg-primary text-ink font-semibold hover:brightness-105 transition-all"
              >
                Get Bizzy free
              </a>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-7 md:p-9">
              <p className="text-primary-dark text-xs font-bold uppercase tracking-[0.2em] mb-3">For brands</p>
              <h2 className="text-2xl md:text-3xl font-bold text-ink leading-tight tracking-tight">
                Have a student offer that belongs here?
              </h2>
              <p className="mt-3 text-muted leading-relaxed">
                Listing is free. Every offer is reviewed by hand and has to be student-specific.
              </p>
              <Link
                href="/brands"
                className="mt-6 inline-flex items-center px-6 py-3 rounded-full border-2 border-primary/40 text-primary-dark font-semibold hover:border-primary hover:bg-primary/5 transition-colors"
              >
                Apply to list your offer
              </Link>
            </div>
          </div>

          <p className="mt-10 text-xs text-muted leading-relaxed max-w-2xl">
            Offers are set by each brand and can change without notice. Bizzy may earn a commission
            when you claim some offers. That never changes the price you pay.
          </p>
        </div>
      </section>
    </>
  );
}
