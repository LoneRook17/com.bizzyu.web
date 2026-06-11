// Same centered card chrome as the business auth pages.
export default function SetupPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      {children}
    </div>
  )
}
