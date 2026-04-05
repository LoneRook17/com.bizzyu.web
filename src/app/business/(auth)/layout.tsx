import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Business Portal",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      {children}
    </div>
  )
}
