// Same centered card chrome as the business auth pages (mirrors /setup-password
// and /accept-invite).
export default function TeamInviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      {children}
    </div>
  )
}
