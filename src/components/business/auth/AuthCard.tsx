import Link from "next/link"

interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block">
          <img src="/images/bizzy-logo.png" alt="Bizzy" className="mx-auto h-16" />
        </Link>
      </div>
      <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
        <h1 className="text-2xl font-bold text-ink mb-1">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mb-6">{subtitle}</p>}
        {!subtitle && <div className="mb-6" />}
        {children}
      </div>
    </div>
  )
}
