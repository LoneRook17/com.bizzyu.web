"use client"

import { useAuth } from "@/lib/business/auth-context"

export default function PendingBanner() {
  const { business } = useAuth()

  if (!business) return null

  if (business.status === "pending_verification") {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-sm text-yellow-800">
        <strong>Email not verified.</strong> Please check your inbox and verify your email to continue.
      </div>
    )
  }

  if (business.status === "pending_approval") {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-sm text-yellow-800">
        <strong>Pending approval.</strong> Your business is under review. You can view the dashboard but cannot create events or deals yet.
      </div>
    )
  }

  if (business.status === "rejected") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-800">
        <strong>Application rejected.</strong> Your business application was not approved. Please contact support for more information.
      </div>
    )
  }

  return null
}
