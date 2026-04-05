"use client"

import { useState } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import PendingBanner from "./PendingBanner"

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <PendingBanner />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
