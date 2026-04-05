import { EVENT_STATUS_COLORS } from "@/lib/business/constants"

interface StatusBadgeProps {
  status: string
  className?: string
}

const LABELS: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  pending_approval: "Pending Approval",
  pending_review: "Under Review",
  cancelled: "Cancelled",
  rejected: "Rejected",
  approved: "Approved",
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const colors = EVENT_STATUS_COLORS[status] || { bg: "bg-gray-100", text: "text-gray-600" }
  const label = LABELS[status] || status

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${className}`}>
      {label}
    </span>
  )
}
