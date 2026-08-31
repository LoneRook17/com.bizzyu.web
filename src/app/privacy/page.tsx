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
          <strong>Effective Date:</strong> August 24, 2026 | <strong>Last Updated:</strong> August 24, 2026 | <strong>Version:</strong> 1.3
        </p>

        <p className="text-muted leading-relaxed">
          Bizzy Holdings LLC, Bizzy Deals LLC, and Bizzy Ticketing LLC (collectively, &quot;Bizzy,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at <strong>www.bizzyu.com</strong>, use the Bizzy mobile application, or interact with any of our services (collectively, the &quot;Platform&quot;).
        </p>
        <p className="text-muted leading-relaxed">
          This Privacy Policy applies to all users of the Platform, including students, general users, Merchants, Event Organizers, and Promoters. Please read this policy carefully. By accessing or using the Platform, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree, please discontinue use of the Platform immediately.
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
                <td className="border border-gray-300 px-4 py-3"><strong>Promoter Tax &amp; Payout Information</strong></td>
                <td className="border border-gray-300 px-4 py-3">Legal name, taxpayer identification number (e.g., SSN or EIN on IRS Form W-9), payout destination (bank account through Stripe Connect)</td>
                <td className="border border-gray-300 px-4 py-3">Only when you enroll in the Bizzy Promoter Program (see Section 18)</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Communication Data</strong></td>
                <td className="border border-gray-300 px-4 py-3">Messages to customer support, feedback, reviews, survey responses</td>
                <td className="border border-gray-300 px-4 py-3">When you contact us or provide feedback</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Marketing Consent Records</strong></td>
                <td className="border border-gray-300 px-4 py-3">Opt-in and opt-out timestamps, source of consent, channel (SMS, email, push), and which businesses you have agreed to receive communications from</td>
                <td className="border border-gray-300 px-4 py-3">When you opt in to marketing or opt out at any time</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>User-Generated Content</strong></td>
                <td className="border border-gray-300 px-4 py-3">Reviews, ratings, photos, comments</td>
                <td className="border border-gray-300 px-4 py-3">When you post content on the Platform</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Door Code Operator Information</strong></td>
                <td className="border border-gray-300 px-4 py-3">First name or name entered, and an event-scoped operator session</td>
                <td className="border border-gray-300 px-4 py-3">When a person operates an event&apos;s door using a door code (no account required)</td>
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
                <td className="border border-gray-300 px-4 py-3">Device type, model, operating system, OS version, unique device identifiers (IDFA, GAID, where Apple ATT permits), screen resolution</td>
                <td className="border border-gray-300 px-4 py-3">App functionality, analytics, troubleshooting</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Usage Data</strong></td>
                <td className="border border-gray-300 px-4 py-3">Pages visited, features used, deals viewed, search queries, time spent on pages, click patterns, leaderboard ranking activity</td>
                <td className="border border-gray-300 px-4 py-3">Service improvement, personalization</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Location Data</strong></td>
                <td className="border border-gray-300 px-4 py-3">Approximate location (IP-based), precise GPS location (with your permission)</td>
                <td className="border border-gray-300 px-4 py-3">Displaying nearby deals and events, location-based features</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Tracking-Link / Attribution Data</strong></td>
                <td className="border border-gray-300 px-4 py-3">Click events on Bizzy promoter links, a short-lived attribution identifier stored in browser storage or in the app, source/medium parameters</td>
                <td className="border border-gray-300 px-4 py-3">Promoter Program commission attribution (24-hour window) and analytics</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Communications Engagement</strong></td>
                <td className="border border-gray-300 px-4 py-3">Email opens and clicks, SMS delivery and reply events (e.g., STOP), push notification delivery status</td>
                <td className="border border-gray-300 px-4 py-3">Measuring delivery, honoring opt-outs, complying with carrier and regulatory requirements</td>
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
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Scan &amp; Admission Logs</strong></td>
                <td className="border border-gray-300 px-4 py-3">Each Ticket or pass scan: who scanned it (authorized staff or a Door Code Operator), timestamp, and outcome (valid, duplicate, invalid)</td>
                <td className="border border-gray-300 px-4 py-3">Admission, capacity management, fraud prevention, event analytics</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Door Counter Data</strong></td>
                <td className="border border-gray-300 px-4 py-3">Per-tap door-counter records, including the count action and the operator attributed to it</td>
                <td className="border border-gray-300 px-4 py-3">Headcount and occupancy tallies and event analytics for the business</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Marketing Send Log</strong></td>
                <td className="border border-gray-300 px-4 py-3">An audit record of marketing messages sent through the Platform, including channel, timing, and recipient counts</td>
                <td className="border border-gray-300 px-4 py-3">Compliance recordkeeping, delivery measurement, abuse prevention</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Wallet Pass Device Registrations</strong></td>
                <td className="border border-gray-300 px-4 py-3">Device registration tokens for Apple Wallet or Google Wallet passes</td>
                <td className="border border-gray-300 px-4 py-3">Delivering pass updates to your wallet by push</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">1.3 Information from Third Parties</h3>
        <p className="text-muted leading-relaxed">We may receive information about you from third-party sources, including:</p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Social media platforms:</strong> If you register or log in using a social media account (e.g., Google, Apple), we may receive your name, email, and profile information from that platform.</li>
          <li><strong>Student verification services:</strong> If we use a third-party service to verify your student status, we receive verification results (confirmed/denied) but generally not the underlying verification documents.</li>
          <li><strong>Payment processors:</strong> Our payment processors may share limited transaction data necessary for order fulfillment, payouts, and dispute resolution.</li>
          <li><strong>Subscription management providers:</strong> If you subscribe to Bizzy Premium through the Apple App Store or Google Play, we receive subscription status and entitlement information from those stores and our subscription management provider (e.g., RevenueCat).</li>
          <li><strong>SMS aggregators and carrier registries:</strong> We receive delivery-status information and opt-out (STOP) signals from SMS aggregators and U.S. carrier campaign registries (10DLC).</li>
          <li><strong>Analytics providers:</strong> We receive aggregated and individual-level analytics data from third-party analytics services.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">1.4 What We Do Not Collect</h3>
        <p className="text-muted leading-relaxed">
          The Platform does <strong>not</strong> use session-replay or screen-recording technologies, does <strong>not</strong> collect biometric identifiers (such as fingerprints, facial geometry, or voiceprints), and does <strong>not</strong> handle protected health information (PHI) subject to the U.S. Health Insurance Portability and Accountability Act (HIPAA). Bizzy is not a consumer reporting agency under the Fair Credit Reporting Act (FCRA) and does not collect or sell consumer credit information.
        </p>

        {/* ── 2. How We Collect Information ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">2. How We Collect Information</h2>
        <p className="text-muted leading-relaxed">We collect information through the following methods:</p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Direct interactions:</strong> When you create an account, redeem a deal, purchase a ticket, enroll in the Promoter Program, contact support, or otherwise interact with the Platform.</li>
          <li><strong>Automated technologies:</strong> When you browse or use the Platform, we automatically collect technical and usage data through cookies, pixel tags, SDKs, and similar technologies (see Section 5).</li>
          <li><strong>Third-party sources:</strong> As described in Section 1.3 above.</li>
          <li><strong>Device permissions:</strong> With your consent, we may access certain device features such as your camera (for scanning QR codes), location services (for nearby deals), and push notification settings.</li>
          <li><strong>Apple App Tracking Transparency (ATT):</strong> On iOS, the Platform requests permission via Apple&apos;s App Tracking Transparency framework before using your IDFA for cross-application tracking. If you decline, we do not access your IDFA for tracking, and certain personalization or attribution features may be limited.</li>
        </ul>

        {/* ── 3. How We Use Your Information ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">3. How We Use Your Information</h2>
        <p className="text-muted leading-relaxed">We use the information we collect for the following purposes:</p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.1 Service Delivery &amp; Operations</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Creating and managing your account</li>
          <li>Displaying relevant deals and events based on your location and preferences</li>
          <li>Processing ticket purchases and deal redemptions</li>
          <li>Generating and delivering digital tickets, QR codes, and vouchers (including Apple/Google Wallet passes if you elect)</li>
          <li>Verifying your identity and student status</li>
          <li>Facilitating admission to events through QR-code scanning, door counters, and verification</li>
          <li>Processing payments, managing subscriptions, and disbursing Promoter payouts</li>
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
          <li>Sending transactional messages (order confirmations, ticket delivery, OTP codes, account security alerts, event reminders for Tickets you hold)</li>
          <li>Sending Bizzy marketing communications (with your opt-in consent and where permitted by law)</li>
          <li>Facilitating marketing communications sent by Merchants, Event Organizers, and venues you have opted in to receive messages from (see Section 17)</li>
          <li>Sending push notifications about deals or events (with your device permission)</li>
          <li>Personalizing the content and offers you see on the Platform</li>
          <li>Maintaining records of your consent and opt-out actions for compliance with TCPA, CAN-SPAM, and other applicable laws</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.4 Promoter Program Operations</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Verifying eligibility, identity, and tax-reporting information for enrolled Promoters</li>
          <li>Attributing Ticket purchases to Promoter tracking links and calculating commissions</li>
          <li>Disbursing payouts through Stripe Connect</li>
          <li>Generating tax forms (e.g., IRS Form 1099-NEC) for U.S. Promoters who meet the reporting threshold</li>
          <li>Detecting and preventing self-purchase, click fraud, and other prohibited Promoter conduct</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.5 Safety, Security &amp; Legal Compliance</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Detecting, investigating, and preventing fraud, unauthorized access, and other illegal activities</li>
          <li>Enforcing our Terms of Service and other policies</li>
          <li>Complying with applicable legal obligations, regulations, and lawful requests from authorities (including subpoenas, court orders, and tax-reporting obligations)</li>
          <li>Protecting the rights, property, and safety of Bizzy, our Users, Merchants, Event Organizers, Promoters, and the public</li>
          <li>Resolving disputes and enforcing our agreements</li>
        </ul>

        {/* ── 4. How We Share Your Information ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">4. How We Share Your Information</h2>
        <p className="text-muted leading-relaxed">
          We do not sell your personal information to third parties for their independent marketing purposes. We may share your information in the following circumstances:
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.1 With Merchants &amp; Event Organizers</h3>
        <p className="text-muted leading-relaxed">
          When you redeem a Deal or purchase a Ticket, we share limited information with the applicable Merchant or Event Organizer necessary to fulfill the transaction. For Ticket purchases, this includes your name, email address, phone number (if collected), Ticket purchase details, redemption status, scan history, any tags or notes the Event Organizer has applied to your profile within the Bizzy business dashboard, and any communication preferences you have provided to that business. Merchants and Event Organizers are independent data controllers and their use of your information is governed by their own privacy policies and our separate agreements with them. See Section 19 for more detail on ticketing-specific data flows.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.2 With Service Providers (Sub-processors)</h3>
        <p className="text-muted leading-relaxed">
          We share information with third-party service providers who perform services on our behalf. These providers (often called &quot;sub-processors&quot;) are contractually obligated to use your information only for the purposes of providing services to Bizzy and are required to maintain appropriate security measures. The categories below are illustrative; specific providers may change from time to time as we refine our infrastructure.
        </p>
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse text-sm text-muted">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Category</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Examples of Providers</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Data Categories Shared</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-3">Payment processing &amp; Connect payouts</td>
                <td className="border border-gray-300 px-4 py-3">Stripe, Apple Pay, Google Pay, Apple In-App Purchase, Google Play Billing</td>
                <td className="border border-gray-300 px-4 py-3">Name, billing details, transaction info, taxpayer ID for Promoter payouts</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">Subscription management</td>
                <td className="border border-gray-300 px-4 py-3">RevenueCat</td>
                <td className="border border-gray-300 px-4 py-3">Subscription entitlement state, purchase events, app/device identifier</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3">Cloud hosting &amp; storage</td>
                <td className="border border-gray-300 px-4 py-3">Amazon Web Services (AWS) and similar</td>
                <td className="border border-gray-300 px-4 py-3">All categories of data processed by the Platform</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">Email delivery</td>
                <td className="border border-gray-300 px-4 py-3">Resend, SendGrid, or similar</td>
                <td className="border border-gray-300 px-4 py-3">Email address, message content, engagement events (opens, clicks, bounces, unsubscribes)</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3">SMS delivery (10DLC A2P)</td>
                <td className="border border-gray-300 px-4 py-3">Twilio or similar SMS aggregator</td>
                <td className="border border-gray-300 px-4 py-3">Phone number, message content, delivery status, opt-out (STOP) signals</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">Push notifications</td>
                <td className="border border-gray-300 px-4 py-3">Apple Push Notification Service, Firebase Cloud Messaging</td>
                <td className="border border-gray-300 px-4 py-3">Device push token, notification content, delivery status</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3">Analytics &amp; crash reporting</td>
                <td className="border border-gray-300 px-4 py-3">Firebase, Google Analytics, or similar</td>
                <td className="border border-gray-300 px-4 py-3">Pseudonymous device identifiers, event logs, crash data</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">Maps &amp; location lookup</td>
                <td className="border border-gray-300 px-4 py-3">Google Maps Platform, Apple Maps</td>
                <td className="border border-gray-300 px-4 py-3">Approximate or precise location for distance/route calculations</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3">Apple/Google Wallet passes</td>
                <td className="border border-gray-300 px-4 py-3">Apple Wallet, Google Wallet</td>
                <td className="border border-gray-300 px-4 py-3">Ticket metadata required to render the pass (event, holder name, QR/barcode)</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">Customer support</td>
                <td className="border border-gray-300 px-4 py-3">Tawk.to or similar</td>
                <td className="border border-gray-300 px-4 py-3">Name, email, support correspondence</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3">Student verification</td>
                <td className="border border-gray-300 px-4 py-3">.edu validation services</td>
                <td className="border border-gray-300 px-4 py-3">Email or student-status data minimally necessary to verify enrollment</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">AI support assistant</td>
                <td className="border border-gray-300 px-4 py-3">Anthropic (Claude)</td>
                <td className="border border-gray-300 px-4 py-3">The text of questions you type into the business dashboard assistant and related account context (e.g., your name and business name)</td>
              </tr>
            </tbody>
          </table>
        </div>

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
          We may share aggregated or de-identified data that cannot reasonably be used to identify you for any purpose, including industry analysis, demographic profiling, marketing, and research. De-identified data is processed in a manner that prevents re-identification, and we contractually require recipients not to attempt re-identification.
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
                <td className="border border-gray-300 px-4 py-3"><strong>Attribution Cookies</strong></td>
                <td className="border border-gray-300 px-4 py-3">Capture and short-term cache the Promoter tracking-link identifier (&quot;bz_ref&quot;) so a subsequent purchase can be attributed to the Promoter who shared the link</td>
                <td className="border border-gray-300 px-4 py-3">24 hours from the click, or until cleared by a successful purchase, a different tracking-link click, or device storage being cleared</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Analytics Cookies</strong></td>
                <td className="border border-gray-300 px-4 py-3">Help us understand how Users interact with the Platform (page views, navigation paths, engagement)</td>
                <td className="border border-gray-300 px-4 py-3">Up to 2 years</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Marketing Cookies</strong></td>
                <td className="border border-gray-300 px-4 py-3">Used to deliver relevant promotions and measure the effectiveness of campaigns (only set with your consent where required by law)</td>
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
          The Bizzy mobile app may include software development kits (SDKs) from third-party analytics, subscription management, push-notification, and advertising-attribution partners that collect device-level data. We disclose our principal sub-processors in Section 4.2.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">5.4 No Session Replay or Wiretapping</h3>
        <p className="text-muted leading-relaxed">
          The Platform does not use session-replay, screen-recording, keystroke-logging, or similar technologies that would record your interactions with the Platform in a form replayable by a third party. We do not employ &quot;chat-wiretapping&quot; vendors or technologies that intercept the contents of your communications in a manner prohibited by the California Invasion of Privacy Act (CIPA) or analogous state laws.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">5.5 Managing Cookies &amp; Mobile Tracking</h3>
        <p className="text-muted leading-relaxed">
          Most web browsers allow you to manage cookie preferences through browser settings. You can configure your browser to block or delete cookies; however, disabling cookies may affect the functionality of the Platform. For mobile devices, you can manage tracking permissions through your device settings (e.g., Apple App Tracking Transparency on iOS, or &quot;Opt Out of Ads Personalization&quot; on Android). On iOS, the Platform requests ATT permission before accessing your IDFA for tracking; if you decline, certain attribution and personalization features may be limited.
        </p>

        {/* ── 6. Third-Party Services & Integrations ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">6. Third-Party Services &amp; Integrations</h2>
        <p className="text-muted leading-relaxed">
          The Platform integrates with or links to third-party services that have their own privacy practices. Refer to Section 4.2 for a list of sub-processors. In addition, we may link to or integrate with:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Social login providers:</strong> Google, Apple</li>
          <li><strong>Map services:</strong> Google Maps, Apple Maps</li>
          <li><strong>Advertising networks:</strong> As applicable for promotional features (subject to your consent where required)</li>
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
          <li><strong>Transaction records:</strong> Purchase history, ticket records, deal redemption data, and Promoter payout records may be retained for up to <strong>seven (7) years</strong> for tax, accounting, and legal compliance purposes (including IRS 1099 reporting).</li>
          <li><strong>Marketing consent records:</strong> Opt-in and opt-out records for SMS, email, and push communications are retained for at least <strong>four (4) years</strong> after the most recent opt-out, consistent with TCPA recordkeeping guidance.</li>
          <li><strong>Operational and audit logs:</strong> Scan and admission logs, door-counter taps, Door Code Operator session records, and marketing send logs are retained for the event and a limited period afterward for audit, dispute-resolution, and fraud-prevention purposes, then deleted or de-identified.</li>
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
          <li>Encryption of data in transit (TLS/SSL) and at rest where supported by the underlying infrastructure</li>
          <li>Secure password hashing (bcrypt)</li>
          <li>Access controls limiting employee and contractor access to personal information on a need-to-know basis</li>
          <li>Regular security assessments and vulnerability testing</li>
          <li>Incident response procedures for potential data breaches</li>
          <li>Secure cloud infrastructure with reputable hosting providers; sensitive financial and payment information is handled within PCI-DSS-compliant payment processors and we do not directly store full payment card numbers on Bizzy infrastructure</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          <strong>Important:</strong> While we strive to protect your personal information, no method of electronic transmission or storage is 100% secure. We cannot guarantee the absolute security of your data. You are responsible for maintaining the confidentiality of your account credentials and for any activity that occurs under your account.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">8.1 Breach Notification</h3>
        <p className="text-muted leading-relaxed">
          In the event of a data breach that affects your personal information, Bizzy will notify you and relevant authorities as required by applicable law, including New York&apos;s SHIELD Act and applicable state data breach notification statutes. Notification will include the nature of the breach, the categories of data affected, steps we are taking to address the breach, and recommendations for actions you can take to protect yourself.
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
          Request the deletion of your personal information, subject to certain exceptions (e.g., legal obligations, tax recordkeeping, completing transactions, fraud prevention).
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Correct</h3>
        <p className="text-muted leading-relaxed">
          Request correction of inaccurate personal information that we maintain about you.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Portability</h3>
        <p className="text-muted leading-relaxed">
          Request a portable, machine-readable copy of your personal data to transfer to another service.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Opt Out of Targeted Advertising or Sale/Share</h3>
        <p className="text-muted leading-relaxed">
          Opt out of the sale or sharing of your personal information for targeted advertising purposes. Bizzy does not sell your personal information. To the extent that the use of certain analytics or advertising-attribution sub-processors qualifies as &quot;sharing&quot; under the CCPA, you may opt out as described in Section 10.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Limit Use of Sensitive Personal Information</h3>
        <p className="text-muted leading-relaxed">
          Where applicable, request that we limit our use of sensitive personal information (e.g., precise geolocation) to what is necessary to provide the service.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Right to Opt Out of Profiling / Automated Decision-Making</h3>
        <p className="text-muted leading-relaxed">
          Residents of certain states (including Colorado, Virginia, Connecticut, and others) may opt out of profiling in furtherance of decisions that produce legal or similarly significant effects. Bizzy does not make decisions with legal or similarly significant effects about you based solely on automated processing.
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
                <td className="border border-gray-300 px-4 py-3">Financial information for Promoter payouts (taxpayer ID, payout account)</td>
                <td className="border border-gray-300 px-4 py-3">Yes, Promoters only</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3">Inferences (preferences, characteristics, behavior, business-applied tags)</td>
                <td className="border border-gray-300 px-4 py-3">Yes</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
                <td className="border border-gray-300 px-4 py-3">No</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.2 We Do Not Sell Personal Information</h3>
        <p className="text-muted leading-relaxed">
          Bizzy does <strong>not sell</strong> your personal information as defined by the CCPA, and has not done so in the preceding twelve (12) months. We do not knowingly sell or share the personal information of minors under 16 years of age.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.3 Sensitive Personal Information</h3>
        <p className="text-muted leading-relaxed">
          We may collect certain categories of sensitive personal information, including: precise geolocation data (only with your device permission), account log-in credentials (passwords are stored in hashed form), and, for Promoters who enroll in the Promoter Program, taxpayer identification information (such as SSN or EIN provided via IRS Form W-9). We use sensitive personal information only for the purposes permitted by the CCPA, including providing the services you request, processing payouts, and complying with tax reporting requirements. We do not use or disclose sensitive personal information to infer characteristics about you for marketing purposes.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.4 Opt-Out Preference Signals (Global Privacy Control)</h3>
        <p className="text-muted leading-relaxed">
          We recognize and honor the Global Privacy Control (GPC) signal as a valid opt-out preference signal for the sale or sharing of personal information. If your browser or device sends a GPC signal, we will treat it as a request to opt out of the sale or sharing of personal information associated with that browser or device.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.5 Financial Incentive Programs</h3>
        <p className="text-muted leading-relaxed">
          We may offer loyalty features, referral bonuses, the Bizzy Promoter Program, or promotional offers that involve the collection of personal information. Participation is voluntary, and you may opt out at any time. The value of such programs is reasonably related to the value of the data provided, calculated based on the expense related to offering the program.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.6 Your California Rights</h3>
        <p className="text-muted leading-relaxed">
          In addition to the rights listed in Section 9, California residents may exercise the right to know the specific pieces and categories of personal information collected, the right to delete, the right to correct, and the right to limit the use of sensitive personal information. To exercise any of these rights, please contact us using the methods described in Section 9.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.7 California Civil Code § 1789.3 Notice</h3>
        <p className="text-muted leading-relaxed">
          California users may contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs by mail at 1625 North Market Blvd., Suite N 112, Sacramento, CA 95834, or by telephone at (800) 952-5210.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.8 &quot;Shine the Light&quot; Disclosure</h3>
        <p className="text-muted leading-relaxed">
          California residents may request information about the disclosure of their personal information to third parties for the third parties&apos; direct marketing purposes by emailing {CONTACT_EMAIL} with the subject line &quot;Shine the Light Request.&quot;
        </p>

        {/* ── 11. Other State Privacy Rights ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">11. Other State Privacy Rights</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">11.1 Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana, Tennessee, Delaware, Iowa &amp; Other States</h3>
        <p className="text-muted leading-relaxed">
          Residents of states with comprehensive consumer privacy laws may have similar rights to those described in Section 9, including the rights to access, delete, correct, port, and opt out of certain data processing activities (including targeted advertising, sale of personal data, and profiling in furtherance of decisions producing legal or similarly significant effects). We will comply with applicable state privacy laws and honor verifiable consumer requests consistent with those laws.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">11.2 How to Appeal</h3>
        <p className="text-muted leading-relaxed">
          If we decline to take action on your privacy request, you have the right to appeal that decision. To submit an appeal, email us at <strong>{CONTACT_EMAIL}</strong> with the subject line &quot;Privacy Request Appeal.&quot; We will respond to appeals within the time frame required by applicable law (typically 45-60 days).
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">11.3 New York SHIELD Act</h3>
        <p className="text-muted leading-relaxed">
          For New York residents, Bizzy maintains a security program reasonably designed to protect the security, confidentiality, and integrity of personal information collected from New York residents, consistent with the New York SHIELD Act, and will provide breach notification as required by New York law.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">11.4 Florida Privacy</h3>
        <p className="text-muted leading-relaxed">
          As a Florida-based company, we comply with all applicable Florida laws regarding data privacy and security. Florida residents may contact us to exercise any rights afforded under applicable state law.
        </p>

        {/* ── 12. Children's Privacy ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">12. Children&#39;s Privacy</h2>
        <p className="text-muted leading-relaxed">
          The Platform is not intended for children under the age of <strong>13</strong>, and we do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child under 13 has provided personal information to Bizzy, please contact us immediately at {CONTACT_EMAIL} and we will take steps to delete such information. We comply with the Children&#39;s Online Privacy Protection Act (&quot;COPPA&quot;).
        </p>
        <p className="text-muted leading-relaxed">
          The Platform is designed for users who are at least <strong>18 years of age</strong>, except for certain Deals and Tickets that require the User to be 21 or older. We do not knowingly solicit account registration from anyone under 18. If we learn that we have collected personal information from a person under 18 without appropriate consent, we will delete that information as quickly as possible.
        </p>
        <p className="text-muted leading-relaxed">
          We do not knowingly sell or share the personal information of minors under 16 years of age.
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
          <li><strong>Precise location:</strong> Collected through GPS, Wi-Fi, or Bluetooth signals on your mobile device only when you explicitly grant location permission. This enables features like nearby deal discovery, distance calculations to participating merchants and venues, and location-based notifications.</li>
          <li><strong>Place and venue data:</strong> We use third-party location and place lookup services (e.g., Google Maps Platform, Apple Maps) to resolve venue names, addresses, business details, and geographic coordinates associated with deals and events listed on the Platform.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.2 Distance Calculations</h3>
        <p className="text-muted leading-relaxed">
          When you grant location permission, the Platform may calculate and display the distance between your current location and merchants, venues, or events. These calculations are performed using your device&#39;s GPS coordinates and the geographic coordinates of listed locations. Distance data is used to sort and recommend nearby deals and events and is not shared with third parties except as aggregated, de-identified analytics.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.3 Your Control Over Location Data</h3>
        <p className="text-muted leading-relaxed">
          You can control precise location access at any time through your device&#39;s system settings. Denying or revoking location permission may limit certain features of the Platform (e.g., nearby deals may not be displayed accurately, and distance-based sorting will be unavailable). Approximate (IP-based) location is collected as part of standard internet communication and cannot be separately opted out of.
        </p>

        {/* ── 15. Apple/Google Wallet Pass ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">15. Apple/Google Wallet Pass</h2>
        <p className="text-muted leading-relaxed">
          If you elect to add a Bizzy Ticket to Apple Wallet or Google Wallet, the Platform transmits to the applicable wallet provider the data necessary to render the pass, including the event name, venue, date and time, your name as the ticket holder, the seat or ticket type, and the QR or barcode used for admission. The wallet provider stores the pass on your device, and may transmit limited data (e.g., last-used timestamps, geofenced suggestions to surface the pass at the venue) back to itself in accordance with its own privacy policy. Bizzy does not control the wallet provider&apos;s handling of pass data after delivery.
        </p>

        {/* ── 16. Push Notifications & Personal Marketing ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">16. Push Notifications &amp; Personal Marketing</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">16.1 Push Notifications</h3>
        <p className="text-muted leading-relaxed">
          With your permission, we send push notifications to your mobile device. These may include notifications about new deals, upcoming events, account-related information, welcome sequences for new users, and promotional campaigns. You can manage push notification preferences in the app settings or through your device&#39;s notification settings at any time.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">16.2 Email Marketing (CAN-SPAM)</h3>
        <p className="text-muted leading-relaxed">
          We may send promotional emails about deals, events, and Platform updates. Every promotional email includes (a) accurate header and routing information, (b) a non-deceptive subject line, (c) clear identification of the email as an advertisement (where required), (d) a valid physical postal address for the sender, and (e) a clear and conspicuous unsubscribe mechanism. Bulk-marketing emails also support the List-Unsubscribe-Post header (RFC 8058) to enable one-click unsubscribe through major mail providers. We honor opt-out requests within the timeframe required by law (no later than 10 business days). Even after opting out of marketing emails, you will continue to receive transactional emails (purchase confirmations, account security alerts, event reminders for Tickets you hold, important service announcements).
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">16.3 SMS/Text Messages (TCPA)</h3>
        <p className="text-muted leading-relaxed">
          Marketing SMS messages from Bizzy or any business operating on the Platform are sent after you opt in at checkout or in settings. On ticket checkout in the app, and on some web checkouts, the marketing SMS box is presented already selected; you may uncheck it, and purchase is not conditioned on leaving it selected. By leaving the box selected (or later enabling SMS), you agree to receive recurring marketing SMS messages; message frequency varies; message and data rates may apply. You may opt out at any time by replying STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT, or REVOKE to any marketing SMS, or by toggling SMS off in your account notification settings. Reply HELP for help. We maintain records of your opt-in and opt-out actions for compliance purposes (see Section 7).
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Plain-language opt-out requests (such as &quot;stop texting me&quot; or &quot;remove me&quot;) are honored in addition to the keywords above, and you may re-subscribe by replying START. For guest checkout (purchasing without an account), we send a one-time SMS verification code to the phone number entered to verify the purchase, and we process that number and the message&apos;s delivery status; these verification messages are transactional, are rate-limited to prevent abuse, and are not marketing. Transactional and verification messages (including OTP and guest-checkout codes) are not affected by a marketing opt-out.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">16.4 Consent Records</h3>
        <p className="text-muted leading-relaxed">
          We maintain records of your opt-in and opt-out actions (including timestamp, source, and channel) for compliance with the TCPA, the CAN-SPAM Act, and other applicable laws. You may request a copy of your consent record by contacting {CONTACT_EMAIL}.
        </p>

        {/* ── 17. Business-Sent Communications & Follower Relationships ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">17. Business-Sent Communications &amp; Follower Relationships</h2>
        <p className="text-muted leading-relaxed">
          Merchants, Event Organizers, and venues you have opted in to may use Bizzy&apos;s in-app marketing tools to send communications to you. When this occurs:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>The business is the sender of record.</strong> Bizzy acts as the technology platform. The business is responsible for the content and accuracy of the communication, subject to Bizzy&apos;s content policies.</li>
          <li><strong>We process delivery and engagement data on the business&apos;s behalf.</strong> This includes phone numbers and email addresses for delivery, opt-out (STOP) signals from carriers, message delivery status, opens, clicks, and the message content itself. We do not use this data to build a Bizzy-side profile of you for unrelated advertising purposes.</li>
          <li><strong>Following a business after a Ticket purchase.</strong> When you purchase a Ticket, the Platform creates a follower relationship between you and the Event Organizer, with per-business notification preferences. This relationship enables transactional event communications and the business&apos;s announcements through the channels you have enabled (see Terms Section 16.2 and the channel-level rules in Section 16). You can adjust per-business notification preferences, mute an individual business, apply a global marketing mute, or unfollow the business at any time in your account settings.</li>
          <li><strong>10DLC and short-code compliance.</strong> SMS sent through the Platform on behalf of businesses is delivered over U.S. carrier-registered messaging campaigns (10DLC or short codes) so that you can identify the sender and the carrier can enforce STOP/HELP keywords.</li>
        </ul>

        {/* ── 18. Promoter Program Data ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">18. Promoter Program Data</h2>
        <p className="text-muted leading-relaxed">
          If you enroll in the Bizzy Promoter Program (governed in detail by the Terms of Service), we collect and process additional categories of information:
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">18.1 Identity, Tax &amp; Payout Information</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Legal identity and tax information:</strong> Legal name, address, date of birth, and taxpayer identification number (such as SSN or EIN) provided on IRS Form W-9 or its successor.</li>
          <li><strong>Payout destination:</strong> Bank account or other supported payout destination collected through Stripe Connect onboarding. Sensitive banking information is handled directly by Stripe (a PCI-DSS-compliant payment processor) and is not stored in Bizzy&apos;s primary systems.</li>
          <li><strong>Identity verification artifacts:</strong> Where Stripe Connect requires Know-Your-Customer (KYC) verification, you may be asked to upload a government-issued ID or other documents. These documents are submitted directly to Stripe and are not stored by Bizzy.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">18.2 Promoter Activity &amp; Performance</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Tracking links you have generated, their associated Events, and commission terms (snapshot at link creation)</li>
          <li>Click events, attributed Ticket purchases, accrued commission amounts, and clawback events</li>
          <li>Aggregated dashboard analytics (lifetime earnings, per-event click and sale counts)</li>
          <li>Communications between you and Bizzy or Event Organizers regarding your Promoter activity</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">18.3 Use, Disclosure &amp; Retention</h3>
        <p className="text-muted leading-relaxed">
          We use Promoter data to operate the Promoter Program, attribute purchases, calculate and disburse payouts, generate IRS Forms 1099-NEC (where the U.S. reporting threshold is met), and detect and prevent fraud or prohibited conduct. We disclose Promoter data to Stripe (for payouts and KYC), to the relevant Event Organizer (limited to the attributed-purchase summary necessary to validate commissions), and to tax authorities as required by law. We retain Promoter tax records and payout records for at least seven (7) years to comply with U.S. tax recordkeeping obligations.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">18.4 What Promoters See About Users</h3>
        <p className="text-muted leading-relaxed">
          Promoters do <strong>not</strong> receive personal information about the individual Users who click their tracking links or who complete purchases attributed to them. The Promoter dashboard shows aggregated counts, not buyer identities.
        </p>

        {/* ── 19. Ticketing-Specific Data Practices ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">19. Ticketing-Specific Data Practices</h2>
        <p className="text-muted leading-relaxed">
          When you purchase a Ticket through Bizzy Ticketing LLC, additional data practices apply:
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">19.1 Data Collected for Ticketing</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Ticket purchaser identity:</strong> Name, email, and phone number for order confirmation and event communication.</li>
          <li><strong>Transaction details:</strong> Event name, ticket type, quantity, price, fees, payment method (last four digits only), promo code applied, and order timestamp.</li>
          <li><strong>Admission data:</strong> QR code scan records, time of entry, the identifier of the scanner or Door Code Operator, admission outcome (valid, duplicate, invalid), and per-tap door-counter records (used for event operations, capacity management, and door counter analytics).</li>
          <li><strong>Transfer records:</strong> If Tickets are transferred to another party (where permitted), we record the transfer for audit and fraud prevention purposes.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">19.2 Sharing with Event Organizers</h3>
        <p className="text-muted leading-relaxed">
          We share ticket-purchaser information with the relevant Event Organizer for the purposes of admission management, transactional event communications, customer service, and (where you have separately opted in under Section 16) marketing communications. The data shared with an Event Organizer includes: your name, email address, phone number (if collected), Ticket type and order details, redemption and scan status, any tags or notes the Event Organizer has applied to your profile within the Bizzy business dashboard (e.g., &quot;VIP,&quot; &quot;repeat attendee&quot;), and your communication preferences. Event Organizers use this information in accordance with our agreements with them and their own privacy policies. We encourage you to review the privacy policy of each Event Organizer.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">19.3 Authorized Event Staff &amp; Scanners</h3>
        <p className="text-muted leading-relaxed">
          Authorized event staff (door personnel, security, volunteers) operating Bizzy scanner links may view information necessary to validate admission, including your name, ticket type, redemption status, and previous scan timestamps. Scanner access is scoped to the Event for which the staff is authorized.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">19.4 Fraud Prevention</h3>
        <p className="text-muted leading-relaxed">
          We use ticket transaction data and device information to detect and prevent ticket fraud, including duplicate ticket use, unauthorized transfers, counterfeit tickets, and prohibited automated purchasing (consistent with the federal BOTS Act). Suspected fraud may result in ticket cancellation and account suspension.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">19.5 Door Code Operators</h3>
        <p className="text-muted leading-relaxed">
          An Event Organizer may allow individuals to work an event&apos;s door using a numeric door code, without a Bizzy account (see Terms Section 7.14). When a person operates the door in this way, we ask for and collect their <strong>name</strong> so that their Ticket scans, door sales, and door-counter activity can be attributed to them in the Event Organizer&apos;s analytics. This information is stored in an operator session record and is referenced by scan logs, orders, and door-counter taps for that event. We collect this information at the direction of the Event Organizer for that event&apos;s operations; the Event Organizer determines the purposes for which it is used within its analytics. We retain Door Code Operator session records for the duration of the event and a limited period afterward for audit, dispute-resolution, and fraud-prevention purposes, then delete or de-identify them in accordance with Section 7. Door Code Operators may contact us at {CONTACT_EMAIL} with privacy requests.
        </p>

        {/* ── 20. Merchant & Event Organizer Data ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">20. Merchant &amp; Event Organizer Data</h2>
        <p className="text-muted leading-relaxed">
          If you are a Merchant or Event Organizer using the Platform, we collect additional information necessary to operate your business relationship with Bizzy, including:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Business name, address, and contact information</li>
          <li>Authorized representative name and contact details</li>
          <li>Business type, category, and operating hours</li>
          <li>Deal or event details you create on the Platform</li>
          <li>Stripe Connect account information for payouts</li>
          <li>Marketing campaign data, including blast content, recipient counts, and engagement metrics</li>
          <li>Aggregated analytics about deal redemptions, ticket sales, and follower base</li>
          <li>One or more payment-processor connected accounts (e.g., multiple Stripe Connect accounts) and any venue-to-account mappings used to route sale proceeds</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          We use this information to operate the Platform, facilitate transactions, provide analytics, and communicate with you about your account. Merchant and Event Organizer data is subject to the same security and retention practices described in this Privacy Policy.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          <strong>AI support assistant.</strong> The business dashboard may include an AI support assistant. When a business user submits a question, we process the text of that question and related account context (such as your name and business name) to generate a response from a knowledge base through our AI sub-processor (see Section 4.2), and we may retain the conversation to improve support quality. Business users should not enter another person&apos;s personal information into the assistant except as necessary for a support request. AI-generated responses are informational only and not binding (see Terms Section 3.8).
        </p>

        {/* ── 21. Data Transfers ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">21. Data Transfers</h2>
        <p className="text-muted leading-relaxed">
          Bizzy is based in the United States and the Platform is intended for use by U.S. residents. If you access the Platform from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States, where data protection laws may differ from those of your country. By using the Platform, you consent to the transfer of your information to the United States.
        </p>
        <p className="text-muted leading-relaxed">
          We take steps to ensure that your information receives an adequate level of protection in the jurisdictions in which we process it, consistent with applicable law.
        </p>

        {/* ── 22. Data Broker / Negative Disclosures ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">22. What Bizzy Is Not</h2>
        <p className="text-muted leading-relaxed">
          For clarity, Bizzy:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Is <strong>not a data broker</strong> within the meaning of California Civil Code § 1798.99.80 or the registration laws of any U.S. state.</li>
          <li>Is <strong>not a consumer reporting agency</strong> under the Fair Credit Reporting Act and does not provide consumer reports.</li>
          <li>Does <strong>not handle protected health information (PHI)</strong> subject to the U.S. Health Insurance Portability and Accountability Act (HIPAA).</li>
          <li>Does <strong>not collect biometric identifiers or biometric information</strong> subject to the Illinois Biometric Information Privacy Act (BIPA) or analogous state laws.</li>
          <li>Does <strong>not use session-replay, screen-recording, or chat-wiretapping technologies</strong> in a manner prohibited by the California Invasion of Privacy Act (CIPA) or analogous state laws.</li>
        </ul>

        {/* ── 23. Changes to This Privacy Policy ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">23. Changes to This Privacy Policy</h2>
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

        {/* ── 24. Revision History ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">24. Revision History</h2>
        <p className="text-muted leading-relaxed">
          This section lists material revisions to this Privacy Policy. Non-material changes (typographical corrections, formatting, or clarifications that do not alter your rights) may be made without notation.
        </p>
        <ul className="text-muted space-y-2 list-disc pl-6">
          <li><strong>v1.3 &mdash; August 24, 2026:</strong> Described the live checkout SMS control: the marketing box is presented already selected, may be unchecked, and is not required to complete a purchase (Section 16.3).</li>
          <li><strong>v1.2 &mdash; July 14, 2026:</strong> Disclosed collection of Door Code Operator names and operator session records from account-less door staff (Sections 19.5, 1.1); added scan and admission logs, per-tap door-counter records, the marketing send log, and Apple/Google Wallet device registrations to the collected-data categories and retention schedule (Sections 1.2, 19.1, 7); disclosed our AI support-assistant sub-processor (Sections 4.2, 20); clarified the follower relationship created on a Ticket purchase and per-business notification preferences (Section 17); added START re-subscribe and plain-language opt-out equivalents and disclosed guest-checkout verification messaging (Section 16.3); and noted per-venue connected accounts (Section 20).</li>
          <li><strong>v1.1 &mdash; May 17, 2026:</strong> Added OPTOUT and REVOKE to the list of recognized SMS opt-out keywords (Section 17); added this Revision History section.</li>
          <li><strong>v1.0 &mdash; May 12, 2026:</strong> Initial publication of this Privacy Policy, including expanded coverage of Promoter Program data, marketing communications, sub-processor disclosures, Apple Wallet pass data, and state-specific privacy rights (CA, VA, CO, CT, UT, NY, FL).</li>
        </ul>

        {/* ── 25. Contact Information ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">25. Contact Information</h2>
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
