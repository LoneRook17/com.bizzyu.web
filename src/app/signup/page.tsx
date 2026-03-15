import type { Metadata } from "next";
import SignupFlow from "@/components/signup/SignupFlow";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "List an Exclusive Student Deal - Bizzy",
  description:
    "Submit an exclusive student deal on Bizzy for free. Reach thousands of college students with offers they can only get through Bizzy. No fees, no contracts.",
  openGraph: {
    title: "List an Exclusive Student Deal - Bizzy",
    description:
      "Submit an exclusive student deal for free and reach thousands of college students.",
  },
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="pt-28 pb-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-3">
            List an Exclusive Deal on{" "}
            <span className="text-primary">Bizzy</span>
          </h1>
          <p className="text-muted max-w-md mx-auto">
            Submit a Bizzy-only offer for students. Free to list, no contracts.
          </p>
        </div>
      </section>

      {/* What qualifies */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <AnimatedSection>
            <h2 className="text-2xl md:text-3xl font-bold text-ink mb-3 text-center">
              What qualifies as a Bizzy deal?
            </h2>
            <p className="text-muted text-center mb-8 max-w-xl mx-auto">
              Bizzy deals must be exclusive to Bizzy users. If a customer can get the same offer from the public, it is not a Bizzy deal.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Accepted */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <h3 className="font-bold text-ink">Accepted Examples</h3>
                </div>
                <ul className="space-y-3 text-sm">
                  {[
                    "BOGO margaritas only for Bizzy users",
                    "Free appetizer with entree, only through Bizzy",
                    "Monthly student special only redeemable in the app",
                    "A meal deal available only for Bizzy users",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      <span className="text-ink">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Not accepted */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </div>
                  <h3 className="font-bold text-ink">Not accepted</h3>
                </div>
                <ul className="space-y-3 text-sm">
                  {[
                    "A deal already posted on Instagram or other social media",
                    "A general happy hour anyone can get",
                    "A standing in-store special open to the public",
                    "A public student discount offered without Bizzy",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      <span className="text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Form */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-ink mb-2">
            Build Your Bizzy Deal(s)
          </h2>
          <p className="text-muted text-sm">
            No fees, no contracts - takes less than 5 minutes.
          </p>
          <p className="text-muted text-sm mt-2">
            Submit your deal and our team will review it. We curate every listing to keep deals competitive and valuable for students.
          </p>
        </div>
        <SignupFlow />
      </section>

      {/* Help bar */}
      <section className="border-t border-gray-100 py-8 px-4">
        <p className="text-center text-sm text-muted">
          Need help?{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary font-medium hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </main>
  );
}
