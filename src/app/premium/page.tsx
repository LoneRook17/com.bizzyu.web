import SectionContainer from "@/components/ui/SectionContainer"
import { APP_STORE_URL } from "@/lib/constants"

// Bizzy Premium is sold exclusively through the mobile apps (Apple App Store /
// Google Play). The former web checkout flow (Stripe) has been removed — this
// page now funnels web visitors to download the app and subscribe there.
export const metadata = {
  title: "Bizzy Premium",
  description:
    "Unlimited deal claims and premium-only deals. Get Bizzy Premium in the app.",
}

export default function PremiumPage() {
  return (
    <SectionContainer>
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="mb-4 text-3xl font-bold text-ink md:text-4xl">
          Bizzy Premium
        </h1>
        <p className="mb-8 text-base leading-relaxed text-muted">
          Unlimited deal claims, premium-only deals, and more — available in the
          Bizzy app. Download Bizzy, then head to{" "}
          <span className="font-semibold text-ink">Profile → Premium</span> to
          subscribe.
        </p>
        <a
          href={APP_STORE_URL}
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
        >
          Download on the App Store
        </a>
        <p className="mt-6 text-sm text-muted">
          Already have the app? Open it and go to Profile → Premium.
        </p>
      </div>
    </SectionContainer>
  )
}
