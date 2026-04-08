import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Line Skip | Bizzy",
  description: "Line Skip ticket verification",
  robots: { index: false, follow: false },
}

export default function LineSkipScanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {children}
    </div>
  )
}
