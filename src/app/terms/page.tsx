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
        <p className="text-muted text-sm mb-2">BizzyU.com &amp; the Bizzy Mobile Application</p>
        <p className="text-muted text-sm mb-10">
          <strong>Effective Date:</strong> August 24, 2026 | <strong>Last Updated:</strong> August 24, 2026 | <strong>Version:</strong> 1.3
        </p>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-10">
          <p className="text-sm text-yellow-900 leading-relaxed">
            <strong>Please read carefully.</strong> These Terms contain important provisions affecting your legal rights, including a binding arbitration agreement, a class action waiver, and limitations on Bizzy&apos;s liability. By using the Platform, you agree to these Terms. If you do not agree, do not use the Platform.
          </p>
        </div>

        {/* ── 1. Acceptance of Terms ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">1. Acceptance of Terms</h2>
        <p className="text-muted leading-relaxed">
          These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and the Bizzy family of companies (defined in Section 2 below), collectively referred to as &quot;Bizzy,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our.&quot; These Terms govern your access to and use of the website located at <strong>www.bizzyu.com</strong>, the Bizzy mobile application (available on iOS and Android), and any related websites, features, tools, widgets, APIs, or services we operate now or in the future (collectively, the &quot;Platform&quot;).
        </p>
        <p className="text-muted leading-relaxed">
          By taking any of the following actions, you acknowledge that you have read, understood, and agree to be bound by these Terms and our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, which is incorporated by reference:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Accessing or browsing the Platform</li>
          <li>Creating a Bizzy account</li>
          <li>Redeeming a deal or voucher</li>
          <li>Purchasing, reserving, or using a ticket or event pass</li>
          <li>Enrolling in the Bizzy Promoter Program</li>
          <li>Subscribing to Bizzy Premium</li>
          <li>Entering your email address, phone number, or other information</li>
          <li>Accepting or enabling push notifications</li>
          <li>Downloading or installing the Bizzy mobile application</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3 font-semibold">
          If you do not agree to these Terms, you must immediately discontinue all use of the Platform and delete any installed applications.
        </p>

        {/* ── 2. Bizzy Entity Structure ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">2. Bizzy Entity Structure</h2>
        <p className="text-muted leading-relaxed">
          The Platform is operated by a family of affiliated limited liability companies organized under the laws of the State of Florida. Each entity is responsible for distinct aspects of the services you receive:
        </p>
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse text-sm text-muted">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Entity</th>
                <th className="border border-gray-300 bg-gray-900 text-white px-4 py-3 text-left font-semibold">Role &amp; Responsibilities</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Bizzy Holdings LLC</strong></td>
                <td className="border border-gray-300 px-4 py-3">Owns and controls the Platform technology, software, brand, trademarks, and all intellectual property associated with Bizzy.</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3"><strong>Bizzy Deals LLC</strong></td>
                <td className="border border-gray-300 px-4 py-3">Operates the deals and voucher services, manages merchant deal relationships, and administers user subscriptions related to deal access (including Bizzy Premium).</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Bizzy Ticketing LLC</strong></td>
                <td className="border border-gray-300 px-4 py-3">Operates all ticketing and event access services, including ticket sales, event listing management, admission verification, scanner administration, event-related customer support, and the Bizzy Promoter Program.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-muted leading-relaxed">
          References to &quot;Bizzy,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot; in these Terms refer to the applicable entity or entities depending on the context of the services being used. Where a provision applies to all entities, the reference is collective.
        </p>

        {/* ── 3. Description of Services ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">3. Description of Services</h2>
        <p className="text-muted leading-relaxed">
          Bizzy provides a technology platform that connects college students and eligible users with local merchants, venues, event organizers, and student promoters. The Platform offers the following categories of services:
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.1 Bizzy Deals</h3>
        <p className="text-muted leading-relaxed">
          A marketplace where participating merchants (&quot;Merchants&quot;) list exclusive vouchers, discounts, special offers, and promotions for products, services, or experiences (&quot;Deals&quot;). Local Deals are created, managed, and fulfilled by Merchants and are redeemed in person through the app. The Platform may also display <strong>national or third-party offers</strong> that open a brand&apos;s own website or app; those offers are not Bizzy vouchers and are described in Section 6.8. For local Deals, Bizzy acts as an intermediary platform facilitating the connection between Users and Merchants.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.2 Bizzy Ticketing</h3>
        <p className="text-muted leading-relaxed">
          A ticketing service where businesses, venues, and individuals (&quot;Event Organizers&quot;) list events and sell tickets, passes, Skip the Line passes, weekly cover / door-access passes, or reservations (&quot;Tickets&quot;) to Users through the Platform. An Event Organizer may be a business or a personal host with no business entity. Bizzy Ticketing LLC facilitates ticket distribution, admission verification (including QR-code-based entry, camera check-in, and door counters), and event-related communications. Event Organizers are solely responsible for the events themselves, including event execution, venue safety, and the accuracy of event details.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.3 Bizzy Premium</h3>
        <p className="text-muted leading-relaxed">
          An optional paid subscription service that unlocks unlimited deal claims, access to premium-only deals, and other features as described on the Platform. Bizzy Premium is administered by Bizzy Deals LLC. Subscription terms, billing, and cancellation are governed by Section 9 and by the platform through which you purchased the subscription (e.g., Apple App Store or Google Play).
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.4 Bizzy Promoter Program</h3>
        <p className="text-muted leading-relaxed">
          An optional program through which eligible Users (&quot;Promoters&quot;) may earn commissions for driving qualifying ticket sales for participating Event Organizers. The Promoter Program is governed in detail by Section 14. By default, no User is enrolled in the Promoter Program; enrollment requires explicit acceptance of the Promoter terms and completion of payout onboarding.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.5 Business Communications &amp; Marketing Tools</h3>
        <p className="text-muted leading-relaxed">
          Merchants, Event Organizers, and other participating businesses may use Bizzy&apos;s in-app tools to send communications to Users who have opted in to receive them, including SMS blasts, email blasts, push notifications, and in-event announcements. These tools and the consent framework governing them are described in Sections 15 and 16.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.6 Leaderboard &amp; Engagement Features</h3>
        <p className="text-muted leading-relaxed">
          The Platform may include gamification features such as monthly leaderboards, rankings, achievement badges, and activity-based rewards that track and display User engagement with deals and events. Leaderboard rankings are calculated based on your Platform activity (such as deal claims and event participation) and may be visible to other Users at the same campus. Leaderboard rankings reset monthly. Lifetime savings and lifetime claim counts are not reset. By using the Platform, you consent to your username and ranking being displayed on public or semi-public leaderboards within the app.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.7 Additional Services</h3>
        <p className="text-muted leading-relaxed">
          From time to time, Bizzy may introduce additional features, tools, or services. Such additions will be governed by these Terms unless separate terms are presented at the time of access, in which case those supplemental terms will also apply and will control in the event of a conflict with these Terms.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.8 Business Dashboard &amp; AI Support Assistant</h3>
        <p className="text-muted leading-relaxed">
          Merchants and Event Organizers may access a web-based business dashboard for team management, event and ticketing setup, marketing, analytics, and payouts. The dashboard may include an <strong>AI support assistant</strong> that generates answers to typed questions from a Bizzy knowledge base. Responses from the AI assistant are provided for <strong>general informational purposes only and are not a binding statement</strong> of fees, payout timing, policies, eligibility, or legal, tax, or financial advice. In the event of any conflict, these Terms, the Privacy Policy, the applicable business or Promoter agreement, and the payment processor&apos;s terms control over any AI-generated response. Do not rely on the AI assistant for decisions without confirming through official Platform settings or by contacting Bizzy. Questions you submit to the assistant are processed as described in the Privacy Policy.
        </p>

        <p className="text-muted leading-relaxed mt-3">
          <strong>Important:</strong> Bizzy is a technology platform, not a retailer, merchant, event organizer, venue operator, employer, or marketing agency. Bizzy does not produce, manufacture, sell, resell, provide, control, manage, offer, deliver, or supply any of the Deals, Tickets, products, services, events, or marketing content listed on or distributed through the Platform. The Merchants, Event Organizers, and (where applicable) Promoters are solely responsible for their offerings and communications, subject to the rules in these Terms.
        </p>

        {/* ── 4. Eligibility & Account Registration ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">4. Eligibility &amp; Account Registration</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.1 Age Requirements</h3>
        <p className="text-muted leading-relaxed">
          You must be at least <strong>18 years of age</strong> (or the age of majority in your jurisdiction, whichever is greater) to create an account and use the Platform. Certain features, including age-restricted deals (see Section 12), require Users to be at least 21 years of age. The Promoter Program (Section 14) and Bizzy Premium subscription (Section 9) also require Users to be at least 18.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.2 No Children Under 13 (COPPA)</h3>
        <p className="text-muted leading-relaxed">
          The Platform is not directed to children under 13 years of age, and we do not knowingly collect personal information from children under 13. If we learn that we have inadvertently collected information from a child under 13, we will promptly delete that information. If you believe we have collected information from a child under 13, please contact us at {CONTACT_EMAIL}.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.3 Geographic Eligibility</h3>
        <p className="text-muted leading-relaxed">
          The Platform is intended for use by residents of the United States. We make no representation that the Platform is appropriate or available for use in any other jurisdiction. Users accessing the Platform from outside the United States do so at their own risk and are responsible for compliance with their local laws. Certain features may be restricted by geography or campus affiliation.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.4 Student Verification</h3>
        <p className="text-muted leading-relaxed">
          Certain Deals and Tickets may be restricted to verified college or university students. Bizzy may require verification of your student status through a valid <strong>.edu</strong> email address, student ID, or a third-party verification service. Providing false or misleading student status information is a violation of these Terms and may result in immediate account termination.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.5 Accuracy of Information</h3>
        <p className="text-muted leading-relaxed">
          You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete. Providing false, inaccurate, or misleading information constitutes a breach of these Terms.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.6 One Account Per Person</h3>
        <p className="text-muted leading-relaxed">
          Each individual may maintain only one active Bizzy account. Creating multiple accounts to exploit Deals, Tickets, referral programs, Promoter commissions, or promotional offers is strictly prohibited and may result in termination of all associated accounts and forfeiture of any unpaid Promoter balance.
        </p>

        {/* ── 5. User Accounts & Security ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">5. User Accounts &amp; Security</h2>
        <p className="text-muted leading-relaxed">
          You are solely responsible for maintaining the confidentiality of your account credentials, including your password and any authentication tokens. You agree to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Use a strong, unique password that you do not use on other services</li>
          <li>Not share your account credentials with any other person</li>
          <li>Immediately notify Bizzy at <strong>{CONTACT_EMAIL}</strong> if you suspect unauthorized access to or use of your account</li>
          <li>Log out of your account at the end of each session when using a shared device</li>
        </ul>
        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">5.1 Account Verification &amp; Recovery</h3>
        <p className="text-muted leading-relaxed">
          Bizzy may use SMS-based one-time passcodes (OTP) to verify your identity during account registration, login, or account recovery. By providing your phone number, you consent to receiving these verification messages. Standard message and data rates may apply. OTP codes are time-sensitive and should not be shared with anyone. Bizzy will never ask you for your OTP code outside of the in-app verification flow. Verification codes may also be sent during guest checkout without an account; see Section 7.18.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Bizzy is not liable for any loss or damage arising from your failure to comply with this section. You are responsible for all activities that occur under your account, whether or not you authorized such activities.
        </p>

        {/* ── 6. Bizzy Deals - Terms of Use ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">6. Bizzy Deals: Terms of Use</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.1 How Deals Work</h3>
        <p className="text-muted leading-relaxed">
          Merchants create and manage their own Deals on the Platform. When you redeem a Deal, you are entering into a transaction directly with the Merchant, not with Bizzy. Bizzy&#39;s role is limited to providing the technology platform that displays and facilitates access to those Deals.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.2 In-Store Redemption</h3>
        <p className="text-muted leading-relaxed">
          Unless otherwise specified by the Merchant, Deals are intended for in-person redemption at the Merchant&apos;s location. The Platform may require a staff member to confirm redemption (e.g., by tapping a confirmation control on your device). Redeeming a Deal outside of an authorized in-person interaction may forfeit the Deal and count against your weekly claim limit.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.3 Deal Availability &amp; Modifications</h3>
        <p className="text-muted leading-relaxed">
          Deals are subject to change, limitation, or removal at any time without prior notice. Availability may vary based on your location, student verification status, subscription tier, or other eligibility criteria. Bizzy does not guarantee the availability of any specific Deal.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.4 Exclusivity</h3>
        <p className="text-muted leading-relaxed">
          Deals listed on the Platform may be exclusive to Bizzy Users. However, Bizzy does not guarantee or enforce exclusivity, and Merchants may offer comparable promotions at their discretion.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.5 Redemption Procedure</h3>
        <p className="text-muted leading-relaxed">
          To redeem a Deal, follow the instructions displayed on the Platform, which may include presenting a digital voucher, QR code, or confirmation screen to the Merchant at the point of sale. Each Deal may have specific terms, conditions, or restrictions imposed by the Merchant, which you must comply with at the time of redemption.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.6 Deal Claim Limits</h3>
        <p className="text-muted leading-relaxed">
          Deals may be subject to claim limits, including but not limited to a maximum number of redemptions per User per day, per week, per month, or per Merchant. Free-tier Users are limited to a capped number of deal claims per week; Bizzy Premium subscribers receive unlimited claims subject to per-deal frequency rules. Limits are displayed on the Deal listing or within your account. Bizzy tracks your claim history to enforce these limits. Attempting to circumvent claim limits, including by creating multiple accounts, using automated tools, or other means, is a violation of these Terms and may result in account suspension or termination.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.7 Deal Disputes</h3>
        <p className="text-muted leading-relaxed">
          If a Merchant refuses to honor a listed Deal, modifies its terms at the point of sale, or otherwise fails to fulfill a Deal, you must resolve the issue directly with the Merchant. Bizzy will make commercially reasonable efforts to assist where possible, but assumes no liability for Merchant non-compliance.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.8 National and Third-Party Offers</h3>
        <p className="text-muted leading-relaxed">
          Some listings send you off the Platform to a third party&apos;s website or app (&quot;National Offers&quot;). Tapping a National Offer records the tap and opens the URL the third party provided. National Offers are <strong>not</strong> Deals under this Section 6: Bizzy does not sell them, does not issue a voucher, does not move money, and does not honor or refund them. The third party&apos;s terms apply. If the offer is not honored, you must resolve it with that third party. A &quot;verified on official site&quot; or similar badge means the link was supplied as that brand&apos;s official destination; it is not a guarantee that the third party will honor any price or promotion.
        </p>

        {/* ── 7. Bizzy Ticketing - Terms of Use ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">7. Bizzy Ticketing: Terms of Use</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.1 Ticket Purchases</h3>
        <p className="text-muted leading-relaxed">
          Tickets purchased through the Platform are sold by or on behalf of Event Organizers. By purchasing a Ticket, you are entering into a contractual relationship with the Event Organizer, and Bizzy Ticketing LLC acts as the authorized ticketing agent for the transaction. All Ticket sales are subject to these Terms and any additional terms imposed by the Event Organizer.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.2 Ticket Delivery &amp; Format</h3>
        <p className="text-muted leading-relaxed">
          Tickets will be delivered electronically through the Platform, typically as a QR code or digital pass accessible in your Bizzy account. You are responsible for ensuring that your device is charged, functional, and able to display the Ticket at the time of the event. Bizzy is not responsible for admission issues arising from device malfunction or inability to display a valid Ticket.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.3 Apple/Google Wallet Pass Integration</h3>
        <p className="text-muted leading-relaxed">
          The Platform may offer the option to add your Tickets to Apple Wallet or Google Wallet. When you add a Ticket to a third-party wallet provider, certain Ticket data (including event details, your name, and a QR or barcode) is transmitted to and stored by that provider, subject to the provider&apos;s own terms and privacy policy. Bizzy is not responsible for the availability, accuracy, or behavior of third-party wallet providers, including changes the provider may make to its pass display, notifications, or storage.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.4 Ticket Pricing &amp; Fees</h3>
        <p className="text-muted leading-relaxed">
          Ticket prices are set by Event Organizers. An organizer may raise a Ticket&apos;s price after a stated number of sales (&quot;surge&quot;). Checkout shows the <strong>price offered to you at that moment</strong>; that is the face price of your purchase if you complete it. The Platform does not display the organizer&apos;s remaining price steps to buyers. A later buyer may be offered a higher price. Bizzy Ticketing LLC may charge service fees, processing fees, or facility charges in addition to the face value of the Ticket. All applicable fees will be disclosed to you before you complete your purchase. Prices and fees are subject to change until the moment of confirmed purchase.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          A platform service fee applies to sales made through the Platform. The fee rate is set by Bizzy and may be configured per business. For Tickets and <strong>Skip the Line passes</strong>, the service fee is charged to the <strong>buyer in addition to</strong> the price set by the Event Organizer, and the Event Organizer receives the face value of the item sold. All fees, including any buyer-borne service fee, are itemized and shown to you as part of an all-in total <strong>before you confirm and pay</strong>. Fees are subject to change until the moment of confirmed purchase.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.5 Ticket Refunds &amp; Cancellations</h3>
        <p className="text-muted leading-relaxed">
          All Ticket sales are generally <strong>final and non-refundable</strong> unless otherwise stated at the time of purchase or required by applicable law. In the event of an event cancellation by the Event Organizer:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Cancelled Events:</strong> If an Event Organizer cancels an event, Bizzy will facilitate a refund of the Ticket face value. Service fees may or may not be refundable depending on the circumstances and the Event Organizer&#39;s refund policy.</li>
          <li><strong>Postponed or Rescheduled Events:</strong> If an event is postponed or rescheduled, your Ticket will generally be valid for the new date. If you cannot attend the rescheduled event, refund availability will depend on the Event Organizer&#39;s policy.</li>
          <li><strong>Venue or Weather-Related Changes:</strong> Bizzy is not responsible for changes to an event due to weather, venue conditions, or other factors outside our control.</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          When a Ticket, Skip the Line, or door sale is refunded: if the organizer&apos;s share is still held on the platform balance under Section 7.19, the refund is paid from that held balance; if the organizer&apos;s share has already been transferred to a connected account, Bizzy reverses that transfer (or requires it to be reversed) as described in Section 7.12. Where an event or sale is cancelled by the Event Organizer, Bizzy may also recover its payment-processing fee. Refunds to Users are not delayed by a Promoter clawback (see Section 10.4).
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.6 Ticket Transfers &amp; Resale Restrictions</h3>
        <p className="text-muted leading-relaxed">
          Tickets purchased through the Platform may not be transferred, resold, or distributed to third parties unless Bizzy expressly enables a transfer feature for the specific event. Unauthorized resale or transfer of Tickets may void the Ticket and result in denial of admission. Bizzy and Event Organizers reserve the right to cancel Tickets that have been resold in violation of this provision without refund.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.7 No Automated Ticket Purchases (BOTS Act)</h3>
        <p className="text-muted leading-relaxed">
          Consistent with the Better Online Ticket Sales Act of 2016 (the &quot;BOTS Act,&quot; 15 U.S.C. § 45c) and applicable state ticketing laws, you may not use any automated software (a &quot;bot&quot;), script, scraper, agent, or other device to purchase or attempt to purchase Tickets on the Platform; circumvent any security measure, access control, or purchase limit imposed by the Platform; or sell, transfer, or distribute any Ticket obtained through such means. Violations may result in Ticket cancellation without refund, account termination, and referral to law enforcement.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.8 Event Admission &amp; Conduct</h3>
        <p className="text-muted leading-relaxed">
          Admission to events is subject to the Event Organizer&#39;s rules and policies, including but not limited to dress codes, age restrictions, photography policies, and codes of conduct. The Event Organizer and/or venue reserves the right to refuse admission or remove attendees for any reason, including violation of event rules. Bizzy is not responsible for denied admission or removal from an event.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.9 Event Organizer Responsibilities</h3>
        <p className="text-muted leading-relaxed">
          Event Organizers are solely responsible for the event itself, including but not limited to the accuracy of event descriptions, the safety and condition of the venue, compliance with local laws and regulations, provision of advertised entertainment or services, and the overall attendee experience. Some Event Organizers may be permitted to publish without a separate review of each listing. Listing on the Platform is not a representation that Bizzy investigated that Event Organizer, event, or venue. Bizzy does not inspect, endorse, or guarantee any event, venue, or Event Organizer.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.10 Authorized Event Staff &amp; Scanner Access</h3>
        <p className="text-muted leading-relaxed">
          Event Organizers may issue scanner links and access credentials to authorized staff (such as door personnel, security staff, or volunteers) for the purpose of validating Tickets at admission and operating door counters. When you present a Ticket for scanning, authorized event staff may view information necessary for admission, including your name, ticket type, redemption status, and previous scan timestamps. You agree that this data may be shared with the Event Organizer and its authorized staff to facilitate admission. Bizzy is not responsible for the conduct of any Event Organizer&apos;s staff.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.11 Attendee Data Shared with Event Organizers</h3>
        <p className="text-muted leading-relaxed">
          When you purchase a Ticket, the applicable Event Organizer receives certain information about you, including your name, email address, phone number (where collected), Ticket purchase details, and any tags or notes the Event Organizer applies to your profile within the Bizzy business dashboard. Event Organizers agree under separate terms to use this information solely in connection with the event and applicable marketing communications you have opted in to. Bizzy is not responsible for an Event Organizer&apos;s use of attendee data outside the scope of the Platform.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          For clarity: purchasing a Ticket exposes your identity and contact information to the Event Organizer, who may view your attendance, apply tags or notes to your profile in its business dashboard, contact you with transactional event communications, and&mdash;through the channels you have enabled&mdash;send you the business&apos;s announcements as described in Section 16.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.12 Event Organizer Payouts</h3>
        <p className="text-muted leading-relaxed">
          Bizzy facilitates payouts to Event Organizers through third-party payment platforms that provide connected account functionality (e.g., Stripe Connect). To <strong>receive</strong> payouts, an Event Organizer must complete that processor&apos;s connected-account onboarding (including the processor&apos;s own agreement presented in that flow). The Platform may still allow sales before onboarding is complete; those proceeds are held as described in Section 7.19. Payout timing, fees, and terms are governed by the agreement between the Event Organizer, Bizzy, and the applicable payment processor. Bizzy is not liable for delays, holds, or issues arising from the payment processor&#39;s policies or the Event Organizer&#39;s account status.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          A business may connect <strong>more than one</strong> payment-processor connected account (e.g., multiple Stripe Connect accounts) and map specific venues to specific accounts. For a personal host, the same connected account may be used both to sell and to withdraw. When a sale is routed to a connected account, proceeds go to the account mapped to that event&apos;s venue or, if none, the organizer&apos;s default account. As between the parties, the Event Organizer whose connected account <strong>receives</strong> the proceeds of that sale is the <strong>merchant of record</strong> for that sale and is responsible for the underlying transaction, including refunds, chargebacks, and disputes. When a sale is held under Section 7.19, the charge settles on Bizzy&apos;s platform balance with the payment processor and is recorded as payable to that Event Organizer until transferred; refunds and chargebacks on a held sale are processed against that held balance as described in Section 7.5. Bizzy may debit, offset, or reverse amounts (including from future proceeds or a Promoter, host, or business balance) to recover refunded amounts, chargebacks, reversed transfers, and associated processing fees.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.13 Liability for Events</h3>
        <p className="text-muted leading-relaxed">
          Bizzy is not liable for any injury, loss, damage, or claim arising from your attendance at any event, including but not limited to personal injury, property damage, theft, illness, or exposure to communicable diseases. By attending an event, you assume all risks associated with attendance.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.14 Door Code Access &amp; Door Code Operators</h3>
        <p className="text-muted leading-relaxed">
          An Event Organizer may generate a numeric <strong>door code</strong> for an event and share it with individuals it authorizes to work that event&apos;s door (each, a <strong>&quot;Door Code Operator&quot;</strong>). A Door Code Operator does not need a Bizzy account; by entering a valid door code, the operator obtains a limited, event-scoped operational session on the Platform for the purpose of admitting attendees and supporting door operations for that event only.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          A Door Code Operator may scan and validate Tickets and Skip the Line passes; take in-person card payments at the door (including contactless &quot;tap-to-pay&quot;) for Tickets and passes; and create, rename, and increment door counters. A Door Code Operator may <strong>not</strong> delete or reset door counters; view, rotate, or regenerate the door code; edit the event; or view the event&apos;s revenue, settlement, or payout information. In-person card payments taken at the door are processed through Bizzy&apos;s payment processor and settle to the connected account associated with the event (see Section 7.12); a Door Code Operator has no access to funds, balances, or payout destinations.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          The Event Organizer is solely responsible for selecting, authorizing, supervising, and (if applicable) compensating its Door Code Operators, and for their conduct on the Platform, including any card payments they take and any information they enter. Door Code Operators act on behalf of the Event Organizer, not Bizzy. <strong>Bizzy is not the employer, principal, or agent of any Door Code Operator</strong> and is not responsible for their acts or omissions. By generating and distributing a door code, the Event Organizer represents that it is authorized to grant each operator access, that each operator is authorized to work the event, and that it has made the operator aware of the terms and privacy practices applicable to their use of the Platform.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          A door code expires a short period after its event ends and may be rotated by the Event Organizer at any time. Rotating or expiring a code terminates the access previously granted through that code, including any active operator session, on the next attempted action.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.15 Recurring Events</h3>
        <p className="text-muted leading-relaxed">
          An Event Organizer may create a recurring event or series that automatically generates individual event occurrences (each, an &quot;occurrence&quot; or &quot;night&quot;). <strong>Each occurrence is a separate event</strong> with its own inventory, capacity, pricing, promotional codes, door code, admission, and settlement. A Ticket or pass is valid only for the specific occurrence for which it was purchased. Cancellation, postponement, and refund terms (Section 7.5) apply per occurrence.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.16 Skip the Line Passes</h3>
        <p className="text-muted leading-relaxed">
          A Skip the Line pass is a purchasable, scannable pass that allows the holder to use an expedited or priority entry lane for a specified event occurrence, subject to the venue&apos;s rules and capacity. Skip the Line passes are sold per occurrence, may have their own capacity limits and promotional codes, and <strong>do not guarantee admission</strong> or waive the Event Organizer&apos;s or venue&apos;s admission discretion (see Section 7.8). Skip the Line passes are Tickets for purposes of these Terms, including the anti-bot and purchase-limit rules (Section 7.7), the transfer restrictions (Section 7.6), and the fee disclosure (Section 7.4). Skip the Line passes are generally non-refundable except as provided in Section 7.5 or as required by law. Checkout copy for these passes states that all sales are final except that if the night is cancelled by the venue, you receive a full refund.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.16A Weekly Cover and Door-Access Passes</h3>
        <p className="text-muted leading-relaxed">
          A Weekly Cover or door-access pass is a Ticket for a <strong>single night</strong> in a recurring door program operated by a business (not a personal host). It is valid for <strong>one entry</strong> on that night. Check-in may use the organizer&apos;s camera or the Bizzy scanner, as configured for that program. A pass does not guarantee admission (Sections 7.8 and 7.16). Age labels such as 21+ are notices on the listing and at checkout; the Platform does not collect date of birth to enforce them. The venue checks identification (Section 12). Refunds follow Section 7.5. Digital wallet passes may also state that there are no refunds except as required by law.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.17 Promotional Codes</h3>
        <p className="text-muted leading-relaxed">
          Event Organizers may issue promotional codes that reduce the price of Tickets or Skip the Line passes. A code may be <strong>event-specific</strong> or <strong>universal</strong> (applicable across every event at a given venue). Universal codes are subject to usage limits that are counted <strong>across all events to which the code applies</strong>. Promotional codes have no cash value, may be modified or withdrawn at any time, may not be combined unless expressly permitted, and are void where prohibited. Bizzy and the Event Organizer may void a code and reverse the associated discount where a code is obtained or used through fraud, error, or in violation of these Terms.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.18 Guest Checkout &amp; Verification</h3>
        <p className="text-muted leading-relaxed">
          The Platform may allow you to purchase a Ticket or pass without creating an account (&quot;guest checkout&quot;). To verify a guest purchase, the Platform sends a one-time SMS verification code to the phone number you enter. This is a <strong>transactional verification message, not marketing</strong>, and is sent to the number you provide in order to complete your purchase. By entering a phone number at checkout, you represent that you are authorized to receive messages at that number. To protect against abuse, verification requests are rate-limited (including by phone number, by network address, and by overall volume). Standard message and data rates may apply.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.19 Held Proceeds (Payout Account Not Ready)</h3>
        <p className="text-muted leading-relaxed">
          The Platform may allow an Event Organizer to sell before a payout-capable connected account exists. In that case the buyer&apos;s payment is charged to Bizzy&apos;s payment-processor platform balance. The organizer&apos;s share (face value minus any Promoter commission under Section 14 and minus the buyer-paid service fee, which Bizzy keeps) is recorded as payable to that organizer &mdash; a business on a business ledger, a personal host on a host ledger. The Host tab in the app describes this as Bizzy holding the organizer&apos;s ticket money until they connect payouts.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          When the organizer completes payout onboarding and the connected account can receive transfers, the Platform instructs the processor to transfer the recorded payable amount to that account. Until then, the product does not automatically refund, forfeit, or expire held amounts. There is no in-product deadline after which unclaimed proceeds change hands. Refunds of a held sale are paid from the held balance (Section 7.5).
        </p>

        {/* ── 8. Merchant Relationships & Disclaimers ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">8. Merchant Relationships &amp; Disclaimers</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">8.1 No Endorsement</h3>
        <p className="text-muted leading-relaxed">
          Bizzy does not endorse, verify, investigate, or guarantee the quality, safety, legality, accuracy, or reliability of any Merchant, Event Organizer, product, service, event, venue, or Deal or Ticket listed on the Platform. The presence of a listing on the Platform does not constitute a recommendation or endorsement by Bizzy.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">8.2 Merchant Independence</h3>
        <p className="text-muted leading-relaxed">
          Merchants and Event Organizers are independent third parties and are not employees, agents, joint venturers, or partners of Bizzy. Bizzy does not control the operations, business practices, pricing, or policies of any Merchant or Event Organizer.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">8.3 Merchant Disputes</h3>
        <p className="text-muted leading-relaxed">
          Any dispute arising from or related to a Deal, Ticket, product, service, or event must be resolved directly between you and the applicable Merchant or Event Organizer. Bizzy will not mediate, arbitrate, or otherwise intervene in disputes between Users and Merchants or Event Organizers, except as required by applicable law.
        </p>

        {/* ── 9. Payments, Billing & Subscriptions ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">9. Payments, Billing &amp; Subscriptions</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.1 Payment Processing</h3>
        <p className="text-muted leading-relaxed">
          Payments made through the Platform are processed by third-party payment processors, which may include Stripe, Apple Pay, Google Pay, Apple In-App Purchase, Google Play Billing, or other processors as designated by Bizzy. Bizzy does not directly collect, store, or process your payment card information. Your use of any third-party payment service is subject to that provider&#39;s own terms of service and privacy policy. Payment processors maintain PCI-DSS compliance for cardholder data; Bizzy disclaims liability for payment processor security incidents to the maximum extent permitted by law.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.2 Bizzy Premium Subscription: Auto-Renewal</h3>
        <p className="text-muted leading-relaxed">
          Bizzy Premium is offered as an auto-renewing subscription. When you subscribe:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Payment will be charged to your Apple ID, Google account, or other payment method at confirmation of purchase.</li>
          <li>Your subscription automatically renews for the same term unless auto-renew is turned off at least 24 hours before the end of the current period.</li>
          <li>Your account will be charged for renewal within 24 hours prior to the end of the current period at the renewal price disclosed at signup (or the then-current price, if changed with notice).</li>
          <li>You may manage your subscription and turn off auto-renew by going to your account settings on the Platform where applicable, or through your Apple Subscriptions or Google Play Subscriptions settings.</li>
          <li>No cancellation of the current subscription is allowed during an active subscription period; you will retain Premium access through the end of the paid period.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.3 Free Trials</h3>
        <p className="text-muted leading-relaxed">
          If you sign up for a free trial of Bizzy Premium, you will not be charged for the trial period. Unless you cancel at least 24 hours before the trial ends, your subscription will automatically convert to a paid subscription at the disclosed price, charged to the payment method on file. You may cancel during the trial through your Apple Subscriptions or Google Play Subscriptions settings; cancelling stops auto-renewal but does not refund any amount already charged.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.4 In-App Purchase Refunds</h3>
        <p className="text-muted leading-relaxed">
          For subscriptions purchased through the Apple App Store or Google Play, refund requests must be made directly to Apple or Google in accordance with their respective refund policies. Bizzy generally cannot directly refund in-app purchases. For subscriptions purchased outside of an app store, see Section 10.3.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.5 Pricing &amp; Price Changes</h3>
        <p className="text-muted leading-relaxed">
          All prices displayed on the Platform are in U.S. dollars unless otherwise indicated. Bizzy reserves the right to change pricing for subscriptions, Tickets, or any paid services at any time, provided that changes to subscription pricing will not apply until the next billing cycle following notice to you. Where required by Apple App Store or Google Play rules, an increased renewal price must be affirmatively consented to by you before it takes effect.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.6 Taxes</h3>
        <p className="text-muted leading-relaxed">
          You are responsible for paying any applicable taxes, including sales tax, use tax, or other governmental charges associated with your purchases on the Platform, unless Bizzy is legally required to collect and remit such taxes on your behalf. Where Bizzy is required to collect tax on a purchase (for example, as a marketplace facilitator under applicable state law), the applicable tax is calculated and shown as part of your itemized total before you confirm and pay. The taxability of Tickets, Skip the Line passes, admissions, and cover charges varies by jurisdiction.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.7 Promoter Payouts (Cross-Reference)</h3>
        <p className="text-muted leading-relaxed">
          Promoter Program payouts are governed by Section 14 and are subject to separate Stripe Connect onboarding, tax reporting, and clawback rules described therein.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.8 Seller Taxes &amp; Marketplace Facilitator Collection</h3>
        <p className="text-muted leading-relaxed">
          As between Bizzy and a Merchant or Event Organizer, the Merchant or Event Organizer is <strong>solely responsible</strong> for determining, charging, collecting, reporting, and remitting all sales, use, admission, amusement, excise, and other transaction taxes applicable to its Deals, Tickets, Skip the Line passes, and other sales made through the Platform, and for determining whether any such sale is taxable. Bizzy does not provide tax advice and does not determine the taxability of any Merchant or Event Organizer offering.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Where applicable law&mdash;including a state marketplace-facilitator statute&mdash;requires Bizzy to collect and remit tax on a facilitated sale, Bizzy will do so for those sales, and the Merchant or Event Organizer authorizes Bizzy to calculate, collect, add to the buyer&apos;s total, and remit such tax, and to report the associated transaction information to the relevant tax authority. Except where Bizzy is the legally required collector, the Merchant or Event Organizer will indemnify and hold Bizzy harmless from any taxes, interest, penalties, or costs assessed in connection with its sales. Each party will provide the other with information and documentation reasonably necessary to determine and satisfy applicable tax obligations.
        </p>

        {/* ── 10. Refund, Cancellation & Chargeback Policy ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">10. Refund, Cancellation &amp; Chargeback Policy</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.1 Deals</h3>
        <p className="text-muted leading-relaxed">
          All Deal redemptions are final. Bizzy does not issue refunds for Deals that have been redeemed or expired. If a Deal has not yet been redeemed and has not expired, refund eligibility will be evaluated on a case-by-case basis at Bizzy&#39;s sole discretion.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.2 Tickets</h3>
        <p className="text-muted leading-relaxed">
          Ticket refund policies are set by Event Organizers and communicated at the time of purchase. Unless otherwise stated, all Ticket sales are final. See Section 7.5 for additional details on event-related refunds.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.3 Subscriptions</h3>
        <p className="text-muted leading-relaxed">
          Subscription fees already billed are generally non-refundable. If you cancel a subscription, you will continue to have access to subscription benefits through the end of your current billing period. Refunds for in-app purchases are governed by Section 9.4.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.4 Refund-Triggered Promoter Clawback</h3>
        <p className="text-muted leading-relaxed">
          If a Ticket purchase associated with a Promoter referral is refunded for any reason (event cancellation, chargeback, fraud reversal, etc.), the corresponding Promoter commission will be clawed back as described in Section 14.7. Refunds to Users are not delayed by Promoter clawback processing.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.5 Chargebacks</h3>
        <p className="text-muted leading-relaxed">
          Filing a fraudulent or unwarranted chargeback with your bank or payment provider constitutes a violation of these Terms. If you initiate a chargeback, Bizzy reserves the right to immediately suspend or terminate your account, dispute the chargeback with the payment processor, and pursue recovery of the disputed amount, including any associated fees or costs.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          For Ticket, Skip the Line, and door sales, a chargeback is resolved against the connected account that received the proceeds or, if the sale is still held under Section 7.19, against that held balance (see Section 7.12). Bizzy may recover the disputed amount and associated fees from the applicable business, host, or User balance.
        </p>

        {/* ── 11. Savings & Pricing Disclaimer ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">11. Savings &amp; Pricing Disclaimer</h2>
        <p className="text-muted leading-relaxed">
          Any savings, discounts, or price comparisons displayed on the Platform are <strong>estimates only</strong> and are provided for informational purposes. Actual savings may vary due to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Applicable taxes, gratuities, or surcharges</li>
          <li>Merchant pricing changes or regional pricing differences</li>
          <li>Minimum purchase requirements or other Merchant-imposed conditions</li>
          <li>Tipping policies or service charges</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          Bizzy does not guarantee the accuracy of any savings calculations. Users should independently confirm pricing and deal details with the Merchant prior to redemption.
        </p>

        {/* ── 12. Age-Restricted Content (21+) ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">12. Age-Restricted Content (21+)</h2>
        <p className="text-muted leading-relaxed">
          Certain Deals and events listed on the Platform may involve the sale or consumption of alcohol or other age-restricted products or services. These listings will be clearly labeled as <strong>&quot;21+&quot;</strong> on the Platform.
        </p>
        <p className="text-muted leading-relaxed">
          By accessing or redeeming a 21+ Deal or purchasing a 21+ event Ticket, you represent and warrant that you are at least 21 years of age. Merchants and Event Organizers may require valid, government-issued photo identification to verify your age at the point of sale or event entry.
        </p>
        <p className="text-muted leading-relaxed">
          Bizzy and its affiliates do not directly serve, deliver, or supply alcohol. Bizzy is not liable for any User who misrepresents their age to access age-restricted content, for any Merchant&apos;s decision to serve or refuse service to any individual, or for any consequences (including under applicable dram-shop laws) arising from a Merchant&apos;s service of alcohol. Misrepresentation of age constitutes a material breach of these Terms.
        </p>

        {/* ── 13. User Conduct & Prohibited Activities ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">13. User Conduct &amp; Prohibited Activities</h2>
        <p className="text-muted leading-relaxed">You agree not to engage in any of the following activities in connection with the Platform:</p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Violating any applicable local, state, national, or international law or regulation</li>
          <li>Creating multiple accounts, fake accounts, or accounts with false information</li>
          <li>Sharing, selling, or transferring your account or account credentials</li>
          <li>Redeeming Deals or Tickets through fraudulent means, including the use of stolen payment methods</li>
          <li>Attempting to redeem a Deal or Ticket more than the number of times permitted</li>
          <li>Circumventing or attempting to circumvent deal claim limits, weekly redemption caps, ticket purchase limits, or other usage restrictions</li>
          <li>Using any automated software, bot, scraper, or agent to access the Platform or purchase Tickets (see Section 7.7)</li>
          <li>Manipulating leaderboard rankings, engagement metrics, or gamification features through automated means, fake activity, or coordinated abuse</li>
          <li>Manipulating, abusing, or exploiting referral programs, promotional offers, loyalty incentives, or Promoter commissions (including self-purchase via your own Promoter link, see Section 14.8)</li>
          <li>Harassing, threatening, or abusing Merchants, Event Organizers, other Users, Promoters, or Bizzy staff</li>
          <li>Uploading or transmitting malicious code, viruses, or other harmful technology</li>
          <li>Using bots, scrapers, crawlers, or other automated tools to access or extract data from the Platform</li>
          <li>Attempting to reverse-engineer, decompile, disassemble, or derive the source code of the Platform</li>
          <li>Interfering with or disrupting the integrity, performance, or security of the Platform</li>
          <li>Reselling, redistributing, or commercially exploiting Deals or Tickets in violation of these Terms</li>
          <li>Sending unsolicited commercial communications through the Platform&apos;s marketing tools, or using those tools in violation of the TCPA, CAN-SPAM Act, or other applicable law</li>
          <li>Impersonating any person, entity, or affiliation, or misrepresenting your identity, student status, or affiliation with Bizzy or any business</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          Violation of this section may result in immediate account suspension or termination, forfeiture of unused Deals, Tickets, or Promoter balances, reset of leaderboard rankings, and potential legal action.
        </p>

        {/* ── 14. Bizzy Promoter Program ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">14. Bizzy Promoter Program</h2>
        <p className="text-muted leading-relaxed">
          This Section 14 governs your participation in the Bizzy Promoter Program (the &quot;Promoter Program&quot;). It applies in addition to the rest of these Terms.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.1 Overview</h3>
        <p className="text-muted leading-relaxed">
          The Promoter Program enables eligible Users to share Event Organizer-issued tracking links and earn a commission for ticket sales attributed to those links, on terms set by the Event Organizer and capped by Bizzy. Each tracking link is associated with the issuing Event Organizer and an Event. Commissions are recorded against ticket purchases that are matched to a tracking link during the attribution window described in Section 14.6.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.2 Eligibility</h3>
        <p className="text-muted leading-relaxed">To enroll as a Promoter you must:</p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Be at least 18 years of age and a resident of the United States</li>
          <li>Have a valid, verified Bizzy account in good standing</li>
          <li>Complete onboarding with Bizzy&apos;s designated payment processor (Stripe Connect), including identity verification and provision of tax-reporting information (Form W-9 for U.S. persons)</li>
          <li>Maintain a valid U.S. bank account or other supported payout destination</li>
          <li>Comply with these Terms, including this Section 14 and Section 13</li>
          <li>Not be an employee, owner, immediate family member, or controlled affiliate of the Event Organizer whose link you are promoting (unless that Event Organizer specifically authorizes you in writing)</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.3 Independent Contractor Status</h3>
        <p className="text-muted leading-relaxed">
          You acknowledge and agree that:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>You are an <strong>independent contractor</strong> with respect to Bizzy and the Event Organizer. You are <strong>not</strong> an employee, partner, joint venturer, agent, or representative of Bizzy or any Event Organizer.</li>
          <li>No employment relationship is created by your participation. You are not eligible for any employee benefits, workers&apos; compensation, unemployment insurance, health insurance, or paid time off from Bizzy or any Event Organizer in connection with the Promoter Program.</li>
          <li>You are solely responsible for the payment of all taxes (federal, state, and local), withholdings, and similar obligations related to commissions you earn, and for compliance with all applicable tax laws.</li>
          <li>You set your own hours, choose your own promotional methods (subject to these Terms and applicable law), and bear your own expenses.</li>
          <li>You have no authority to bind, represent, or speak on behalf of Bizzy or any Event Organizer.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.4 Commission Terms</h3>
        <p className="text-muted leading-relaxed">
          The commission rate and structure for each tracking link is set by the issuing Event Organizer at the time the link is generated and is subject to Bizzy-imposed limits, including (without limitation) a maximum commission of 50% of the paid Ticket subtotal, applicability to paid Tickets only (no commission accrues on free Tickets), and a requirement that the Event Organizer have an active payout-capable connected account. The commission rate in effect at the time a tracking link is created is &quot;snapshotted&quot; to that link: a host&apos;s subsequent change to commission terms applies only to links created after the change and does not retroactively alter accrued commission on prior orders.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.5 Attribution &amp; Tracking</h3>
        <p className="text-muted leading-relaxed">
          When a User clicks a tracking link, Bizzy may store a short-lived attribution identifier in browser storage and/or on the Bizzy mobile application. The attribution window is <strong>twenty-four (24) hours</strong> from the click (or such other window as may be displayed in the Platform), and an attribution identifier is cleared earlier if (a) a different tracking link is clicked, (b) a successful purchase is completed and credited, or (c) the User clears their device storage. A Ticket purchase is credited to a Promoter only if the attribution identifier is present and valid at the time of purchase. Bizzy&apos;s attribution determinations are final.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.6 Payout Mechanics</h3>
        <p className="text-muted leading-relaxed">
          Pending commissions are tracked in your Promoter dashboard. Payouts are processed through Stripe Connect to your linked payout destination on a schedule disclosed in the Promoter dashboard. The current minimum available balance required to withdraw is <strong>US $20</strong>, or such other amount as the Promoter dashboard displays at the time of withdrawal. Bizzy may delay individual payouts pending fraud review, identity verification, or resolution of chargebacks. Currency, exchange rates, and any fees imposed by the payment processor are governed by the processor&apos;s terms.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.7 Clawback on Refund, Chargeback, or Fraud Reversal</h3>
        <p className="text-muted leading-relaxed">
          If a Ticket purchase for which a Promoter commission was accrued or paid is later refunded, charged back, or otherwise reversed for any reason, Bizzy will <strong>claw back</strong> the corresponding commission. Clawbacks are applied as follows:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Pending commission:</strong> Reduced from your pending balance; pending balance may go to zero.</li>
          <li><strong>Already-paid commission:</strong> Deducted from your pending balance, which may temporarily go negative. Future commissions offset the negative balance until clear.</li>
          <li><strong>Repeat or fraud-related reversals:</strong> May result in immediate termination of Promoter participation and forfeiture of any pending balance.</li>
        </ul>
        <p className="text-muted leading-relaxed">
          If your pending balance becomes negative and you cease participating in the Promoter Program, Bizzy reserves the right to invoice you for the unrecovered amount.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.8 Prohibited Promoter Conduct</h3>
        <p className="text-muted leading-relaxed">In addition to Section 13, Promoters specifically may not:</p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Purchase Tickets through their own tracking link, or through any account they control, or arrange for related parties (spouse, immediate family, roommates, etc.) to do so for the purpose of earning a commission</li>
          <li>Generate clicks or purchases through automated tools, bots, paid traffic schemes, or click fraud</li>
          <li>Misrepresent the event, pricing, terms, or any material fact in promotional content</li>
          <li>Use the Bizzy name, logo, marks, or any Event Organizer&apos;s name or marks in a manner that suggests endorsement by, agency for, or employment by Bizzy or the Event Organizer beyond the actual scope of the Promoter relationship</li>
          <li>Promote 21+ events to audiences known or reasonably believed to include persons under 21</li>
          <li>Send unsolicited commercial communications (spam) or violate the TCPA, CAN-SPAM Act, or other applicable communications laws in the course of promotion</li>
          <li>Run paid search, SEO, or display advertising bids on Bizzy&apos;s trademarks or branded keywords without prior written permission</li>
          <li>Distribute tracking links through gambling, adult, hate, or other content channels that violate the Event Organizer&apos;s or Bizzy&apos;s policies</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.9 Disclosure of Material Connection (FTC Endorsement Guides)</h3>
        <p className="text-muted leading-relaxed">
          As a Promoter, you are required to <strong>clearly and conspicuously disclose</strong> your material connection to the Event Organizer (i.e., that you may earn a commission) wherever you share a tracking link, in accordance with the U.S. Federal Trade Commission&apos;s Endorsement Guides (16 C.F.R. Part 255). On social media this typically means including a clear disclosure such as <em>#ad</em>, <em>#sponsored</em>, <em>&quot;Paid partnership&quot;</em>, or equivalent language at the start of the post (or in the first visible line of a video caption). Disclosures buried in long captions, behind &quot;more&quot; links, or inside hashtag swarms do not comply. Failure to disclose may result in termination from the Promoter Program and indemnification obligations under Section 23.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.10 Tax Reporting</h3>
        <p className="text-muted leading-relaxed">
          For U.S. Promoters, Bizzy (or Bizzy&apos;s payment processor) will issue an IRS Form 1099-NEC (or successor form) for any calendar year in which your total Promoter earnings paid out meet or exceed the then-current IRS reporting threshold ($600 as of the effective date). You are responsible for the accuracy of your tax-reporting information (including your Taxpayer Identification Number on Form W-9) and for the income tax consequences of all amounts you receive. Bizzy does not provide tax advice; consult a qualified professional.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.11 State-Specific Considerations</h3>
        <p className="text-muted leading-relaxed">
          Certain U.S. states (including California, Massachusetts, and New Jersey) apply a strict &quot;ABC test&quot; for independent contractor classification. Your participation in the Promoter Program is structured to satisfy applicable independent-contractor criteria, including your control over your own time, methods, and means of promotion, and the absence of any employee-style integration into the Event Organizer&apos;s or Bizzy&apos;s business. If you believe applicable law would require Bizzy or an Event Organizer to treat you as an employee, you must not participate in the Promoter Program and must notify us at {CONTACT_EMAIL} promptly. Bizzy reserves the right to suspend the Promoter Program (or terminate individual Promoter relationships) in any jurisdiction where doing so is necessary to comply with applicable classification law.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.12 Termination of Promoter Participation</h3>
        <p className="text-muted leading-relaxed">
          Bizzy may suspend or terminate your Promoter participation at any time, with or without cause, including for (a) violation of these Terms, (b) chargeback or refund rates above acceptable thresholds, (c) suspected fraud, (d) failure to maintain valid tax or payout information, or (e) at the request of the Event Organizer. Upon termination, no further commissions will accrue. Pending balance amounts are subject to clawback for refunds, chargebacks, or fraud reversals as described above. Bizzy may withhold any pending payout pending investigation of suspected fraud or breach.
        </p>

        {/* ── 15. Marketing Communications - Opt-In, Opt-Out, TCPA & CAN-SPAM ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">15. Marketing Communications: Opt-In, Opt-Out, TCPA &amp; CAN-SPAM</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.1 Categories of Communications</h3>
        <p className="text-muted leading-relaxed">
          Communications from the Platform fall into two categories:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Transactional / Service Communications:</strong> Account-related notices (security alerts, password resets, OTP verification codes), order and Ticket confirmations, event reminders for Tickets you have purchased, refund and dispute updates, and changes to these Terms or the Privacy Policy. You cannot opt out of transactional communications while maintaining an account, because they are necessary for the operation and security of your account.</li>
          <li><strong>Marketing / Promotional Communications:</strong> Deal recommendations, new event promotions, business or Event Organizer blasts, premium upsell offers, win-back campaigns, and other content sent for marketing purposes. Marketing communications are sent only to Users who have <strong>affirmatively opted in</strong> to receive them, by channel (SMS, email, push notification).</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.2 SMS Marketing Consent (TCPA)</h3>
        <p className="text-muted leading-relaxed">
          Marketing SMS messages from Bizzy or any business operating on the Platform are sent only after you opt in at checkout or in settings. On ticket checkout in the app, and on some web checkouts, the marketing SMS box is <strong>presented already selected</strong>. You may uncheck it. Completing the purchase with the box selected records SMS marketing consent for that Event Organizer. Completing the purchase with the box unchecked still completes the sale and does not enable that SMS. By leaving the box selected (or later enabling SMS for a business), you agree:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>To receive recurring marketing SMS messages from Bizzy and from businesses you have followed or otherwise opted in to receive messages from</li>
          <li>That message frequency varies; typical frequency is up to several messages per week per opted-in sender</li>
          <li>That message and data rates may apply, and Bizzy is not responsible for charges imposed by your wireless carrier</li>
          <li>That consent is <strong>not a condition of any purchase</strong> on the Platform</li>
          <li>That messages may be sent using an automatic telephone dialing system (ATDS) or pre-recorded voice or text-equivalent technology</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.3 SMS Opt-Out and Help</h3>
        <p className="text-muted leading-relaxed">
          You may opt out of marketing SMS messages at any time by replying <strong>STOP</strong>, <strong>STOPALL</strong>, <strong>UNSUBSCRIBE</strong>, <strong>CANCEL</strong>, <strong>END</strong>, <strong>QUIT</strong>, <strong>OPTOUT</strong>, or <strong>REVOKE</strong>&mdash;or a plain-language equivalent such as &quot;stop texting me&quot; or &quot;remove me&quot;&mdash;to any marketing SMS, or by toggling SMS off in your account notification settings. You will receive a single confirmation message and no further marketing SMS from the sender from which you opted out. You may re-subscribe by replying <strong>START</strong>. Reply <strong>HELP</strong> to any Bizzy SMS for help, or contact us at {CONTACT_EMAIL}. Opting out of marketing SMS does not opt you out of transactional or security SMS (including OTP and purchase-verification codes), which are necessary for account and order operation.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.4 Quiet Hours &amp; Timing</h3>
        <p className="text-muted leading-relaxed">
          Bizzy schedules marketing SMS sends to fall within applicable telemarketing time-of-day rules (generally 8:00 a.m. to 9:00 p.m. recipient&apos;s local time). Transactional messages (e.g., OTP codes, event reminders for Tickets you hold) may be sent at any time.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.5 Email Marketing (CAN-SPAM)</h3>
        <p className="text-muted leading-relaxed">
          Marketing emails from Bizzy or any business operating on the Platform comply with the CAN-SPAM Act of 2003 (15 U.S.C. § 7701 et seq.). Every marketing email includes (a) accurate header and routing information, (b) a non-deceptive subject line, (c) clear identification of the email as an advertisement (where required), (d) a valid physical postal address for the sender, and (e) a clear and conspicuous unsubscribe mechanism that operates within the timeframe required by law (no later than 10 business days from your request) and at no cost to you. Marketing emails to bulk email providers also support the List-Unsubscribe-Post header (RFC 8058) to enable one-click unsubscribe. You may also opt out by emailing {CONTACT_EMAIL} with the subject line &quot;Unsubscribe.&quot;
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.6 Push Notifications</h3>
        <p className="text-muted leading-relaxed">
          Push notifications are controlled at the operating system level by your device (iOS or Android). You may grant or revoke push notification permission at any time through your device settings, and you may toggle individual notification categories on or off within the Bizzy app. Disabling push notifications does not delete your account or change other communication preferences.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">15.7 Recordkeeping</h3>
        <p className="text-muted leading-relaxed">
          Bizzy maintains records of your opt-in and opt-out actions for compliance purposes. You may request a copy of your consent record by contacting {CONTACT_EMAIL}.
        </p>

        {/* ── 16. Business-Sent Communications & Following ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">16. Business-Sent Communications &amp; Following</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">16.1 Following a Business</h3>
        <p className="text-muted leading-relaxed">
          The Platform allows you to &quot;follow&quot; Merchants, Event Organizers, and venues. Following a business enables it to send you marketing communications through the Platform&apos;s tools, subject to the channel-level opt-in rules in Section 15. You may unfollow a business at any time through your account settings; unfollowing stops further marketing communications from that business but does not retroactively delete past communications you have received.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">16.2 Following Through a Ticket Purchase</h3>
        <p className="text-muted leading-relaxed">
          When you purchase a Ticket, the Platform adds you to the Event Organizer&apos;s follower list. Following enables the Event Organizer to send you (a) transactional event communications related to your Ticket (e.g., event reminders, schedule changes, day-of logistics) and (b) that business&apos;s announcements through the channels you have enabled, subject to the channel-level rules in Section 15. You control these communications: you can adjust per-business notification preferences, mute an individual business, apply a global marketing mute, or unfollow the business at any time in your account settings. Marketing SMS remains subject to the consent and opt-out rules in Sections 15.2&ndash;15.3. Transactional event communications related to the specific Ticket you hold may continue until the event has concluded.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">16.3 Business as Sender; Bizzy as Platform</h3>
        <p className="text-muted leading-relaxed">
          Where a Merchant or Event Organizer uses the Platform&apos;s marketing tools to send a communication, the business is the <strong>sender</strong> of the communication and is responsible for its content, accuracy, and compliance with applicable law. Bizzy facilitates the technology, applies sender identification and consent gating, and provides opt-out mechanisms. Bizzy does not pre-approve or guarantee the content of business-sent communications and is not liable for the actions or omissions of any business in sending communications, except to the extent required by applicable law.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">16.4 Sender Identification</h3>
        <p className="text-muted leading-relaxed">
          Bizzy requires that business-sent SMS and email clearly identify the originating business (and, where required by carrier or regulatory rules, also identify Bizzy as the platform). For SMS, Bizzy uses U.S. carrier-registered 10-digit long codes (10DLC) or short codes registered with the carriers&apos; campaign registry framework for application-to-person (A2P) messaging.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">16.5 Content Policies</h3>
        <p className="text-muted leading-relaxed">
          Bizzy prohibits businesses from sending communications through the Platform that promote unlawful conduct, gambling, adult content, controlled substances, hate speech, or other categories that violate the Platform&apos;s policies, applicable law, or carrier acceptable use policies. Bizzy reserves the right to filter, throttle, suspend, or refuse to deliver any business-sent communication that violates these policies, and to terminate the business&apos;s access to messaging tools.
        </p>

        {/* ── 17. Tracking, Attribution & Cookies ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">17. Tracking, Attribution &amp; Cookies</h2>
        <p className="text-muted leading-relaxed">
          The Platform uses cookies, mobile-app local storage, and similar technologies to operate the Platform, remember preferences, attribute Promoter referrals (see Section 14.5), analyze usage, and (where you have opted in) personalize marketing. The Platform also receives device identifiers and limited diagnostic information from Apple and Google operating-system frameworks. Details of the categories of data collected and your choices are described in the <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>. You can clear your browser or app storage at any time through your device settings; doing so may reset attribution, preferences, and session state.
        </p>

        {/* ── 18. Intellectual Property ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">18. Intellectual Property</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">18.1 Bizzy&#39;s Intellectual Property</h3>
        <p className="text-muted leading-relaxed">
          The Platform, including all software, code, design, text, graphics, logos, trademarks, service marks, trade names, icons, images, audio, video, data compilations, page layout, underlying code, and software, is the exclusive property of Bizzy Holdings LLC and/or its licensors and is protected by U.S. and international copyright, trademark, patent, and other intellectual property laws.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">18.2 Limited License</h3>
        <p className="text-muted leading-relaxed">
          Subject to your compliance with these Terms, Bizzy grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for your personal, non-commercial use (and, if applicable, your Promoter Program activities authorized under Section 14). This license does not include the right to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Copy, modify, adapt, translate, or create derivative works of the Platform or its content</li>
          <li>Distribute, license, sublicense, sell, rent, or lease any portion of the Platform</li>
          <li>Use the Platform for any commercial purpose without Bizzy&#39;s prior written consent</li>
          <li>Remove, alter, or obscure any proprietary notices on the Platform</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">18.3 Trademarks</h3>
        <p className="text-muted leading-relaxed">
          &quot;Bizzy,&quot; &quot;BizzyU,&quot; the Bizzy logo, and all related names, logos, product and service names, designs, and slogans are trademarks of Bizzy Holdings LLC. You may not use these marks without the prior written permission of Bizzy Holdings LLC, except for fair-use references that comply with applicable trademark law and (in the case of Promoters) the limited authorization described in Section 14.
        </p>

        {/* ── 19. User-Generated Content ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">19. User-Generated Content</h2>
        <p className="text-muted leading-relaxed">
          If the Platform allows you to submit, post, or share content (including reviews, ratings, comments, photos, or other materials, collectively, &quot;User Content&quot;), the following terms apply:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Ownership:</strong> You retain ownership of your User Content. However, by submitting User Content, you grant Bizzy a worldwide, non-exclusive, royalty-free, perpetual, irrevocable, sublicensable, and transferable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such User Content in connection with the Platform and Bizzy&#39;s business operations.</li>
          <li><strong>Representations:</strong> You represent and warrant that you own or have the necessary rights to submit your User Content, and that your User Content does not infringe the intellectual property or other rights of any third party.</li>
          <li><strong>Prohibited Content:</strong> User Content must not contain material that is defamatory, obscene, harassing, threatening, invasive of privacy, or otherwise objectionable. Bizzy reserves the right to remove any User Content at its sole discretion.</li>
        </ul>

        {/* ── 20. Third-Party Services & Links ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">20. Third-Party Services &amp; Links</h2>
        <p className="text-muted leading-relaxed">
          The Platform may integrate with, link to, or rely on third-party services, including but not limited to payment processors (e.g., Stripe, Apple Pay, Google Pay, Apple In-App Purchase, Google Play Billing), subscription management (e.g., RevenueCat), email delivery providers, SMS aggregators (subject to U.S. carrier 10DLC registration), mapping services (e.g., Google Maps, Apple Maps), wallet providers (Apple Wallet, Google Wallet), push notification providers, analytics services, and social media platforms.
        </p>
        <p className="text-muted leading-relaxed">
          Bizzy does not control, endorse, or assume responsibility for the availability, accuracy, content, privacy practices, or security of any third-party service. Your use of third-party services is at your own risk and subject to the applicable third party&#39;s terms and policies. Bizzy is not a party to and assumes no liability for any transactions, interactions, or disputes between you and any third-party service provider.
        </p>

        {/* ── 21. Disclaimer of Warranties ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">21. Disclaimer of Warranties</h2>
        <p className="text-muted leading-relaxed uppercase text-sm">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE PLATFORM AND ALL SERVICES, CONTENT, DEALS, TICKETS, COMMUNICATIONS, PROMOTER PROGRAM FEATURES, AND MATERIALS AVAILABLE THROUGH THE PLATFORM ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
        </p>
        <p className="text-muted leading-relaxed uppercase text-sm">
          BIZZY SPECIFICALLY DISCLAIMS ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT, AND ALL WARRANTIES ARISING FROM COURSE OF DEALING, USAGE, OR TRADE PRACTICE.
        </p>
        <p className="text-muted leading-relaxed uppercase text-sm">
          WITHOUT LIMITING THE FOREGOING, BIZZY MAKES NO WARRANTY OR REPRESENTATION THAT: (A) THE PLATFORM WILL MEET YOUR REQUIREMENTS; (B) THE PLATFORM WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; (C) THE RESULTS OBTAINED FROM USE OF THE PLATFORM WILL BE ACCURATE OR RELIABLE; (D) ANY DEALS OR TICKETS WILL BE HONORED BY MERCHANTS OR EVENT ORGANIZERS; (E) ANY ERRORS IN THE PLATFORM WILL BE CORRECTED; (F) LOCATION DATA, DISTANCE CALCULATIONS, OR PLACE INFORMATION WILL BE ACCURATE; (G) LEADERBOARD RANKINGS OR ENGAGEMENT METRICS WILL BE FREE FROM ERROR; OR (H) ANY PROMOTER COMMISSION ATTRIBUTION OR PAYOUT WILL BE FREE FROM ERROR OR REVERSAL.
        </p>

        {/* ── 22. Limitation of Liability ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">22. Limitation of Liability</h2>
        <p className="text-muted leading-relaxed uppercase text-sm">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL BIZZY, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, LICENSORS, OR SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Your use of or inability to use the Platform</li>
          <li>Any Deal or Ticket that is not honored, modified, or cancelled</li>
          <li>Unauthorized access to or alteration of your account or data</li>
          <li>Statements, conduct, or content of any third party on the Platform, including any Merchant, Event Organizer, Promoter, or other User</li>
          <li>Personal injury, property damage, or any other harm arising from your attendance at an event or redemption of a Deal</li>
          <li>Inaccuracies in location data, distance calculations, or place information displayed on the Platform</li>
          <li>Errors in leaderboard rankings or engagement metrics</li>
          <li>Delays, holds, or failures in payment processing or payout disbursement (including Promoter payouts)</li>
          <li>Communications sent by a Merchant, Event Organizer, or Promoter through the Platform&apos;s tools</li>
          <li>Any other matter relating to the Platform</li>
        </ul>
        <p className="text-muted leading-relaxed uppercase text-sm mt-3">
          IN NO EVENT SHALL BIZZY&#39;S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM EXCEED THE GREATER OF: (A) THE AMOUNTS YOU HAVE PAID TO BIZZY IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (B) ONE HUNDRED U.S. DOLLARS ($100.00).
        </p>
        <p className="text-muted leading-relaxed uppercase text-sm">
          THE LIMITATIONS IN THIS SECTION APPLY REGARDLESS OF THE THEORY OF LIABILITY, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, AND REGARDLESS OF WHETHER BIZZY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES, SO SOME OF THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.
        </p>

        {/* ── 23. Indemnification ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">23. Indemnification</h2>
        <p className="text-muted leading-relaxed">
          You agree to indemnify, defend, and hold harmless Bizzy, its parent companies, subsidiaries, affiliates, and each of their respective officers, directors, employees, agents, licensors, and service providers (collectively, the &quot;Bizzy Parties&quot;) from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys&#39; fees) arising from or relating to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Your use of the Platform</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any applicable law, regulation, or third-party right, including the TCPA, CAN-SPAM Act, BOTS Act, FTC Endorsement Guides, and applicable state consumer-protection laws</li>
          <li>Any dispute between you and a Merchant, Event Organizer, Promoter, or other User</li>
          <li>Your User Content</li>
          <li>Your participation in the Promoter Program, including any promotional content you create or distribute</li>
          <li>Your negligence or willful misconduct</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          Bizzy reserves the right, at your expense, to assume the exclusive defense and control of any matter for which you are required to indemnify us, and you agree to cooperate with our defense of such claims.
        </p>

        {/* ── 24. Dispute Resolution & Arbitration ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">24. Dispute Resolution &amp; Arbitration</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">24.1 Informal Resolution</h3>
        <p className="text-muted leading-relaxed">
          Before initiating any formal dispute resolution proceeding, you agree to first contact Bizzy at <strong>{CONTACT_EMAIL}</strong> and attempt to resolve the dispute informally for a period of at least <strong>thirty (30) days</strong>. Most disputes can be resolved without formal proceedings.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">24.2 Binding Arbitration</h3>
        <p className="text-muted leading-relaxed">
          If informal resolution is unsuccessful, any dispute, controversy, or claim arising out of or relating to these Terms, or the breach, termination, enforcement, interpretation, or validity thereof, shall be determined by <strong>binding arbitration</strong> administered by the American Arbitration Association (&quot;AAA&quot;) in accordance with its Consumer Arbitration Rules then in effect, except as modified by these Terms.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">24.3 Arbitration Procedures</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Location:</strong> Arbitration shall take place in the State of Florida, or at another mutually agreed location, or via telephone or video conference if permitted by the AAA rules.</li>
          <li><strong>Language:</strong> English.</li>
          <li><strong>Arbitrator:</strong> The arbitration shall be conducted by a single arbitrator selected in accordance with AAA rules.</li>
          <li><strong>Judgment:</strong> The arbitrator&#39;s decision shall be final and binding, and judgment on the award may be entered in any court of competent jurisdiction.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">24.4 Exceptions to Arbitration</h3>
        <p className="text-muted leading-relaxed">
          Either party may seek injunctive or equitable relief in a court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of intellectual property rights. Claims eligible for small claims court may also be brought in small claims court in lieu of arbitration.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">24.5 30-Day Right to Opt Out of Arbitration</h3>
        <p className="text-muted leading-relaxed">
          You may opt out of the arbitration agreement in this Section 24 by sending written notice to {CONTACT_EMAIL} with the subject line &quot;Arbitration Opt-Out&quot; within thirty (30) days of first accepting these Terms. Your notice must include your full name, the email address associated with your account, and a clear statement that you are opting out. Opting out does not affect any other provision of these Terms.
        </p>

        {/* ── 25. Class Action & Jury Trial Waiver ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">25. Class Action &amp; Jury Trial Waiver</h2>
        <p className="text-muted leading-relaxed font-semibold">
          YOU AND BIZZY AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, REPRESENTATIVE, OR CONSOLIDATED ACTION.
        </p>
        <p className="text-muted leading-relaxed font-semibold">
          YOU AND BIZZY WAIVE ANY RIGHT TO A JURY TRIAL FOR ANY DISPUTE ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          If this class action waiver is found to be unenforceable, then the entirety of the arbitration agreement in Section 24 shall be null and void as to the affected claims only, and the dispute shall proceed in a court of competent jurisdiction.
        </p>

        {/* ── 26. Governing Law & Jurisdiction ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">26. Governing Law &amp; Jurisdiction</h2>
        <p className="text-muted leading-relaxed">
          These Terms shall be governed by and construed in accordance with the laws of the <strong>State of Florida</strong>, without regard to its conflict-of-laws principles. To the extent that any lawsuit or court proceeding is permitted under these Terms, you and Bizzy agree to submit to the exclusive personal jurisdiction of the state and federal courts located in the State of Florida for the purpose of litigating any such dispute.
        </p>

        {/* ── 27. Termination & Suspension ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">27. Termination &amp; Suspension</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">27.1 Termination by You</h3>
        <p className="text-muted leading-relaxed">
          You may terminate your account at any time by contacting us at {CONTACT_EMAIL} or through the account settings in the app. Upon termination, your right to access the Platform will cease immediately. Any unused Deals or Tickets in your account at the time of termination will be forfeited and are non-refundable, except as required by applicable law. Your leaderboard rankings and claim history will be removed. Pending Promoter balances may be paid out at Bizzy&apos;s discretion subject to the clawback and verification rules in Section 14.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">27.2 Termination or Suspension by Bizzy</h3>
        <p className="text-muted leading-relaxed">
          Bizzy reserves the right to suspend or terminate your account, in whole or in part, at any time and for any reason, including but not limited to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Violation of these Terms</li>
          <li>Suspected fraudulent, abusive, or illegal activity</li>
          <li>Circumvention of deal claim limits, ticket purchase limits, or manipulation of leaderboard rankings</li>
          <li>Excessive chargebacks, refund requests, or fraud-reversal triggers</li>
          <li>Violation of marketing communications law (TCPA, CAN-SPAM, etc.) in connection with Promoter activity</li>
          <li>Failure to pay applicable fees</li>
          <li>Extended periods of inactivity</li>
          <li>A request by law enforcement or a government agency</li>
          <li>Discontinuance or material modification of the Platform</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          Bizzy will make reasonable efforts to notify you of suspension or termination, except where doing so would compromise an investigation or would be impractical.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">27.3 Effect of Termination</h3>
        <p className="text-muted leading-relaxed">
          Upon termination, Sections 14 (Promoter Program, solely for purposes of clawback and tax reporting), 15 (Marketing Communications, solely for purposes of post-account communications and recordkeeping), 18, 19, 21, 22, 23, 24, 25, 26, 31, 33, and any other provisions that by their nature should survive, shall survive termination.
        </p>

        {/* ── 28. Service Availability & Modifications ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">28. Service Availability &amp; Modifications</h2>
        <p className="text-muted leading-relaxed">
          Bizzy reserves the right to modify, suspend, or discontinue any feature, functionality, Deal, Ticket listing, Promoter Program element, communication tool, or the entirety of the Platform at any time, with or without notice. Bizzy shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Platform or any part thereof.
        </p>
        <p className="text-muted leading-relaxed">
          Bizzy is not obligated to provide ongoing support, maintenance, or updates for any feature or service, and the availability of any feature does not create an obligation for Bizzy to continue offering that feature in the future.
        </p>

        {/* ── 29. Force Majeure ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">29. Force Majeure</h2>
        <p className="text-muted leading-relaxed">
          Bizzy shall not be liable for any failure or delay in performance of its obligations under these Terms arising from events beyond Bizzy&#39;s reasonable control, including but not limited to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Natural disasters (earthquakes, hurricanes, floods, etc.)</li>
          <li>Pandemics, epidemics, or public health emergencies</li>
          <li>Cyberattacks, hacking, or distributed denial-of-service attacks</li>
          <li>Government actions, sanctions, embargoes, or regulatory changes</li>
          <li>Internet, telecommunications, carrier, or infrastructure outages</li>
          <li>War, terrorism, civil unrest, or acts of God</li>
          <li>Labor strikes or work stoppages</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          During a force majeure event, Bizzy may suspend affected operations and will resume performance as soon as reasonably practicable after the event concludes.
        </p>

        {/* ── 30. Privacy & Data Practices ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">30. Privacy &amp; Data Practices</h2>
        <p className="text-muted leading-relaxed">
          Your use of the Platform is also governed by our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, which describes how we collect, use, store, and share your personal information. By using the Platform, you consent to the collection and processing of your data as described in the Privacy Policy.
        </p>
        <p className="text-muted leading-relaxed">
          Bizzy implements commercially reasonable security measures to protect your data. However, no method of electronic storage or transmission is 100% secure, and Bizzy cannot guarantee the absolute security of your information. Bizzy is not liable for unauthorized access to or disclosure of your data resulting from circumstances beyond our reasonable control, including third-party data breaches affecting service providers we use.
        </p>

        {/* ── 31. State-Specific Disclosures ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">31. State-Specific Disclosures</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">31.1 California Residents</h3>
        <p className="text-muted leading-relaxed">
          <strong>California Consumer Privacy Act (CCPA / CPRA).</strong> California residents have certain rights with respect to their personal information, including the right to know what personal information we collect, the right to request deletion, the right to correct inaccurate information, the right to opt out of the &quot;sale&quot; or &quot;sharing&quot; of personal information, and the right to limit the use of sensitive personal information. Bizzy does not sell personal information for monetary consideration. For details and to exercise your rights, see our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> or contact {CONTACT_EMAIL}.
        </p>
        <p className="text-muted leading-relaxed">
          <strong>California Civil Code § 1789.3.</strong> Under California Civil Code Section 1789.3, California users are entitled to the following consumer rights notice: If you have a question or complaint regarding the Platform, please contact us at {CONTACT_EMAIL}. California residents may reach the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs by mail at 1625 North Market Blvd., Suite N 112, Sacramento, CA 95834, or by telephone at (800) 952-5210.
        </p>
        <p className="text-muted leading-relaxed">
          <strong>California &quot;Shine the Light&quot; Law (Cal. Civ. Code § 1798.83).</strong> California residents may request information about the disclosure of their personal information to third parties for the third parties&apos; direct marketing purposes by emailing {CONTACT_EMAIL} with the subject line &quot;Shine the Light Request.&quot;
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">31.2 Virginia, Colorado, Connecticut, Utah, and Other State Privacy Laws</h3>
        <p className="text-muted leading-relaxed">
          Residents of Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), and other states with comprehensive consumer privacy laws may have rights to access, correct, delete, port, and opt out of targeted advertising or the sale of personal data. To exercise these rights, see our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> or contact {CONTACT_EMAIL}.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">31.3 New York Stop Hacks and Improve Electronic Data Security Act (SHIELD)</h3>
        <p className="text-muted leading-relaxed">
          For New York residents, Bizzy maintains a security program reasonably designed to protect the security, confidentiality, and integrity of personal information collected from New York residents, consistent with the New York SHIELD Act.
        </p>

        {/* ── 32. Accessibility ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">32. Accessibility</h2>
        <p className="text-muted leading-relaxed">
          Bizzy is committed to making the Platform reasonably accessible to Users with disabilities. We aim to conform with Web Content Accessibility Guidelines (WCAG) 2.2 Level AA principles where commercially practicable. If you encounter an accessibility barrier while using the Platform, please contact us at {CONTACT_EMAIL} with a description of the barrier and the specific feature or page affected, and we will make reasonable efforts to address the issue.
        </p>

        {/* ── 33. DMCA & Copyright Complaints ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">33. DMCA &amp; Copyright Complaints</h2>
        <p className="text-muted leading-relaxed">
          If you believe that content on the Platform infringes your copyright, you may submit a notice under the Digital Millennium Copyright Act (&quot;DMCA&quot;) to our Designated Copyright Agent:
        </p>
        <p className="text-muted leading-relaxed">
          <strong>Designated Agent:</strong> DMCA Agent, Bizzy Holdings LLC<br />
          <strong>Organization:</strong> Bizzy Holdings LLC<br />
          <strong>Address:</strong> 3302 Weston Manor Drive, Alva, FL 33920, United States<br />
          <strong>Phone:</strong> (331) 444-3077<br />
          <strong>Email:</strong>{" "}
          <a href="mailto:Contact@BizzyU.com" className="text-primary hover:underline">Contact@BizzyU.com</a><br />
          <strong>Subject Line:</strong> DMCA Takedown Notice
        </p>
        <p className="text-muted leading-relaxed text-sm">
          Bizzy&apos;s Designated Agent is registered with the United States Copyright Office. The current registration may be verified in the U.S. Copyright Office&apos;s DMCA Designated Agent Directory:{" "}
          <a href="https://www.copyright.gov/dmca-directory/" className="text-primary hover:underline">https://www.copyright.gov/dmca-directory/</a>.
        </p>
        <p className="text-muted leading-relaxed">
          Your notice must include: (a) a physical or electronic signature of the owner or authorized agent; (b) a description of the copyrighted work claimed to be infringed; (c) identification of the allegedly infringing material and its location on the Platform; (d) your contact information; (e) a statement that you have a good-faith belief that the use is not authorized; and (f) a statement under penalty of perjury that the information in the notice is accurate and that you are the copyright owner or authorized to act on their behalf. Bizzy will respond to properly submitted DMCA notices in accordance with applicable law and will, in appropriate circumstances, terminate the accounts of repeat infringers.
        </p>

        {/* ── 34. Electronic Communications Consent (E-SIGN) ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">34. Electronic Communications Consent (E-SIGN Act)</h2>
        <p className="text-muted leading-relaxed">
          By creating an account or using the Platform, you consent under the federal Electronic Signatures in Global and National Commerce Act (15 U.S.C. § 7001 et seq.) and similar state laws (collectively, the &quot;E-SIGN Act&quot;) to receive electronic communications from Bizzy, including via email, push notification, SMS, or in-app message. You agree that all agreements, notices, disclosures, and other communications that Bizzy provides to you electronically satisfy any legal requirement that such communications be in writing.
        </p>
        <p className="text-muted leading-relaxed">
          To access and retain electronic communications, you must have: (a) a device capable of accessing the internet, (b) a current web browser or mobile app version, (c) a valid email address, and (d) sufficient storage to retain copies of communications. You may withdraw E-SIGN consent at any time by closing your account, but doing so will terminate your ability to use the Platform.
        </p>

        {/* ── 35. Severability ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">35. Severability</h2>
        <p className="text-muted leading-relaxed">
          If any provision of these Terms is held by a court or arbitrator of competent jurisdiction to be invalid, illegal, or unenforceable for any reason, that provision shall be modified to the minimum extent necessary to make it enforceable, or if modification is not possible, shall be severed from these Terms. The remaining provisions shall continue in full force and effect.
        </p>

        {/* ── 36. No Waiver ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">36. No Waiver</h2>
        <p className="text-muted leading-relaxed">
          The failure of Bizzy to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. No waiver of any provision shall be deemed a further or continuing waiver of such provision or any other provision. Any waiver must be in writing and signed by an authorized representative of Bizzy to be effective.
        </p>

        {/* ── 37. Assignment ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">37. Assignment</h2>
        <p className="text-muted leading-relaxed">
          You may not assign or transfer these Terms, or any rights or obligations hereunder, without the prior written consent of Bizzy. Bizzy may freely assign or transfer these Terms, including in connection with a merger, acquisition, corporate reorganization, or sale of all or substantially all of its assets, without restriction and without notice to you.
        </p>

        {/* ── 38. Entire Agreement ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">38. Entire Agreement</h2>
        <p className="text-muted leading-relaxed">
          These Terms, together with the Privacy Policy and any other agreements or policies expressly incorporated by reference, constitute the entire agreement between you and Bizzy regarding the Platform and supersede all prior and contemporaneous agreements, proposals, representations, and understandings, whether oral or written, relating to the subject matter hereof.
        </p>

        {/* ── 39. Changes to These Terms ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">39. Changes to These Terms</h2>
        <p className="text-muted leading-relaxed">
          Bizzy reserves the right to modify, amend, or replace these Terms at any time at our sole discretion. When we make material changes, we will update the &quot;Effective Date&quot; at the top of this page and may notify you through the Platform, via email, or by other reasonable means.
        </p>
        <p className="text-muted leading-relaxed">
          Your continued use of the Platform after the effective date of any revised Terms constitutes your acceptance of those changes. If you do not agree to the revised Terms, you must stop using the Platform and close your account.
        </p>
        <p className="text-muted leading-relaxed">
          We encourage you to review these Terms periodically to stay informed of any updates.
        </p>

        {/* ── 40. Revision History ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">40. Revision History</h2>
        <p className="text-muted leading-relaxed">
          This section lists material revisions to these Terms. Non-material changes (typographical corrections, formatting, or clarifications that do not alter your rights) may be made without notation.
        </p>
        <ul className="text-muted space-y-2 list-disc pl-6">
          <li><strong>v1.3 &mdash; August 24, 2026:</strong> Aligned these Terms with the live product: personal hosts and Weekly Cover / door-access passes (Sections 3.2, 7.16A); renamed line-skip passes to Skip the Line passes (Section 7.16); national / third-party offers (Section 6.8); surge pricing as current-price-only at checkout (Section 7.4); refunds from held platform balances (Section 7.5); publish-without-per-event-review (Section 7.9); payouts before Connect and merchant-of-record split (Sections 7.12, 7.19, 10.5); $20 promoter withdrawal floor (Section 14.6); and the pre-selected marketing SMS checkbox on checkout (Section 15.2).</li>
          <li><strong>v1.2 &mdash; July 14, 2026:</strong> Added the business dashboard and AI support assistant disclaimer (Section 3.8); disclosed the buyer-borne service fee, the configurable platform fee, and its itemized all-in disclosure at checkout (Section 7.4); added refund transfer-reversal mechanics (Section 7.5); clarified attendee exposure to businesses (Section 7.11); clarified per-venue connected accounts, merchant of record, and chargeback allocation (Sections 7.12, 10.5); added door-code access and Door Code Operator terms (Section 7.14), recurring events (Section 7.15), line-skip pass terms (Section 7.16), promotional and universal codes (Section 7.17), and guest-checkout SMS verification (Sections 7.18, 5.1); added START re-subscribe and plain-language opt-out equivalents for marketing SMS (Section 15.3); reconciled following through a Ticket purchase to reflect that a purchase follows the business and can send its announcements through the channels you enable (Section 16.2); and clarified seller tax responsibility, indemnity, and marketplace-facilitator tax collection (Sections 9.6, 9.8).</li>
          <li><strong>v1.1 &mdash; May 17, 2026:</strong> Added OPTOUT and REVOKE to the list of recognized SMS opt-out keywords (Section 16); updated accessibility commitment from WCAG 2.1 to WCAG 2.2 Level AA (Section 32); clarified Designated Copyright Agent contact and added reference to the U.S. Copyright Office DMCA Directory (Section 33); added this Revision History section.</li>
          <li><strong>v1.0 &mdash; May 12, 2026:</strong> Initial publication of these Terms, including the Promoter Program, marketing communications and TCPA/CAN-SPAM provisions, Apple Wallet integration, and state-specific privacy and consumer protection notices.</li>
        </ul>

        {/* ── 41. Contact Information ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">41. Contact Information</h2>
        <p className="text-muted leading-relaxed">
          If you have questions, concerns, or feedback about these Terms, please contact us:
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
      </div>
    </SectionContainer>
  );
}
