import type { BadgeProps } from "@/components/business/v2/ui/badge"

type BadgeVariant = NonNullable<BadgeProps["variant"]>

/**
 * Maps a raw event status string to a v2 Badge variant + human label.
 * Mirrors the status semantics used across the legacy dashboard
 * (published/approved = live, draft = neutral, pending = in review,
 * cancelled/rejected = danger).
 */
export function eventStatusBadge(status: string): { variant: BadgeVariant; label: string } {
  const s = (status ?? "").toLowerCase()
  if (s === "published" || s === "approved" || s === "active") return { variant: "success", label: "Live" }
  if (s === "draft") return { variant: "neutral", label: "Draft" }
  if (s === "pending_review") return { variant: "warning", label: "Under review" }
  if (s.includes("pending")) return { variant: "warning", label: "In review" }
  if (s === "cancelled") return { variant: "danger", label: "Cancelled" }
  if (s === "rejected") return { variant: "danger", label: "Rejected" }
  return { variant: "neutral", label: status || "-" }
}

/** Long-form date, e.g. "Saturday, March 14, 2026" */
export function fmtLongDate(s?: string | null) {
  if (!s) return "-"
  return new Date(s).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/** Short date, e.g. "Mar 14, 2026" */
export function fmtDate(s?: string | null) {
  if (!s) return "-"
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/** Short date without year, e.g. "Mar 14" */
export function fmtDateShort(s?: string | null) {
  if (!s) return "-"
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Time only, e.g. "9:00 PM" */
export function fmtTime(s?: string | null) {
  if (!s) return "-"
  return new Date(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

/** Date + time, e.g. "Mar 14, 9:00 PM" */
export function fmtDateTime(s?: string | null) {
  if (!s) return "-"
  return new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/** Converts an ISO/DB datetime into the `YYYY-MM-DDTHH:MM` shape datetime-local inputs expect. */
export function toDatetimeLocal(dateStr?: string | null) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
