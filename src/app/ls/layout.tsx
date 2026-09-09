import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Skip the Line Ticket | Bizzy",
  description: "Skip the Line Ticket verification",
  robots: { index: false, follow: false },
}

export default function LineSkipScanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {children}
    </div>
  )
}
