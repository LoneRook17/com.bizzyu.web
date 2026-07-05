import type { Metadata } from "next"

// Rendered inside the iOS app's WebView — no marketing chrome (see
// LayoutShell), no smart-app banner, and never indexed.
export const metadata: Metadata = {
  title: "Support",
  robots: { index: false, follow: false },
  itunes: null,
}

export default function SupportChatLayout({ children }: { children: React.ReactNode }) {
  return children
}
