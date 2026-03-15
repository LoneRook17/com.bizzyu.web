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
        <p className="text-muted text-sm mb-2">BizzyU.com &amp; the Bizzy Mobile Application</p>
        <p className="text-muted text-sm mb-10">
          <strong>Effective Date:</strong> March 15, 2026 | <strong>Last Updated:</strong> March 15, 2026
        </p>

        <p className="text-muted leading-relaxed">
          Bizzy Holdings LLC, Bizzy Deals LLC, and Bizzy Ticketing LLC (collectively, &quot;Bizzy,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at <strong>www.bizzyu.com</strong>, use the Bizzy mobile application, or interact with any of our services (collectively, the &quot;Platform&quot;).
        </p>
        <p className="text-muted leading-relaxed">
          This Privacy Policy applies to all users of the Platform, including students, general users, Merchants, and Event Organizers. Please read this policy carefully. By accessing or using the Platform, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree, please discontinue use of the Platform immediately.
        </p>

        {/* ── 1. Information We Collect ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">1. Information We Collect</h2>
        <p className="text-muted leading-relaxed">
          We collect several categories of information depending on how you interact with the Platform. The information we collect falls into the following categories:
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">1.1 Information You Provide Directly</h3>
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse text-sm text-muted">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Category</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Examples</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">When Collected</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Identity Information</strong></td>
                <td className="border border-gray-300 px-4 py-3">Full name, username, date of birth, profile photo</td>
                <td className="border border-gray-300 px-4 py-3">Account registration, profile setup</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Contact Information</strong></td>
                <td className="border border-gray-300 px-4 py-3">Email address, phone number, mailing address</td>
                <td className="border border-gray-300 px-4 py-3">Account registration, communications, ticket purchases</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Educational Information</strong></td>
                <td className="border border-gray-300 px-4 py-3">University or college name, .edu email address, graduation year, student ID verification status</td>
                <td className="border border-gray-300 px-4 py-3">Student verification process</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Account Credentials</strong></td>
                <td className="border border-gray-300 px-4 py-3">Password (stored in hashed form), authentication tokens</td>
                <td className="border border-gray-300 px-4 py-3">Account registration, login</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Transaction Information</strong></td>
                <td className="border border-gray-300 px-4 py-3">Purchase history, deal redemptions, ticket orders, subscription details</td>
                <td className="border border-gray-300 px-4 py-3">Platform usage, purchases</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Communication Data</strong></td>
                <td className="border border-gray-300 px-4 py-3">Messages to customer support, feedback, reviews, survey responses</td>
                <td className="border border-gray-300 px-4 py-3">When you contact us or provide feedback</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>User-Generated Content</strong></td>
                <td className="border border-gray-300 px-4 py-3">Reviews, ratings, photos, comments</td>
                <td className="border border-gray-300 px-4 py-3">When you post content on the Platform</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">1.2 Information Collected Automatically</h3>
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse text-sm text-muted">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Category</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Examples</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Device Information</strong></td>
                <td className="border border-gray-300 px-4 py-3">Device type, model, operating system, OS version, unique device identifiers (IDFA, GAID), screen resolution</td>
                <td className="border border-gray-300 px-4 py-3">App functionality, analytics, troubleshooting</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Usage Data</strong></td>
                <td className="border border-gray-300 px-4 py-3">Pages visited, features used, deals viewed, search queries, time spent on pages, click patterns</td>
                <td className="border border-gray-300 px-4 py-3">Service improvement, personalization</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Location Data</strong></td>
                <td className="border border-gray-300 px-4 py-3">Approximate location (IP-based), precise GPS location (with your permission)</td>
                <td className="border border-gray-300 px-4 py-3">Displaying nearby deals and events, location-based features</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Network Information</strong></td>
                <td className="border border-gray-300 px-4 py-3">IP address, internet service provider, browser type and version, referring URLs</td>
                <td className="border border-gray-300 px-4 py-3">Security, analytics, fraud prevention</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Log Data</strong></td>
                <td className="border border-gray-300 px-4 py-3">Access times, error logs, crash reports, performance data</td>
                <td className="border border-gray-300 px-4 py-3">Troubleshooting, Platform stability</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">1.3 Information from Third Parties</h3>
        <p className="text-muted leading-relaxed">We may receive information about you from third-party sources, including:</p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Social media platforms:</strong> If you register or log in using a social media account (e.g., Google, Apple, Facebook), we may receive your name, email, and profile information from that platform.</li>
          <li><strong>Student verification services:</strong> If we use a third-party service to verify your student status, we receive verification results (confirmed/denied) but generally not the underlying verification documents.</li>
          <li><strong>Payment processors:</strong> Our payment processors may share limited transaction data necessary for order fulfillment and dispute resolution.</li>
          <li><strong>Analytics providers:</strong> We receive aggregated and individual-level analytics data from third-party analytics services.</li>
        </ul>

        {/* ── 2. How We Collect Information ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">2. How We Collect Information</h2>
        <p className="text-muted leading-relaxed">We collect information through the following methods:</p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Direct interactions:</strong> When you create an account, redeem a deal, purchase a ticket, contact support, or otherwise interact with the Platform.</li>
          <li><strong>Automated technologies:</strong> When you browse or use the Platform, we automatically collect technical and usage data through cookies, pixel tags, SDKs, and similar technologies (see Section 5).</li>
          <li><strong>Third-party sources:</strong> As described in Section 1.3 above.</li>
          <li><strong>Device permissions:</strong> With your consent, we may access certain device features such as your camera (for scanning QR codes), location services (for nearby deals), contacts (for referral features), and push notification settings.</li>
        </ul>

        {/* ── 3. How We Use Your Information ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">3. How We Use Your Information</h2>
        <p className="text-muted leading-relaxed">We use the information we collect for the following purposes:</p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.1 Service Delivery &amp; Operations</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Creating and managing your account</li>
          <li>Displaying relevant deals and events based on your location and preferences</li>
          <li>Processing ticket purchases and deal redemptions</li>
          <li>Generating and delivering digital tickets, QR codes, and vouchers</li>
          <li>Verifying your identity and student status</li>
          <li>Facilitating admission to events through QR-code scanning and verification</li>
          <li>Processing payments and managing subscriptions</li>
          <li>Providing customer support and responding to inquiries</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.2 Platform Improvement &amp; Analytics</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Understanding how Users interact with the Platform</li>
          <li>Analyzing trends, usage patterns, and user preferences</li>
          <li>Testing new features, conducting A/B testing, and improving existing functionality</li>
          <li>Monitoring and improving Platform performance, stability, and security</li>
          <li>Developing new products, features, and services</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.3 Communications &amp; Marketing</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Sending transactional messages (order confirmations, ticket delivery, account alerts)</li>
          <li>Sending promotional communications about deals, events, and new features (with your consent or where permitted by law)</li>
          <li>Sending push notifications about nearby deals or upcoming events (with your device permission)</li>
          <li>Personalizing the content and offers you see on the Platform</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.4 Safety, Security &amp; Legal Compliance</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Detecting, investigating, and preventing fraud, unauthorized access, and other illegal activities</li>
          <li>Enforcing our Terms of Service and other policies</li>
          <li>Complying with applicable legal obligations, regulations, and lawful requests from authorities</li>
          <li>Protecting the rights, property, and safety of Bizzy, our Users, Merchants, Event Organizers, and the public</li>
          <li>Resolving disputes and enforcing our agreements</li>
        </ul>

        {/* ── 4. How We Share Your Information ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">4. How We Share Your Information</h2>
        <p className="text-muted leading-relaxed">
          We do not sell your personal information to third parties for their independent marketing purposes. We may share your information in the following circumstances:
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.1 With Merchants &amp; Event Organizers</h3>
        <p className="text-muted leading-relaxed">
          When you redeem a Deal or purchase a Ticket, we may share limited information with the applicable Merchant or Event Organizer necessary to fulfill the transaction — for example, your name and ticket details for admission verification. Merchants and Event Organizers are independent data controllers and their use of your information is governed by their own privacy policies.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.2 With Service Providers</h3>
        <p className="text-muted leading-relaxed">
          We share information with third-party service providers who perform services on our behalf, including:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Payment processors (e.g., Stripe) for transaction processing</li>
          <li>Cloud hosting providers for data storage and infrastructure</li>
          <li>Analytics services for usage analysis</li>
          <li>Email and communication services for sending notifications</li>
          <li>Student verification services for confirming enrollment status</li>
          <li>Customer support platforms for handling inquiries</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          These service providers are contractually obligated to use your information only for the purposes of providing services to Bizzy and are required to maintain appropriate security measures.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.3 Among Bizzy Entities</h3>
        <p className="text-muted leading-relaxed">
          We share information among Bizzy Holdings LLC, Bizzy Deals LLC, and Bizzy Ticketing LLC as necessary for the integrated operation of the Platform. Each entity processes your data in accordance with this Privacy Policy.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.4 For Legal &amp; Safety Reasons</h3>
        <p className="text-muted leading-relaxed">
          We may disclose your information when we believe in good faith that disclosure is necessary to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Comply with applicable law, regulation, legal process, or governmental request</li>
          <li>Enforce our Terms of Service or investigate potential violations</li>
          <li>Detect, prevent, or address fraud, security, or technical issues</li>
          <li>Protect the rights, property, or safety of Bizzy, our Users, or the public</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.5 In Connection with Business Transfers</h3>
        <p className="text-muted leading-relaxed">
          If Bizzy (or any of its affiliated entities) is involved in a merger, acquisition, reorganization, bankruptcy, dissolution, sale of assets, or similar transaction, your information may be transferred as part of that transaction. We will notify you (via the Platform or email) of any change in ownership or use of your personal information.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.6 With Your Consent</h3>
        <p className="text-muted leading-relaxed">
          We may share your information for any other purpose with your explicit consent.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.7 Aggregated or De-Identified Data</h3>
        <p className="text-muted leading-relaxed">
          We may share aggregated or de-identified data that cannot reasonably be used to identify you for any purpose, including industry analysis, demographic profiling, marketing, and research.
        </p>

        {/* ── 5. Cookies & Tracking Technologies ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">5. Cookies &amp; Tracking Technologies</h2>
        <p className="text-muted leading-relaxed">
          We use cookies and similar technologies to collect information, improve the Platform, and personalize your experience. The types of technologies we use include:
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">5.1 Cookies</h3>
        <p className="text-muted leading-relaxed">
          Cookies are small text files placed on your device by a web server. We use the following types of cookies:
        </p>
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse text-sm text-muted">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Type</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Purpose</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Essential Cookies</strong></td>
                <td className="border border-gray-300 px-4 py-3">Required for the Platform to function (authentication, security, session management)</td>
                <td className="border border-gray-300 px-4 py-3">Session or up to 1 year</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Functional Cookies</strong></td>
                <td className="border border-gray-300 px-4 py-3">Remember your preferences (language, region, display settings)</td>
                <td className="border border-gray-300 px-4 py-3">Up to 1 year</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Analytics Cookies</strong></td>
                <td className="border border-gray-300 px-4 py-3">Help us understand how Users interact with the Platform (page views, navigation paths, engagement)</td>
                <td className="border border-gray-300 px-4 py-3">Up to 2 years</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Marketing Cookies</strong></td>
                <td className="border border-gray-300 px-4 py-3">Used to deliver relevant promotions and measure the effectiveness of advertising campaigns</td>
                <td className="border border-gray-300 px-4 py-3">Up to 2 years</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">5.2 Pixel Tags &amp; Web Beacons</h3>
        <p className="text-muted leading-relaxed">
          We may use pixel tags (also known as web beacons or clear GIFs) in emails and on the Platform to track open rates, click-through rates, and user engagement.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">5.3 Mobile SDKs</h3>
        <p className="text-muted leading-relaxed">
          The Bizzy mobile app may include software development kits (SDKs) from third-party analytics and advertising partners that collect device-level data.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">5.4 Managing Cookies</h3>
        <p className="text-muted leading-relaxed">
          Most web browsers allow you to manage cookie preferences through browser settings. You can configure your browser to block or delete cookies. However, disabling cookies may affect the functionality of the Platform. For mobile devices, you can manage tracking permissions through your device settings (e.g., &quot;Limit Ad Tracking&quot; on iOS or &quot;Opt Out of Ads Personalization&quot; on Android).
        </p>

        {/* ── 6. Third-Party Services & Integrations ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">6. Third-Party Services &amp; Integrations</h2>
        <p className="text-muted leading-relaxed">
          The Platform integrates with or links to third-party services that have their own privacy practices. These may include:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Payment processors:</strong> Stripe, Apple Pay, Google Pay</li>
          <li><strong>Map services:</strong> Google Maps, Apple Maps</li>
          <li><strong>Social login providers:</strong> Google, Apple, Facebook</li>
          <li><strong>Analytics platforms:</strong> Google Analytics, Firebase, Mixpanel, or similar services</li>
          <li><strong>Push notification services:</strong> Firebase Cloud Messaging, Apple Push Notification Service</li>
          <li><strong>Advertising networks:</strong> As applicable for promotional features</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          We encourage you to review the privacy policies of any third-party service you interact with through our Platform. Bizzy is not responsible for the privacy practices or data security of third-party services.
        </p>

        {/* ── 7. Data Retention ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">7. Data Retention</h2>
        <p className="text-muted leading-relaxed">
          We retain your personal information for as long as necessary to fulfill the purposes described in this Privacy Policy, unless a longer retention period is required or permitted by law. Specifically:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Active accounts:</strong> We retain your information for the duration of your account&#39;s existence and active use of the Platform.</li>
          <li><strong>Closed accounts:</strong> After account closure, we may retain certain information for up to <strong>three (3) years</strong> to comply with legal obligations, resolve disputes, enforce our agreements, and maintain business records.</li>
          <li><strong>Transaction records:</strong> Purchase history, ticket records, and deal redemption data may be retained for up to <strong>seven (7) years</strong> for tax, accounting, and legal compliance purposes.</li>
          <li><strong>Anonymized data:</strong> Aggregated and de-identified data may be retained indefinitely for analytics and business purposes.</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          When personal information is no longer needed, we will securely delete or anonymize it in accordance with our data retention schedules and applicable law.
        </p>

        {/* ── 8. Data Security ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">8. Data Security</h2>
        <p className="text-muted leading-relaxed">
          We implement commercially reasonable administrative, technical, and physical security measures to protect your personal information from unauthorized access, disclosure, alteration, and destruction. These measures include:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Encryption of data in transit (TLS/SSL) and at rest</li>
          <li>Secure password hashing (bcrypt or equivalent)</li>
          <li>Access controls limiting employee and contractor access to personal information on a need-to-know basis</li>
          <li>Regular security assessments and vulnerability testing</li>
          <li>Incident response procedures for potential data breaches</li>
          <li>Secure cloud infrastructure with reputable hosting providers</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          <strong>Important:</strong> While we strive to protect your personal information, no method of electronic transmission or storage is 100% secure. We cannot guarantee the absolute security of your data. You are responsible for maintaining the confidentiality of your account credentials and for any activity that occurs under your account.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">8.1 Breach Notification</h3>
        <p className="text-muted leading-relaxed">
          In the event of a data breach that affects your personal information, Bizzy will notify you and relevant authorities as required by applicable law. Notification will include the nature of the breach, the categories of data affected, steps we are taking to address the breach, and recommendations for actions you can take to protect yourself.
        </p>

        {/* ── 9. Your Privacy Rights ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">9. Your Privacy Rights</h2>
        <p className="text-muted leading-relaxed">
          Depending on your location and applicable law, you may have the following rights with respect to your personal information:
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Know / Access</h3>
        <p className="text-muted leading-relaxed">
          Request a copy of the personal information we hold about you, including the categories of data collected, the sources, the purposes, and the third parties with whom it has been shared.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Delete</h3>
        <p className="text-muted leading-relaxed">
          Request the deletion of your personal information, subject to certain exceptions (e.g., legal obligations, fraud prevention, completing transactions).
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Correct</h3>
        <p className="text-muted leading-relaxed">
          Request correction of inaccurate personal information that we maintain about you.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Portability</h3>
        <p className="text-muted leading-relaxed">
          Request a portable, machine-readable copy of your personal data to transfer to another service.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Opt Out</h3>
        <p className="text-muted leading-relaxed">
          Opt out of the sale or sharing of your personal information for targeted advertising purposes. (Note: Bizzy does not sell personal information.)
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Non-Discrimination</h3>
        <p className="text-muted leading-relaxed">
          We will not discriminate against you for exercising your privacy rights. You will not receive different pricing, quality of service, or access for making a privacy request.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">How to Exercise Your Rights</h3>
        <p className="text-muted leading-relaxed">To exercise any of your privacy rights, you may:</p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Email us at <strong><a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a></strong> with the subject line &quot;Privacy Rights Request&quot;</li>
          <li>Include your full name, email address associated with your Bizzy account, and a description of the right(s) you wish to exercise</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          We will verify your identity before processing your request, which may require you to confirm information associated with your account. We will respond to verifiable requests within <strong>45 days</strong>, with the possibility of a one-time extension of up to an additional 45 days where reasonably necessary, with notice to you.
        </p>
        <p className="text-muted leading-relaxed">
          You may designate an authorized agent to submit a privacy request on your behalf. The authorized agent must provide proof of authorization and we may still require direct verification of your identity.
        </p>

        {/* ── 10. California Privacy Rights (CCPA/CPRA) ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">10. California Privacy Rights (CCPA/CPRA)</h2>
        <p className="text-muted leading-relaxed">
          If you are a California resident, you have additional rights under the California Consumer Privacy Act, as amended by the California Privacy Rights Act (collectively, &quot;CCPA&quot;). This section supplements the rest of our Privacy Policy with information specific to California residents.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.1 Categories of Personal Information</h3>
        <p className="text-muted leading-relaxed">
          In the preceding twelve (12) months, we have collected the following categories of personal information as defined by the CCPA:
        </p>
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse text-sm text-muted">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">CCPA Category</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Collected</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Sold</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Shared for Cross-Context Behavioral Advertising</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-3">Identifiers (name, email, phone, IP address, device ID)</td>
                <td className="border border-gray-300 px-4 py-3">Yes</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">Personal information under Cal. Civ. Code 1798.80(e) (name, address, phone)</td>
                <td className="border border-gray-300 px-4 py-3">Yes</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3">Characteristics of protected classifications (age, date of birth)</td>
                <td className="border border-gray-300 px-4 py-3">Yes</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">Commercial information (purchase records, deal redemptions)</td>
                <td className="border border-gray-300 px-4 py-3">Yes</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3">Internet or network activity (browsing history, interactions)</td>
                <td className="border border-gray-300 px-4 py-3">Yes</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">Geolocation data (approximate or precise location)</td>
                <td className="border border-gray-300 px-4 py-3">Yes</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3">Education information (university name, .edu email, student status)</td>
                <td className="border border-gray-300 px-4 py-3">Yes</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">Inferences (preferences, characteristics, behavior)</td>
                <td className="border border-gray-300 px-4 py-3">Yes</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.2 We Do Not Sell Personal Information</h3>
        <p className="text-muted leading-relaxed">
          Bizzy does <strong>not sell</strong> your personal information as defined by the CCPA, and has not done so in the preceding twelve (12) months.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.3 Sensitive Personal Information</h3>
        <p className="text-muted leading-relaxed">
          We may collect certain categories of sensitive personal information, including precise geolocation data (with your consent). We use sensitive personal information only for the purposes permitted by the CCPA, including providing the services you request.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.4 Opt-Out Preference Signals</h3>
        <p className="text-muted leading-relaxed">
          We recognize and honor the Global Privacy Control (GPC) signal as a valid opt-out preference signal. If your browser or device sends a GPC signal, we will treat it as a request to opt out of the sale or sharing of personal information associated with that browser or device.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.5 Financial Incentive Programs</h3>
        <p className="text-muted leading-relaxed">
          We may offer loyalty programs, referral bonuses, or promotional offers that involve the collection of personal information. Participation is voluntary, and you may opt out at any time. The value of such programs is reasonably related to the value of the data provided, calculated based on the expense related to offering the program.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.6 Your California Rights</h3>
        <p className="text-muted leading-relaxed">
          In addition to the rights listed in Section 9, California residents may exercise the right to know the specific pieces and categories of personal information collected, the right to delete, the right to correct, and the right to limit the use of sensitive personal information. To exercise any of these rights, please contact us using the methods described in Section 9.
        </p>

        {/* ── 11. Other State Privacy Rights ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">11. Other State Privacy Rights</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">11.1 Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana &amp; Other States</h3>
        <p className="text-muted leading-relaxed">
          Residents of states with comprehensive consumer privacy laws (including but not limited to Virginia&#39;s CDPA, Colorado&#39;s CPA, Connecticut&#39;s CTDPA, Texas&#39;s TDPSA, and Oregon&#39;s OCPA) may have similar rights to those described in Section 9, including the right to access, delete, correct, and opt out of certain data processing activities. We will comply with applicable state privacy laws and honor verifiable consumer requests consistent with those laws.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">11.2 How to Appeal</h3>
        <p className="text-muted leading-relaxed">
          If we decline to take action on your privacy request, you have the right to appeal that decision. To submit an appeal, email us at <strong>{CONTACT_EMAIL}</strong> with the subject line &quot;Privacy Request Appeal.&quot; We will respond to appeals within the time frame required by applicable law (typically 45-60 days).
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">11.3 Florida Privacy</h3>
        <p className="text-muted leading-relaxed">
          As a Florida-based company, we comply with all applicable Florida laws regarding data privacy and security. Florida residents may contact us to exercise any rights afforded under applicable state law.
        </p>

        {/* ── 12. Children's Privacy ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">12. Children&#39;s Privacy</h2>
        <p className="text-muted leading-relaxed">
          The Platform is not intended for children under the age of <strong>13</strong>, and we do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child under 13 has provided personal information to Bizzy, please contact us immediately at {CONTACT_EMAIL} and we will take steps to delete such information.
        </p>
        <p className="text-muted leading-relaxed">
          The Platform is designed for users who are at least <strong>18 years of age</strong>. We do not knowingly collect or solicit personal information from anyone under 18, except in compliance with applicable law. If we learn that we have collected personal information from a person under 18 without appropriate consent, we will delete that information as quickly as possible.
        </p>
        <p className="text-muted leading-relaxed">
          We comply with the Children&#39;s Online Privacy Protection Act (&quot;COPPA&quot;) and will not knowingly collect personal information from children without verifiable parental consent where required.
        </p>

        {/* ── 13. Do Not Track Signals ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">13. Do Not Track Signals</h2>
        <p className="text-muted leading-relaxed">
          Some web browsers transmit &quot;Do Not Track&quot; (DNT) signals. There is currently no uniform standard for how companies should respond to DNT signals. At this time, Bizzy does not respond to DNT signals from web browsers. However, we do honor Global Privacy Control (GPC) signals as described in Section 10.4.
        </p>

        {/* ── 14. Location Data ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">14. Location Data</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.1 Types of Location Data</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Approximate location:</strong> Derived from your IP address and collected automatically when you use the Platform. This helps us display relevant deals and events in your general area.</li>
          <li><strong>Precise location:</strong> Collected through GPS, Wi-Fi, or Bluetooth signals on your mobile device only when you explicitly grant location permission. This enables features like nearby deal discovery and location-based notifications.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.2 Your Control Over Location Data</h3>
        <p className="text-muted leading-relaxed">
          You can control precise location access at any time through your device&#39;s system settings. Denying or revoking location permission may limit certain features of the Platform (e.g., nearby deals may not be displayed accurately). Approximate (IP-based) location is collected as part of standard internet communication and cannot be separately opted out of.
        </p>

        {/* ── 15. Push Notifications & Marketing ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">15. Push Notifications &amp; Marketing</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.1 Push Notifications</h3>
        <p className="text-muted leading-relaxed">
          With your permission, we send push notifications to your mobile device about new deals, upcoming events, and account-related information. You can manage push notification preferences in the app settings or through your device&#39;s notification settings at any time.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.2 Email Marketing</h3>
        <p className="text-muted leading-relaxed">
          We may send promotional emails about deals, events, and Platform updates. Every promotional email includes an &quot;unsubscribe&quot; link at the bottom. You may opt out of marketing emails at any time. Please allow up to <strong>10 business days</strong> for opt-out requests to take effect. Even after opting out of marketing emails, you will continue to receive transactional emails (e.g., purchase confirmations, account security alerts, and important service announcements).
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.3 SMS/Text Messages</h3>
        <p className="text-muted leading-relaxed">
          If you provide your phone number and consent to SMS communications, we may send text messages about deals, event reminders, and account updates. Standard message and data rates may apply. You can opt out at any time by replying &quot;STOP&quot; to any message or adjusting your preferences in the app. Message frequency varies.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.4 CAN-SPAM Compliance</h3>
        <p className="text-muted leading-relaxed">
          We comply with the CAN-SPAM Act. All commercial emails from Bizzy will accurately identify the sender, include a valid physical mailing address or P.O. Box, and provide a clear and conspicuous opt-out mechanism. We will honor opt-out requests promptly and will not share or sell your email address to third parties for their marketing purposes.
        </p>

        {/* ── 16. Data Transfers ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">16. Data Transfers</h2>
        <p className="text-muted leading-relaxed">
          Bizzy is based in the United States. If you access the Platform from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States, where data protection laws may differ from those of your country. By using the Platform, you consent to the transfer of your information to the United States.
        </p>
        <p className="text-muted leading-relaxed">
          We take steps to ensure that your information receives an adequate level of protection in the jurisdictions in which we process it, consistent with applicable law.
        </p>

        {/* ── 17. Merchant & Event Organizer Data ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">17. Merchant &amp; Event Organizer Data</h2>
        <p className="text-muted leading-relaxed">
          If you are a Merchant or Event Organizer using the Platform, we collect additional information necessary to operate your business relationship with Bizzy, including:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Business name, address, and contact information</li>
          <li>Authorized representative name and contact details</li>
          <li>Business type, category, and operating hours</li>
          <li>Deal or event details you create on the Platform</li>
          <li>Aggregated analytics about deal redemptions or ticket sales (no individual User identity is disclosed to Merchants without the User&#39;s involvement in a transaction)</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          We use this information to operate the Platform, facilitate transactions, provide analytics, and communicate with you about your account. Merchant and Event Organizer data is subject to the same security and retention practices described in this Privacy Policy.
        </p>

        {/* ── 18. Ticketing-Specific Data Practices ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">18. Ticketing-Specific Data Practices</h2>
        <p className="text-muted leading-relaxed">
          When you purchase a Ticket through Bizzy Ticketing LLC, additional data practices apply:
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">18.1 Data Collected for Ticketing</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Ticket purchaser identity:</strong> Name, email, and phone number for order confirmation and communication.</li>
          <li><strong>Transaction details:</strong> Event name, ticket type, quantity, price, fees, payment method (last four digits only), and order timestamp.</li>
          <li><strong>Admission data:</strong> QR code scan records, time of entry, and admission status (used for event operations and capacity management).</li>
          <li><strong>Transfer records:</strong> If tickets are transferred to another party (where permitted), we record the transfer for audit and fraud prevention purposes.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">18.2 Sharing with Event Organizers</h3>
        <p className="text-muted leading-relaxed">
          We share ticket purchaser information (name, email, ticket type) with Event Organizers for the purposes of admission management, event communication, and customer service. Event Organizers may use this information in accordance with their own privacy policies. We encourage you to review the privacy policy of each Event Organizer.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">18.3 Fraud Prevention</h3>
        <p className="text-muted leading-relaxed">
          We use ticket transaction data and device information to detect and prevent ticket fraud, including duplicate ticket use, unauthorized transfers, and counterfeit tickets. Suspected fraud may result in ticket cancellation and account suspension.
        </p>

        {/* ── 19. Changes to This Privacy Policy ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">19. Changes to This Privacy Policy</h2>
        <p className="text-muted leading-relaxed">
          We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Update the &quot;Effective Date&quot; and &quot;Last Updated&quot; date at the top of this page</li>
          <li>Provide notice through the Platform (e.g., an in-app banner or pop-up)</li>
          <li>Send an email notification to the address associated with your account (for material changes)</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          Your continued use of the Platform after the effective date of the revised Privacy Policy constitutes your acceptance of the changes. We encourage you to review this Privacy Policy periodically.
        </p>

        {/* ── 20. Contact Information ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">20. Contact Information</h2>
        <p className="text-muted leading-relaxed">
          If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
        </p>
        <p className="text-muted leading-relaxed">
          <strong>Bizzy Holdings LLC</strong><br />
          Email:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a><br />
          Website:{" "}
          <a href="https://www.bizzyu.com" className="text-primary hover:underline">
            www.bizzyu.com
          </a>
        </p>
        <p className="text-muted leading-relaxed">
          For privacy-specific inquiries, please use the subject line <strong>&quot;Privacy Inquiry&quot;</strong> in your email so we can route your request appropriately.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong>Your privacy matters.</strong> We are committed to transparency and to protecting your personal information. If you believe your privacy rights have been violated, you have the right to lodge a complaint with the appropriate regulatory authority in your jurisdiction.
        </p>
      </div>
    </SectionContainer>
  );
}
