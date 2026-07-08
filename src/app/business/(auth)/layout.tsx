import type { Metadata } from "next"
import { ThemeProvider } from "@/lib/v2/theme"

const TITLE = "Bizzy Business Portal: Sign In"
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

export default function V2AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </div>
    </ThemeProvider>
  )
}
