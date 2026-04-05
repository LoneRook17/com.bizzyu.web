import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Check In — Bizzy",
  description: "Ticket check-in for Bizzy events",
}

export default function CheckinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {children}
    </div>
  )
}
