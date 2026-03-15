import type { Metadata } from "next";
import SectionContainer from "@/components/ui/SectionContainer";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Bizzy's privacy policy. Learn how we protect your data and what information we collect.",
  alternates: {
    canonical: "https://bizzyu.com/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <SectionContainer className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1 className="text-4xl font-bold text-ink mb-2">Privacy Policy</h1>
        <p className="text-muted text-sm mb-10">Last updated: March 15, 2026</p>

        <p className="text-muted leading-relaxed">
          Bizzy Deals LLC (&quot;Bizzy,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Bizzy
          mobile application and the website at bizzyu.com. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information
          when you use our services.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">1. Information We Collect</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Personal Information</h3>
        <p className="text-muted leading-relaxed">
          When you create an account or use our services, we may collect:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Name and email address</li>
          <li>School or university affiliation</li>
          <li>Phone number (if provided)</li>
          <li>Profile information you choose to provide</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Usage Information</h3>
        <p className="text-muted leading-relaxed">
          We automatically collect certain information when you use Bizzy, including:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Device type, operating system, and app version</li>
          <li>Deals viewed, claimed, and redeemed</li>
          <li>General location (city/campus area) to show relevant deals</li>
          <li>App usage patterns and interaction data</li>
        </ul>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">2. How We Use Your Information</h2>
        <p className="text-muted leading-relaxed">We use your information to:</p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Provide, maintain, and improve our services</li>
          <li>Show you relevant deals and events near your campus</li>
          <li>Process deal claims and track your savings</li>
          <li>Send you notifications about new deals and events (with your consent)</li>
          <li>Provide customer support</li>
          <li>Analyze usage trends to improve the app experience</li>
          <li>Prevent fraud and ensure security</li>
        </ul>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">3. How We Share Your Information</h2>
        <p className="text-muted leading-relaxed">
          We do not sell your personal information. We may share information with:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>
            <strong>Partner businesses</strong> — only aggregated, anonymized redemption
            data (e.g., &quot;15 students claimed this deal&quot;). We never share your
            personal details with businesses.
          </li>
          <li>
            <strong>Service providers</strong> — third-party services that help us operate
            (e.g., hosting, analytics, email delivery), bound by confidentiality
            agreements.
          </li>
          <li>
            <strong>Legal requirements</strong> — if required by law, regulation, or legal
            process.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">4. Data Security</h2>
        <p className="text-muted leading-relaxed">
          We use industry-standard security measures to protect your information,
          including encryption in transit and at rest. However, no method of
          electronic transmission or storage is 100% secure, and we cannot
          guarantee absolute security.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">5. Your Choices</h2>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>
            <strong>Account information</strong> — you can update or delete your account
            at any time through the app settings.
          </li>
          <li>
            <strong>Notifications</strong> — you can opt out of push notifications
            through your device settings.
          </li>
          <li>
            <strong>Location</strong> — you can disable location access through your
            device settings, though this may limit deal discovery.
          </li>
          <li>
            <strong>Data deletion</strong> — you can request deletion of your data by
            contacting us at {CONTACT_EMAIL}.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">6. Children&apos;s Privacy</h2>
        <p className="text-muted leading-relaxed">
          Bizzy is intended for college students aged 18 and older. We do not
          knowingly collect information from children under 13. If we learn that
          we have collected information from a child under 13, we will delete it
          promptly.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">7. Changes to This Policy</h2>
        <p className="text-muted leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you
          of material changes by posting the updated policy on this page and
          updating the &quot;Last updated&quot; date. Your continued use of Bizzy after
          changes constitutes acceptance of the updated policy.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">8. Contact Us</h2>
        <p className="text-muted leading-relaxed">
          If you have questions about this Privacy Policy or our data practices,
          contact us at:
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
