import type { Metadata } from "next";
import SectionContainer from "@/components/ui/SectionContainer";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "Bizzy's affiliate disclosure. Some offers on Bizzy are affiliate links, and Bizzy may earn a commission on qualifying sign-ups or purchases.",
  alternates: {
    canonical: "https://bizzyu.com/affiliate-disclosure",
  },
};

export default function AffiliateDisclosurePage() {
  return (
    <SectionContainer className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1 className="text-4xl font-bold text-ink mb-2">Affiliate Disclosure</h1>
        <p className="text-muted text-sm mb-10">
          <strong>Last Updated:</strong> October 19, 2026
        </p>

        <p className="text-muted leading-relaxed">
          Bizzy is a student-focused platform that connects college students with exclusive discounts, promotional offers, events, and services.
        </p>
        <p className="text-muted leading-relaxed">
          Some offers and links displayed on Bizzy&apos;s website or mobile application may be affiliate links. This means Bizzy may receive compensation when users click certain links, register for services, or complete qualifying purchases.
        </p>
        <p className="text-muted leading-relaxed">
          These partnerships help support Bizzy&apos;s operations and allow us to continue providing students with access to valuable deals and offers.
        </p>
        <p className="text-muted leading-relaxed">
          Bizzy may participate in affiliate marketing programs with third-party companies, including transportation, food delivery, retail, and subscription service providers.
        </p>
        <p className="text-muted leading-relaxed">
          When Bizzy recommends an affiliate partner, we may earn a commission from qualifying transactions.
        </p>
        <p className="text-muted leading-relaxed">
          We aim to provide accurate information about available promotions. All offers are subject to the respective partner&apos;s terms and conditions.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">Contact</h2>
        <p className="text-muted leading-relaxed">
          For questions regarding our affiliate relationships, please contact us:
        </p>
        <p className="text-muted leading-relaxed">
          <strong>Bizzy</strong><br />
          Email:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a><br />
          Website:{" "}
          <a href="https://www.bizzyu.com" className="text-primary hover:underline">
            www.bizzyu.com
          </a>
        </p>
      </div>
    </SectionContainer>
  );
}
