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
          <strong>Effective Date:</strong> March 15, 2026 | <strong>Last Updated:</strong> March 22, 2026
        </p>

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
                <td className="border border-gray-300 px-4 py-3">Operates the deals and voucher services, manages merchant deal relationships, and administers user subscriptions related to deal access.</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3"><strong>Bizzy Ticketing LLC</strong></td>
                <td className="border border-gray-300 px-4 py-3">Operates all ticketing and event access services, including ticket sales, event listing management, admission verification, and event-related customer support.</td>
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
          Bizzy provides a technology platform that connects college students and eligible users with local merchants, venues, and event organizers. The Platform offers the following categories of services:
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.1 Bizzy Deals</h3>
        <p className="text-muted leading-relaxed">
          A marketplace where participating merchants (&quot;Merchants&quot;) list exclusive vouchers, discounts, special offers, and promotions for products, services, or experiences (&quot;Deals&quot;). Deals are created, managed, and fulfilled entirely by Merchants. Bizzy acts solely as an intermediary platform facilitating the connection between Users and Merchants.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.2 Bizzy Ticketing</h3>
        <p className="text-muted leading-relaxed">
          A ticketing service where event organizers, venues, and promoters (&quot;Event Organizers&quot;) list events and sell tickets, passes, or reservations (&quot;Tickets&quot;) to Users through the Platform. Bizzy Ticketing LLC facilitates ticket distribution, admission verification (including QR-code-based entry), and event-related communications. Event Organizers are solely responsible for the events themselves, including event execution, venue safety, and the accuracy of event details.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.3 Leaderboard &amp; Engagement Features</h3>
        <p className="text-muted leading-relaxed">
          The Platform may include gamification features such as leaderboards, rankings, achievement badges, and activity-based rewards that track and display User engagement with deals and events. Leaderboard rankings are calculated based on your Platform activity (such as deal claims and event participation) and may be visible to other Users. By using the Platform, you consent to your username and ranking being displayed on public or semi-public leaderboards within the app.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">3.4 Additional Services</h3>
        <p className="text-muted leading-relaxed">
          From time to time, Bizzy may introduce additional features, tools, or services. Such additions will be governed by these Terms unless separate terms are presented at the time of access, in which case those supplemental terms will also apply and will control in the event of a conflict with these Terms.
        </p>

        <p className="text-muted leading-relaxed mt-3">
          <strong>Important:</strong> Bizzy is a technology platform, not a retailer, merchant, event organizer, or venue operator. Bizzy does not produce, manufacture, sell, resell, provide, control, manage, offer, deliver, or supply any of the Deals, Tickets, products, services, or experiences listed on the Platform. The Merchants and Event Organizers are solely responsible for their offerings.
        </p>

        {/* ── 4. Eligibility & Account Registration ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">4. Eligibility &amp; Account Registration</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.1 Age Requirements</h3>
        <p className="text-muted leading-relaxed">
          You must be at least <strong>18 years of age</strong> (or the age of majority in your jurisdiction, whichever is greater) to create an account and use the Platform. Certain features, including age-restricted deals (see Section 12), require Users to be at least 21 years of age.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.2 Student Verification</h3>
        <p className="text-muted leading-relaxed">
          Certain Deals and Tickets may be restricted to verified college or university students. Bizzy may require verification of your student status through a valid <strong>.edu</strong> email address, student ID, or a third-party verification service. Providing false or misleading student status information is a violation of these Terms and may result in immediate account termination.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.3 Accuracy of Information</h3>
        <p className="text-muted leading-relaxed">
          You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete. Providing false, inaccurate, or misleading information constitutes a breach of these Terms.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">4.4 One Account Per Person</h3>
        <p className="text-muted leading-relaxed">
          Each individual may maintain only one active Bizzy account. Creating multiple accounts to exploit Deals, Tickets, referral programs, or promotional offers is strictly prohibited and may result in termination of all associated accounts.
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
          Bizzy may use SMS-based one-time passcodes (OTP) to verify your identity during account registration, login, or account recovery. By providing your phone number, you consent to receiving these verification messages. Standard message and data rates may apply. OTP codes are time-sensitive and should not be shared with anyone. Bizzy will never ask you for your OTP code outside of the in-app verification flow.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          Bizzy is not liable for any loss or damage arising from your failure to comply with this section. You are responsible for all activities that occur under your account, whether or not you authorized such activities.
        </p>

        {/* ── 6. Bizzy Deals — Terms of Use ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">6. Bizzy Deals — Terms of Use</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.1 How Deals Work</h3>
        <p className="text-muted leading-relaxed">
          Merchants create and manage their own Deals on the Platform. When you redeem a Deal, you are entering into a transaction directly with the Merchant — not with Bizzy. Bizzy&#39;s role is limited to providing the technology platform that displays and facilitates access to those Deals.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.2 Deal Availability &amp; Modifications</h3>
        <p className="text-muted leading-relaxed">
          Deals are subject to change, limitation, or removal at any time without prior notice. Availability may vary based on your location, student verification status, subscription tier, or other eligibility criteria. Bizzy does not guarantee the availability of any specific Deal.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.3 Exclusivity Requirement</h3>
        <p className="text-muted leading-relaxed">
          Deals listed on the Platform may be exclusive to Bizzy Users, meaning the Merchant has agreed not to offer the same deal through other channels. However, Bizzy does not guarantee or enforce exclusivity, and Merchants may offer comparable promotions at their discretion.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.4 Redemption</h3>
        <p className="text-muted leading-relaxed">
          To redeem a Deal, follow the instructions displayed on the Platform, which may include presenting a digital voucher, QR code, or confirmation screen to the Merchant at the point of sale. Each Deal may have specific terms, conditions, or restrictions imposed by the Merchant, which you must comply with at the time of redemption.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.5 Deal Claim Limits</h3>
        <p className="text-muted leading-relaxed">
          Deals may be subject to claim limits, including but not limited to a maximum number of redemptions per User per week, per Deal, or per Merchant. These limits are displayed on the Deal listing or within your account. Bizzy tracks your claim history and weekly claim counts to enforce these limits. Attempting to circumvent claim limits — including by creating multiple accounts, using automated tools, or other means — is a violation of these Terms and may result in account suspension or termination.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">6.6 Deal Disputes</h3>
        <p className="text-muted leading-relaxed">
          If a Merchant refuses to honor a listed Deal, modifies its terms at the point of sale, or otherwise fails to fulfill a Deal, you must resolve the issue directly with the Merchant. Bizzy will make commercially reasonable efforts to assist where possible, but assumes no liability for Merchant non-compliance.
        </p>

        {/* ── 7. Bizzy Ticketing — Terms of Use ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">7. Bizzy Ticketing — Terms of Use</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.1 Ticket Purchases</h3>
        <p className="text-muted leading-relaxed">
          Tickets purchased through the Platform are sold by or on behalf of Event Organizers. By purchasing a Ticket, you are entering into a contractual relationship with the Event Organizer, and Bizzy Ticketing LLC acts as the authorized ticketing agent for the transaction. All Ticket sales are subject to these Terms and any additional terms imposed by the Event Organizer.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.2 Ticket Delivery &amp; Format</h3>
        <p className="text-muted leading-relaxed">
          Tickets will be delivered electronically through the Platform, typically as a QR code or digital pass accessible in your Bizzy account. You are responsible for ensuring that your device is charged, functional, and able to display the Ticket at the time of the event. Bizzy is not responsible for admission issues arising from device malfunction or inability to display a valid Ticket.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.3 Ticket Pricing &amp; Fees</h3>
        <p className="text-muted leading-relaxed">
          Ticket prices are set by Event Organizers. Bizzy Ticketing LLC may charge service fees, processing fees, or facility charges in addition to the face value of the Ticket. All applicable fees will be disclosed to you before you complete your purchase. Prices and fees are subject to change until the moment of confirmed purchase.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.4 Ticket Refunds &amp; Cancellations</h3>
        <p className="text-muted leading-relaxed">
          All Ticket sales are generally <strong>final and non-refundable</strong> unless otherwise stated at the time of purchase or required by applicable law. In the event of an event cancellation by the Event Organizer:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Cancelled Events:</strong> If an Event Organizer cancels an event, Bizzy will facilitate a refund of the Ticket face value. Service fees may or may not be refundable depending on the circumstances and the Event Organizer&#39;s refund policy.</li>
          <li><strong>Postponed or Rescheduled Events:</strong> If an event is postponed or rescheduled, your Ticket will generally be valid for the new date. If you cannot attend the rescheduled event, refund availability will depend on the Event Organizer&#39;s policy.</li>
          <li><strong>Venue or Weather-Related Changes:</strong> Bizzy is not responsible for changes to an event due to weather, venue conditions, or other factors outside our control.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.5 Ticket Transfers &amp; Resale</h3>
        <p className="text-muted leading-relaxed">
          Tickets purchased through the Platform may not be transferred, resold, or distributed to third parties unless Bizzy expressly enables a transfer feature for the specific event. Unauthorized resale or transfer of Tickets may void the Ticket and result in denial of admission. Bizzy and Event Organizers reserve the right to cancel Tickets that have been resold in violation of this provision without refund.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.6 Event Admission &amp; Conduct</h3>
        <p className="text-muted leading-relaxed">
          Admission to events is subject to the Event Organizer&#39;s rules and policies, including but not limited to dress codes, age restrictions, photography policies, and codes of conduct. The Event Organizer and/or venue reserves the right to refuse admission or remove attendees for any reason, including violation of event rules. Bizzy is not responsible for denied admission or removal from an event.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.7 Event Organizer Responsibilities</h3>
        <p className="text-muted leading-relaxed">
          Event Organizers are solely responsible for the event itself, including but not limited to the accuracy of event descriptions, the safety and condition of the venue, compliance with local laws and regulations, provision of advertised entertainment or services, and the overall attendee experience. Bizzy does not inspect, endorse, or guarantee any event, venue, or Event Organizer.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.8 Event Organizer Payouts</h3>
        <p className="text-muted leading-relaxed">
          Bizzy facilitates payouts to Event Organizers through third-party payment platforms that provide connected account functionality. Event Organizers must establish and maintain a connected account with Bizzy&#39;s designated payment processor in order to receive payouts from Ticket sales. Payout timing, fees, and terms are governed by the agreement between the Event Organizer, Bizzy, and the applicable payment processor. Bizzy is not liable for delays, holds, or issues arising from the payment processor&#39;s policies or the Event Organizer&#39;s account status.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">7.9 Liability for Events</h3>
        <p className="text-muted leading-relaxed">
          Bizzy is not liable for any injury, loss, damage, or claim arising from your attendance at any event, including but not limited to personal injury, property damage, theft, illness, or exposure to communicable diseases. By attending an event, you assume all risks associated with attendance.
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
          Payments made through the Platform are processed by third-party payment processors, which may include Stripe, Apple Pay, Google Pay, or other processors as designated by Bizzy. Bizzy does not directly collect, store, or process your payment card information. Your use of any third-party payment service is subject to that provider&#39;s own terms of service and privacy policy.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.2 Subscriptions</h3>
        <p className="text-muted leading-relaxed">
          Certain Platform features may require a paid subscription. If you purchase a subscription, you agree to pay all fees associated with the subscription plan you select. Subscriptions are managed through third-party subscription management platforms and may renew automatically at the end of each billing period unless you cancel prior to the renewal date. You may cancel your subscription at any time through the Platform settings, through your device&#39;s app store subscription management (for subscriptions purchased via the App Store or Google Play), or by contacting us at {CONTACT_EMAIL}. Subscription entitlements, billing cycles, and renewal status are tracked through our third-party subscription management service, and cancellation must be completed in the system through which the subscription was originally purchased to be effective.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.3 Pricing</h3>
        <p className="text-muted leading-relaxed">
          All prices displayed on the Platform are in U.S. dollars unless otherwise indicated. Bizzy reserves the right to change pricing for subscriptions, Tickets, or any paid services at any time, provided that changes to subscription pricing will not apply until the next billing cycle following notice to you.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">9.4 Taxes</h3>
        <p className="text-muted leading-relaxed">
          You are responsible for paying any applicable taxes, including sales tax, use tax, or other governmental charges associated with your purchases on the Platform, unless Bizzy is legally required to collect and remit such taxes on your behalf.
        </p>

        {/* ── 10. Refund, Cancellation & Chargeback Policy ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">10. Refund, Cancellation &amp; Chargeback Policy</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.1 Deals</h3>
        <p className="text-muted leading-relaxed">
          All Deal redemptions are final. Bizzy does not issue refunds for Deals that have been redeemed or expired. If a Deal has not yet been redeemed and has not expired, refund eligibility will be evaluated on a case-by-case basis at Bizzy&#39;s sole discretion.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.2 Tickets</h3>
        <p className="text-muted leading-relaxed">
          Ticket refund policies are set by Event Organizers and communicated at the time of purchase. Unless otherwise stated, all Ticket sales are final. See Section 7.4 for additional details on event-related refunds.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.3 Subscriptions</h3>
        <p className="text-muted leading-relaxed">
          Subscription fees already billed are generally non-refundable. If you cancel a subscription, you will continue to have access to subscription benefits through the end of your current billing period.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">10.4 Chargebacks</h3>
        <p className="text-muted leading-relaxed">
          Filing a fraudulent or unwarranted chargeback with your bank or payment provider constitutes a violation of these Terms. If you initiate a chargeback, Bizzy reserves the right to immediately suspend or terminate your account, dispute the chargeback with the payment processor, and pursue recovery of the disputed amount, including any associated fees or costs.
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
          Bizzy is not liable for any User who misrepresents their age to access age-restricted content, and any such misrepresentation constitutes a material breach of these Terms.
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
          <li>Circumventing or attempting to circumvent deal claim limits, weekly redemption caps, or other usage restrictions</li>
          <li>Manipulating leaderboard rankings, engagement metrics, or gamification features through automated means, fake activity, or coordinated abuse</li>
          <li>Manipulating, abusing, or exploiting referral programs, promotional offers, or loyalty incentives</li>
          <li>Harassing, threatening, or abusing Merchants, Event Organizers, other Users, or Bizzy staff</li>
          <li>Uploading or transmitting malicious code, viruses, or other harmful technology</li>
          <li>Using bots, scrapers, crawlers, or other automated tools to access or extract data from the Platform</li>
          <li>Attempting to reverse-engineer, decompile, disassemble, or derive the source code of the Platform</li>
          <li>Interfering with or disrupting the integrity, performance, or security of the Platform</li>
          <li>Reselling, redistributing, or commercially exploiting Deals or Tickets in violation of these Terms</li>
          <li>Impersonating any person, entity, or affiliation, or misrepresenting your identity or student status</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          Violation of this section may result in immediate account suspension or termination, forfeiture of unused Deals or Tickets, reset of leaderboard rankings, and potential legal action.
        </p>

        {/* ── 14. Intellectual Property ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">14. Intellectual Property</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.1 Bizzy&#39;s Intellectual Property</h3>
        <p className="text-muted leading-relaxed">
          The Platform, including all software, code, design, text, graphics, logos, trademarks, service marks, trade names, icons, images, audio, video, data compilations, page layout, underlying code, and software, is the exclusive property of Bizzy Holdings LLC and/or its licensors and is protected by U.S. and international copyright, trademark, patent, and other intellectual property laws.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.2 Limited License</h3>
        <p className="text-muted leading-relaxed">
          Subject to your compliance with these Terms, Bizzy grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for your personal, non-commercial use. This license does not include the right to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Copy, modify, adapt, translate, or create derivative works of the Platform or its content</li>
          <li>Distribute, license, sublicense, sell, rent, or lease any portion of the Platform</li>
          <li>Use the Platform for any commercial purpose without Bizzy&#39;s prior written consent</li>
          <li>Remove, alter, or obscure any proprietary notices on the Platform</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">14.3 Trademarks</h3>
        <p className="text-muted leading-relaxed">
          &quot;Bizzy,&quot; &quot;BizzyU,&quot; the Bizzy logo, and all related names, logos, product and service names, designs, and slogans are trademarks of Bizzy Holdings LLC. You may not use these marks without the prior written permission of Bizzy Holdings LLC.
        </p>

        {/* ── 15. User-Generated Content ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">15. User-Generated Content</h2>
        <p className="text-muted leading-relaxed">
          If the Platform allows you to submit, post, or share content (including reviews, ratings, comments, photos, or other materials — collectively, &quot;User Content&quot;), the following terms apply:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Ownership:</strong> You retain ownership of your User Content. However, by submitting User Content, you grant Bizzy a worldwide, non-exclusive, royalty-free, perpetual, irrevocable, sublicensable, and transferable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such User Content in connection with the Platform and Bizzy&#39;s business operations.</li>
          <li><strong>Representations:</strong> You represent and warrant that you own or have the necessary rights to submit your User Content, and that your User Content does not infringe the intellectual property or other rights of any third party.</li>
          <li><strong>Prohibited Content:</strong> User Content must not contain material that is defamatory, obscene, harassing, threatening, invasive of privacy, or otherwise objectionable. Bizzy reserves the right to remove any User Content at its sole discretion.</li>
        </ul>

        {/* ── 16. Third-Party Services & Links ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">16. Third-Party Services &amp; Links</h2>
        <p className="text-muted leading-relaxed">
          The Platform may integrate with, link to, or rely on third-party services, including but not limited to payment processors (e.g., Stripe, Apple Pay), mapping services (e.g., Google Maps, Apple Maps), analytics services, push notification providers, and social media platforms.
        </p>
        <p className="text-muted leading-relaxed">
          Bizzy does not control, endorse, or assume responsibility for the availability, accuracy, content, privacy practices, or security of any third-party service. Your use of third-party services is at your own risk and subject to the applicable third party&#39;s terms and policies. Bizzy is not a party to and assumes no liability for any transactions, interactions, or disputes between you and any third-party service provider.
        </p>

        {/* ── 17. Push Notifications & Communications ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">17. Push Notifications &amp; Communications</h2>
        <p className="text-muted leading-relaxed">
          By using the Platform, you may opt in to receive push notifications, SMS messages, emails, or other electronic communications from Bizzy. These communications may include:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>New Deals and promotions in your area</li>
          <li>Event announcements and Ticket confirmations</li>
          <li>Account-related notices (security alerts, password resets, OTP verification codes, etc.)</li>
          <li>Welcome sequences for new users</li>
          <li>Marketing and promotional campaign messages</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          You may opt out of promotional communications at any time by adjusting your notification settings in the app, clicking &quot;unsubscribe&quot; in any marketing email, or contacting us at {CONTACT_EMAIL}. Note that opting out of promotional communications does not affect transactional, security, or account-related messages (including OTP verification codes), which are necessary for the operation and security of your account.
        </p>
        <p className="text-muted leading-relaxed">
          By providing your phone number, you consent to receive SMS or text messages from Bizzy, including one-time passcodes for account verification and recovery. Standard message and data rates may apply. Message frequency varies.
        </p>

        {/* ── 18. Disclaimer of Warranties ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">18. Disclaimer of Warranties</h2>
        <p className="text-muted leading-relaxed uppercase text-sm">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE PLATFORM AND ALL SERVICES, CONTENT, DEALS, TICKETS, AND MATERIALS AVAILABLE THROUGH THE PLATFORM ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
        </p>
        <p className="text-muted leading-relaxed uppercase text-sm">
          BIZZY SPECIFICALLY DISCLAIMS ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT, AND ALL WARRANTIES ARISING FROM COURSE OF DEALING, USAGE, OR TRADE PRACTICE.
        </p>
        <p className="text-muted leading-relaxed uppercase text-sm">
          WITHOUT LIMITING THE FOREGOING, BIZZY MAKES NO WARRANTY OR REPRESENTATION THAT: (A) THE PLATFORM WILL MEET YOUR REQUIREMENTS; (B) THE PLATFORM WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; (C) THE RESULTS OBTAINED FROM USE OF THE PLATFORM WILL BE ACCURATE OR RELIABLE; (D) ANY DEALS OR TICKETS WILL BE HONORED BY MERCHANTS OR EVENT ORGANIZERS; (E) ANY ERRORS IN THE PLATFORM WILL BE CORRECTED; (F) LOCATION DATA, DISTANCE CALCULATIONS, OR PLACE INFORMATION WILL BE ACCURATE; OR (G) LEADERBOARD RANKINGS OR ENGAGEMENT METRICS WILL BE FREE FROM ERROR.
        </p>

        {/* ── 19. Limitation of Liability ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">19. Limitation of Liability</h2>
        <p className="text-muted leading-relaxed uppercase text-sm">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL BIZZY, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, LICENSORS, OR SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Your use of or inability to use the Platform</li>
          <li>Any Deal or Ticket that is not honored, modified, or cancelled</li>
          <li>Unauthorized access to or alteration of your account or data</li>
          <li>Statements, conduct, or content of any third party on the Platform</li>
          <li>Personal injury, property damage, or any other harm arising from your attendance at an event or redemption of a Deal</li>
          <li>Inaccuracies in location data, distance calculations, or place information displayed on the Platform</li>
          <li>Errors in leaderboard rankings or engagement metrics</li>
          <li>Delays or failures in payment processing or payout disbursement</li>
          <li>Any other matter relating to the Platform</li>
        </ul>
        <p className="text-muted leading-relaxed uppercase text-sm mt-3">
          IN NO EVENT SHALL BIZZY&#39;S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM EXCEED THE GREATER OF: (A) THE AMOUNTS YOU HAVE PAID TO BIZZY IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (B) ONE HUNDRED U.S. DOLLARS ($100.00).
        </p>
        <p className="text-muted leading-relaxed uppercase text-sm">
          THE LIMITATIONS IN THIS SECTION APPLY REGARDLESS OF THE THEORY OF LIABILITY, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, AND REGARDLESS OF WHETHER BIZZY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>

        {/* ── 20. Indemnification ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">20. Indemnification</h2>
        <p className="text-muted leading-relaxed">
          You agree to indemnify, defend, and hold harmless Bizzy, its parent companies, subsidiaries, affiliates, and each of their respective officers, directors, employees, agents, licensors, and service providers (collectively, the &quot;Bizzy Parties&quot;) from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys&#39; fees) arising from or relating to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Your use of the Platform</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any applicable law, regulation, or third-party right</li>
          <li>Any dispute between you and a Merchant or Event Organizer</li>
          <li>Your User Content</li>
          <li>Your negligence or willful misconduct</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          Bizzy reserves the right, at your expense, to assume the exclusive defense and control of any matter for which you are required to indemnify us, and you agree to cooperate with our defense of such claims.
        </p>

        {/* ── 21. Dispute Resolution & Arbitration ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">21. Dispute Resolution &amp; Arbitration</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">21.1 Informal Resolution</h3>
        <p className="text-muted leading-relaxed">
          Before initiating any formal dispute resolution proceeding, you agree to first contact Bizzy at <strong>{CONTACT_EMAIL}</strong> and attempt to resolve the dispute informally for a period of at least <strong>thirty (30) days</strong>. Most disputes can be resolved without formal proceedings.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">21.2 Binding Arbitration</h3>
        <p className="text-muted leading-relaxed">
          If informal resolution is unsuccessful, any dispute, controversy, or claim arising out of or relating to these Terms, or the breach, termination, enforcement, interpretation, or validity thereof, shall be determined by <strong>binding arbitration</strong> administered by the American Arbitration Association (&quot;AAA&quot;) in accordance with its Consumer Arbitration Rules then in effect, except as modified by these Terms.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">21.3 Arbitration Procedures</h3>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Location:</strong> Arbitration shall take place in the State of Florida, or at another mutually agreed location, or via telephone or video conference if permitted by the AAA rules.</li>
          <li><strong>Language:</strong> English.</li>
          <li><strong>Arbitrator:</strong> The arbitration shall be conducted by a single arbitrator selected in accordance with AAA rules.</li>
          <li><strong>Judgment:</strong> The arbitrator&#39;s decision shall be final and binding, and judgment on the award may be entered in any court of competent jurisdiction.</li>
        </ul>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">21.4 Exceptions to Arbitration</h3>
        <p className="text-muted leading-relaxed">
          Either party may seek injunctive or equitable relief in a court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of intellectual property rights. Claims eligible for small claims court may also be brought in small claims court in lieu of arbitration.
        </p>

        {/* ── 22. Class Action & Jury Trial Waiver ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">22. Class Action &amp; Jury Trial Waiver</h2>
        <p className="text-muted leading-relaxed font-semibold">
          YOU AND BIZZY AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, REPRESENTATIVE, OR CONSOLIDATED ACTION.
        </p>
        <p className="text-muted leading-relaxed font-semibold">
          YOU AND BIZZY WAIVE ANY RIGHT TO A JURY TRIAL FOR ANY DISPUTE ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM.
        </p>
        <p className="text-muted leading-relaxed mt-3">
          If this class action waiver is found to be unenforceable, then the entirety of the arbitration agreement in Section 21 shall be null and void, and the dispute shall proceed in a court of competent jurisdiction.
        </p>

        {/* ── 23. Governing Law & Jurisdiction ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">23. Governing Law &amp; Jurisdiction</h2>
        <p className="text-muted leading-relaxed">
          These Terms shall be governed by and construed in accordance with the laws of the <strong>State of Florida</strong>, without regard to its conflict-of-laws principles. To the extent that any lawsuit or court proceeding is permitted under these Terms, you and Bizzy agree to submit to the exclusive personal jurisdiction of the state and federal courts located in the State of Florida for the purpose of litigating any such dispute.
        </p>

        {/* ── 24. Termination & Suspension ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">24. Termination &amp; Suspension</h2>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">24.1 Termination by You</h3>
        <p className="text-muted leading-relaxed">
          You may terminate your account at any time by contacting us at {CONTACT_EMAIL} or through the account settings in the app. Upon termination, your right to access the Platform will cease immediately. Any unused Deals or Tickets in your account at the time of termination will be forfeited and are non-refundable, except as required by applicable law. Your leaderboard rankings and claim history will be removed.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">24.2 Termination or Suspension by Bizzy</h3>
        <p className="text-muted leading-relaxed">
          Bizzy reserves the right to suspend or terminate your account, in whole or in part, at any time and for any reason, including but not limited to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Violation of these Terms</li>
          <li>Suspected fraudulent, abusive, or illegal activity</li>
          <li>Circumvention of deal claim limits or manipulation of leaderboard rankings</li>
          <li>Failure to pay applicable fees</li>
          <li>Extended periods of inactivity</li>
          <li>A request by law enforcement or a government agency</li>
          <li>Discontinuance or material modification of the Platform</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          Bizzy will make reasonable efforts to notify you of suspension or termination, except where doing so would compromise an investigation or would be impractical.
        </p>

        <h3 className="text-lg font-semibold text-ink mt-6 mb-2">24.3 Effect of Termination</h3>
        <p className="text-muted leading-relaxed">
          Upon termination, Sections 14, 15, 18, 19, 20, 21, 22, 23, and any other provisions that by their nature should survive, shall survive termination.
        </p>

        {/* ── 25. Service Availability & Modifications ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">25. Service Availability &amp; Modifications</h2>
        <p className="text-muted leading-relaxed">
          Bizzy reserves the right to modify, suspend, or discontinue any feature, functionality, Deal, Ticket listing, or the entirety of the Platform at any time, with or without notice. Bizzy shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Platform or any part thereof.
        </p>
        <p className="text-muted leading-relaxed">
          Bizzy is not obligated to provide ongoing support, maintenance, or updates for any feature or service, and the availability of any feature does not create an obligation for Bizzy to continue offering that feature in the future.
        </p>

        {/* ── 26. Force Majeure ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">26. Force Majeure</h2>
        <p className="text-muted leading-relaxed">
          Bizzy shall not be liable for any failure or delay in performance of its obligations under these Terms arising from events beyond Bizzy&#39;s reasonable control, including but not limited to:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Natural disasters (earthquakes, hurricanes, floods, etc.)</li>
          <li>Pandemics, epidemics, or public health emergencies</li>
          <li>Cyberattacks, hacking, or distributed denial-of-service attacks</li>
          <li>Government actions, sanctions, embargoes, or regulatory changes</li>
          <li>Internet, telecommunications, or infrastructure outages</li>
          <li>War, terrorism, civil unrest, or acts of God</li>
          <li>Labor strikes or work stoppages</li>
        </ul>
        <p className="text-muted leading-relaxed mt-3">
          During a force majeure event, Bizzy may suspend affected operations and will resume performance as soon as reasonably practicable after the event concludes.
        </p>

        {/* ── 27. Privacy & Data Practices ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">27. Privacy &amp; Data Practices</h2>
        <p className="text-muted leading-relaxed">
          Your use of the Platform is also governed by our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, which describes how we collect, use, store, and share your personal information. By using the Platform, you consent to the collection and processing of your data as described in the Privacy Policy.
        </p>
        <p className="text-muted leading-relaxed">
          Bizzy implements commercially reasonable security measures to protect your data. However, no method of electronic storage or transmission is 100% secure, and Bizzy cannot guarantee the absolute security of your information. Bizzy is not liable for unauthorized access to or disclosure of your data resulting from circumstances beyond our reasonable control, including third-party data breaches affecting service providers we use.
        </p>

        {/* ── 28. DMCA & Copyright Complaints ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">28. DMCA &amp; Copyright Complaints</h2>
        <p className="text-muted leading-relaxed">
          If you believe that content on the Platform infringes your copyright, you may submit a notice under the Digital Millennium Copyright Act (&quot;DMCA&quot;) to our designated copyright agent at:
        </p>
        <p className="text-muted leading-relaxed">
          <strong>Email:</strong>{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a><br />
          <strong>Subject Line:</strong> DMCA Takedown Notice
        </p>
        <p className="text-muted leading-relaxed">
          Your notice must include: a description of the copyrighted work claimed to be infringed; identification of the allegedly infringing material and its location on the Platform; your contact information; a statement that you have a good-faith belief that the use is not authorized; and a statement under penalty of perjury that the information in the notice is accurate and that you are the copyright owner or authorized to act on their behalf.
        </p>

        {/* ── 29. Electronic Communications Consent ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">29. Electronic Communications Consent</h2>
        <p className="text-muted leading-relaxed">
          By creating an account or using the Platform, you consent to receive electronic communications from Bizzy, including via email, push notification, SMS, or in-app message. You agree that all agreements, notices, disclosures, and other communications that Bizzy provides to you electronically satisfy any legal requirement that such communications be in writing.
        </p>

        {/* ── 30. Severability ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">30. Severability</h2>
        <p className="text-muted leading-relaxed">
          If any provision of these Terms is held by a court or arbitrator of competent jurisdiction to be invalid, illegal, or unenforceable for any reason, that provision shall be modified to the minimum extent necessary to make it enforceable, or if modification is not possible, shall be severed from these Terms. The remaining provisions shall continue in full force and effect.
        </p>

        {/* ── 31. No Waiver ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">31. No Waiver</h2>
        <p className="text-muted leading-relaxed">
          The failure of Bizzy to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. No waiver of any provision shall be deemed a further or continuing waiver of such provision or any other provision. Any waiver must be in writing and signed by an authorized representative of Bizzy to be effective.
        </p>

        {/* ── 32. Assignment ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">32. Assignment</h2>
        <p className="text-muted leading-relaxed">
          You may not assign or transfer these Terms, or any rights or obligations hereunder, without the prior written consent of Bizzy. Bizzy may freely assign or transfer these Terms, including in connection with a merger, acquisition, corporate reorganization, or sale of all or substantially all of its assets, without restriction and without notice to you.
        </p>

        {/* ── 33. Entire Agreement ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">33. Entire Agreement</h2>
        <p className="text-muted leading-relaxed">
          These Terms, together with the Privacy Policy and any other agreements or policies expressly incorporated by reference, constitute the entire agreement between you and Bizzy regarding the Platform and supersede all prior and contemporaneous agreements, proposals, representations, and understandings, whether oral or written, relating to the subject matter hereof.
        </p>

        {/* ── 34. Changes to These Terms ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">34. Changes to These Terms</h2>
        <p className="text-muted leading-relaxed">
          Bizzy reserves the right to modify, amend, or replace these Terms at any time at our sole discretion. When we make material changes, we will update the &quot;Effective Date&quot; at the top of this page and may notify you through the Platform, via email, or by other reasonable means.
        </p>
        <p className="text-muted leading-relaxed">
          Your continued use of the Platform after the effective date of any revised Terms constitutes your acceptance of those changes. If you do not agree to the revised Terms, you must stop using the Platform and close your account.
        </p>
        <p className="text-muted leading-relaxed">
          We encourage you to review these Terms periodically to stay informed of any updates.
        </p>

        {/* ── 35. Contact Information ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">35. Contact Information</h2>
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
