"use client"

import { useState } from "react"

interface RolePermissionsModalProps {
  /** Which table to show: "event" for the event-level roles, "business" for business-level roles */
  variant: "event" | "business"
}

/* ── Event-level permissions (Owner / Co-Host / Crew) ────────────────── */
const EVENT_PERMISSIONS: { label: string; owner: boolean; cohost: boolean; crew: boolean }[] = [
  { label: "Edit Event",      owner: true,  cohost: true,  crew: false },
  { label: "View Analytics",  owner: true,  cohost: true,  crew: false },
  { label: "Scan Tickets",    owner: true,  cohost: true,  crew: true  },
  { label: "Door Sales",      owner: true,  cohost: true,  crew: true  },
  { label: "Promo Codes",     owner: true,  cohost: true,  crew: false },
  { label: "Tracking Links",  owner: true,  cohost: true,  crew: false },
  { label: "Manage Team",     owner: true,  cohost: false, crew: false },
  { label: "Scanner Links",   owner: true,  cohost: true,  crew: false },
  { label: "Delete Event",    owner: true,  cohost: false, crew: false },
]

/* ── Business-level permissions (Owner / Manager / Staff) ──────────── */
type BizPerm = { label: string; owner: string; manager: string; staff: string }

const section = (heading: string): BizPerm => ({
  label: heading, owner: "", manager: "", staff: "",
})

const BUSINESS_PERMISSIONS: BizPerm[] = [
  section("BUSINESS PROFILE"),
  { label: "View business overview",       owner: "yes", manager: "yes", staff: "yes" },
  { label: "Edit business info",           owner: "yes", manager: "yes", staff: "no"  },
  { label: "Delete / deactivate business", owner: "yes", manager: "no",  staff: "no"  },

  section("EVENTS"),
  { label: "View all events",              owner: "yes", manager: "yes", staff: "yes" },
  { label: "Create events",                owner: "yes", manager: "yes", staff: "no"  },
  { label: "Edit / cancel events",         owner: "yes", manager: "yes", staff: "no"  },
  { label: "Duplicate past events",        owner: "yes", manager: "yes", staff: "no"  },
  { label: "Scan tickets / check in",      owner: "yes", manager: "yes", staff: "yes" },

  section("DEALS"),
  { label: "View all deals",               owner: "yes", manager: "yes", staff: "yes" },
  { label: "Create deals",                 owner: "yes", manager: "yes", staff: "yes" },
  { label: "Edit / deactivate deals",      owner: "yes", manager: "yes", staff: "Own only" },
  { label: "Delete deals",                 owner: "yes", manager: "yes", staff: "no"  },

  section("ANALYTICS"),
  { label: "View free-tier analytics",     owner: "yes", manager: "yes", staff: "no"  },
  { label: "View paid AI insights",        owner: "yes", manager: "yes", staff: "no"  },
  { label: "Export analytics data",        owner: "yes", manager: "yes", staff: "no"  },

  section("TEAM MANAGEMENT"),
  { label: "View team members",            owner: "yes", manager: "yes",        staff: "yes" },
  { label: "Add team members",             owner: "yes", manager: "yes",        staff: "no"  },
  { label: "Remove team members",          owner: "yes", manager: "Not owner",  staff: "no"  },
  { label: "Change member roles",          owner: "yes", manager: "Staff only", staff: "no"  },
  { label: "Transfer ownership",           owner: "yes", manager: "no",         staff: "no"  },

  section("FINANCIAL / BILLING"),
  { label: "View revenue & payouts",       owner: "yes", manager: "no",  staff: "no" },
  { label: "Manage Stripe Connect",        owner: "yes", manager: "no",  staff: "no" },
  { label: "Manage subscription / billing",owner: "yes", manager: "no",  staff: "no" },
  { label: "Set promo codes & pricing",    owner: "yes", manager: "yes", staff: "no" },
]

/* ── Shared check / dash icons ──────────────────────────────────────── */
function Check() {
  return (
    <svg className="mx-auto h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function Dash() {
  return <span className="mx-auto block h-0.5 w-3 rounded bg-gray-300" />
}

function CellValue({ value }: { value: string }) {
  if (value === "yes") return <Check />
  if (value === "no" || value === "") return <Dash />
  return <span className="text-[11px] text-gray-500 font-medium">{value}</span>
}

/* ── Component ──────────────────────────────────────────────────────── */
export default function RolePermissionsModal({ variant }: RolePermissionsModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Role Permissions
      </button>

      {/* Modal backdrop + panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-ink">Role Permissions</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Table */}
            <div className="px-6 py-4">
              {variant === "event" ? <EventTable /> : <BusinessTable />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Event-level table ──────────────────────────────────────────────── */
function EventTable() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="py-2 text-left font-semibold text-ink w-1/2">Permission</th>
          <th className="py-2 text-center font-semibold text-ink">Owner</th>
          <th className="py-2 text-center font-semibold text-ink">Co-Host</th>
          <th className="py-2 text-center font-semibold text-ink">Crew</th>
        </tr>
      </thead>
      <tbody>
        {EVENT_PERMISSIONS.map((p) => (
          <tr key={p.label} className="border-b border-gray-50">
            <td className="py-2.5 text-gray-700">{p.label}</td>
            <td className="py-2.5 text-center">{p.owner ? <Check /> : <Dash />}</td>
            <td className="py-2.5 text-center">{p.cohost ? <Check /> : <Dash />}</td>
            <td className="py-2.5 text-center">{p.crew ? <Check /> : <Dash />}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ── Business-level table ───────────────────────────────────────────── */
function BusinessTable() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="py-2 text-left font-semibold text-ink w-2/5">Permission</th>
          <th className="py-2 text-center font-semibold text-ink">Owner</th>
          <th className="py-2 text-center font-semibold text-ink">Manager</th>
          <th className="py-2 text-center font-semibold text-ink">Staff</th>
        </tr>
      </thead>
      <tbody>
        {BUSINESS_PERMISSIONS.map((p, i) => {
          // Section header row
          if (!p.owner && !p.manager && !p.staff) {
            return (
              <tr key={i}>
                <td colSpan={4} className="pt-4 pb-1 text-xs font-bold text-gray-400 tracking-wide">{p.label}</td>
              </tr>
            )
          }
          return (
            <tr key={i} className="border-b border-gray-50">
              <td className="py-2.5 text-gray-700">{p.label}</td>
              <td className="py-2.5 text-center"><CellValue value={p.owner} /></td>
              <td className="py-2.5 text-center"><CellValue value={p.manager} /></td>
              <td className="py-2.5 text-center"><CellValue value={p.staff} /></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
