import type { Metadata } from "next";
import SectionContainer from "@/components/ui/SectionContainer";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Bizzy's terms of service. Read the terms and conditions for using the Bizzy app and website.",
  alternates: {
    canonical: "https://bizzyu.com/terms",
  },
};

export default function TermsPage() {
  return (
    <SectionContainer className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1 className="text-4xl font-bold text-ink mb-2">Terms of Service</h1>
        <p className="text-muted text-sm mb-10">Last updated: March 15, 2026</p>

        <p className="text-muted leading-relaxed">
          These Terms of Service (&quot;Terms&quot;) govern your use of the Bizzy mobile
          application and website at bizzyu.com (collectively, the &quot;Service&quot;),
          operated by Bizzy Deals LLC (&quot;Bizzy,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By
          using the Service, you agree to these Terms.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">1. Eligibility</h2>
        <p className="text-muted leading-relaxed">
          You must be at least 18 years old and a current or recent college
          student to use the Bizzy app. By creating an account, you represent
          that you meet these requirements.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">2. Account Registration</h2>
        <p className="text-muted leading-relaxed">
          You are responsible for maintaining the confidentiality of your account
          credentials and for all activity under your account. You agree to
          provide accurate and complete information when creating your account
          and to update it as needed.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">3. Use of the Service</h2>
        <p className="text-muted leading-relaxed">You agree to:</p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Use the Service only for lawful purposes</li>
          <li>Not share, transfer, or sell deals to non-Bizzy users</li>
          <li>Not use bots, scrapers, or automated tools to access the Service</li>
          <li>Not attempt to circumvent deal redemption limits or restrictions</li>
          <li>Not impersonate other users or misrepresent your identity</li>
          <li>Not interfere with or disrupt the Service or its infrastructure</li>
        </ul>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">4. Deals and Offers</h2>
        <p className="text-muted leading-relaxed">
          Deals on Bizzy are provided by partner businesses and are subject to
          their own terms and conditions. Bizzy facilitates the connection
          between students and businesses but is not responsible for:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>The quality of products or services provided by partner businesses</li>
          <li>Changes or cancellations of deals by partner businesses</li>
          <li>Disputes between users and partner businesses</li>
          <li>Deal availability or accuracy of deal descriptions</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          Businesses reserve the right to modify or discontinue deals at any
          time. Redemption frequency limits (daily, weekly, monthly) are enforced
          by the app and must be respected.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">5. Events and Tickets</h2>
        <p className="text-muted leading-relaxed">
          Bizzy may facilitate event listings and ticket purchases. Event tickets
          are subject to the event organizer&apos;s terms. Refund policies for
          tickets are determined by the event organizer unless otherwise stated.
          Bizzy is not responsible for event cancellations or changes.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">6. Intellectual Property</h2>
        <p className="text-muted leading-relaxed">
          The Bizzy name, logo, app design, and all related content are the
          property of Bizzy Deals LLC. You may not use our trademarks, logos, or
          branding without our prior written consent. Content you submit (such as
          profile information) remains yours, but you grant us a license to use
          it in connection with the Service.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">7. Termination</h2>
        <p className="text-muted leading-relaxed">
          We may suspend or terminate your account at any time if you violate
          these Terms or engage in behavior that harms the Service, other users,
          or partner businesses. You may delete your account at any time through
          the app settings.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">8. Disclaimers</h2>
        <p className="text-muted leading-relaxed">
          The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties
          of any kind, either express or implied. We do not guarantee that the
          Service will be uninterrupted, error-free, or secure. We are not liable
          for any indirect, incidental, or consequential damages arising from
          your use of the Service.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">9. Limitation of Liability</h2>
        <p className="text-muted leading-relaxed">
          To the fullest extent permitted by law, Bizzy Deals LLC&apos;s total
          liability to you for any claims arising from or related to the Service
          shall not exceed the amount you paid to Bizzy (if any) in the 12
          months preceding the claim.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">10. Changes to These Terms</h2>
        <p className="text-muted leading-relaxed">
          We may update these Terms from time to time. We will notify you of
          material changes by posting the updated Terms on this page. Your
          continued use of the Service after changes constitutes acceptance of
          the updated Terms.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">11. Governing Law</h2>
        <p className="text-muted leading-relaxed">
          These Terms are governed by the laws of the State of Florida, without
          regard to conflict of law principles. Any disputes arising from these
          Terms shall be resolved in the courts of the State of Florida.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">12. Contact Us</h2>
        <p className="text-muted leading-relaxed">
          If you have questions about these Terms, contact us at:
        </p>
        <p className="text-muted leading-relaxed">
          Bizzy Deals LLC<br />
          Email:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </SectionContainer>
  );
}
