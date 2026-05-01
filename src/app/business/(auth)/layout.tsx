import type { Metadata } from "next"

// Cooper (May 2026): override the root site's OG/Twitter metadata so when
// someone shares /business/login (or signup, forgot-password, etc.) the link
// preview clearly says it's the business portal — not the student-facing
// "Live College For Less" branding from the root layout.
const TITLE = "Bizzy Business Portal — Sign In"
const DESCRIPTION =
  "Sign in to your Bizzy business dashboard to create events, post deals, and manage your team."

export const metadata: Metadata = {
  title: "Business Portal",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Bizzy Business",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      {children}
    </div>
  )
}
