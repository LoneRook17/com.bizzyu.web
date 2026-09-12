import type { Metadata } from "next";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import { CONTACT_EMAIL } from "@/lib/constants";

// Google Play "account deletion URL" (User Data policy) and the App Store
// equivalent both point here. Instructions only — deletion itself happens in
// the app (Profile → Settings → Delete Account) or by emailed request; this
// page never deletes anything.
export const metadata: Metadata = {
  title: "Delete Your Account",
  description:
    "How to delete your Bizzy account and the personal data associated with it, from the app or by request.",
  alternates: {
    canonical: "https://bizzyu.com/account/delete",
  },
};

export default function DeleteAccountPage() {
  const subject = encodeURIComponent("Delete my Bizzy account");
  const body = encodeURIComponent(
    "Please delete my Bizzy account.\n\nAccount email or phone number: \nName on the account: \n"
  );

  return (
    <SectionContainer className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1 className="text-4xl font-bold text-ink mb-2">Delete Your Bizzy Account</h1>
        <p className="text-muted text-sm mb-10">
          Applies to the Bizzy app on iOS and Android (Bizzy Holdings LLC, Bizzy Deals LLC, Bizzy Ticketing LLC)
        </p>

        <p className="text-muted leading-relaxed">
          You can delete your Bizzy account at any time. Deletion is permanent: your profile is removed, you are signed out everywhere, and you cannot recover the account afterwards. There are two ways to do it.
        </p>

        {/* ── 1. In the app ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">1. Delete from the app (fastest)</h2>
        <ol className="text-muted space-y-2 list-decimal pl-6">
          <li>Open the Bizzy app and sign in.</li>
          <li>Tap <strong>Profile</strong> in the bottom bar.</li>
          <li>Tap the <strong>Settings</strong> gear in the top-right corner.</li>
          <li>Scroll to the bottom and tap <strong>Delete Account</strong>.</li>
          <li>Confirm when asked <em>&quot;Do you really want to delete your account permanently?&quot;</em></li>
        </ol>
        <p className="text-muted leading-relaxed">
          Your account is deleted immediately and the app returns you to the sign-in screen.
        </p>

        {/* ── 2. By request ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">2. Request deletion without the app</h2>
        <p className="text-muted leading-relaxed">
          If you no longer have the app installed, or cannot sign in, email us from the address on your account (or include the phone number you signed up with) and we will delete it for you:
        </p>
        <p className="text-muted leading-relaxed">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}
            className="text-primary font-semibold hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          — subject line <strong>&quot;Delete my Bizzy account&quot;</strong>.
        </p>
        <p className="text-muted leading-relaxed">
          We may reply to confirm that the request came from the account holder. Requests are completed within <strong>30 days</strong> of verification.
        </p>

        {/* ── 3. What is deleted ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">3. What is deleted</h2>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li>Your name, email address, phone number, and profile photo</li>
          <li>Your password and sign-in sessions on every device</li>
          <li>Push-notification registrations (the app stops receiving notifications)</li>
          <li>Your Bizzy Premium entitlement in the app (see the note on subscriptions below)</li>
          <li>Marketing preferences — you are opted out of all Bizzy marketing</li>
        </ul>

        {/* ── 4. What is kept ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">4. What is kept, and for how long</h2>
        <p className="text-muted leading-relaxed">
          Some records must survive the account so that businesses, venues, and Bizzy can meet legal, tax, and fraud-prevention obligations. These are kept without your name or contact details attached:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>Ticket and order history</strong> for events you bought tickets to (needed for refunds, chargebacks, and the venue&apos;s own records) — up to seven (7) years, as described in our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link></li>
          <li><strong>Deal redemption records</strong> so a merchant&apos;s redemption counts stay accurate</li>
          <li><strong>Promoter payout records</strong>, if you were enrolled in the Promoter Program (tax recordkeeping)</li>
          <li><strong>Marketing opt-out records</strong>, so we never contact a deleted account again</li>
        </ul>
        <p className="text-muted leading-relaxed">
          Full retention periods are in Section 7 of the <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>

        {/* ── 5. Subscriptions ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">5. Bizzy Premium subscriptions</h2>
        <p className="text-muted leading-relaxed">
          Deleting your account does <strong>not</strong> cancel a subscription billed by Apple or Google — those are managed by the store, not by Bizzy. Cancel it first so you are not charged again:
        </p>
        <ul className="text-muted space-y-1 list-disc pl-6">
          <li><strong>iPhone:</strong> Settings → your name → Subscriptions → Bizzy Premium → Cancel</li>
          <li><strong>Android:</strong> Google Play app → Profile → Payments &amp; subscriptions → Subscriptions → Bizzy Premium → Cancel</li>
        </ul>

        {/* ── 6. Upcoming tickets ── */}
        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">6. Before you delete</h2>
        <p className="text-muted leading-relaxed">
          Tickets in your Bizzy Wallet are tied to your account. If you have a ticket for an upcoming event, use it or contact the organizer about a refund <em>before</em> deleting your account — a deleted account can no longer show its tickets or QR codes.
        </p>

        <h2 className="text-2xl font-bold text-ink mt-10 mb-4">Questions</h2>
        <p className="text-muted leading-relaxed">
          Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>. See also our{" "}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{" "}
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
        </p>
      </div>
    </SectionContainer>
  );
}
