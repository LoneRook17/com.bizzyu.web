"use client"

import { Check, Minus, Shield } from "lucide-react"
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { Button } from "@/components/business/v2/ui/button"

interface RolePermissionsDialogProps {
  /** Which table to show: "event" for the event-level roles, "business" for business-level roles */
  variant: "event" | "business"
}

/* Event-level permissions (Owner / Co-host / Crew) */
const EVENT_PERMISSIONS: { label: string; owner: boolean; cohost: boolean; crew: boolean }[] = [
  { label: "Edit event", owner: true, cohost: true, crew: false },
  { label: "View analytics", owner: true, cohost: true, crew: false },
  { label: "Scan tickets", owner: true, cohost: true, crew: true },
  { label: "Door sales", owner: true, cohost: true, crew: true },
  { label: "Promo codes", owner: true, cohost: true, crew: false },
  { label: "Tracking links", owner: true, cohost: true, crew: false },
  { label: "Manage team", owner: true, cohost: false, crew: false },
  { label: "Scanner links", owner: true, cohost: true, crew: false },
  { label: "Delete event", owner: true, cohost: false, crew: false },
]

/* Business-level permissions (Owner / Manager / Staff) */
type BizPerm = { label: string; owner: string; manager: string; staff: string }
const section = (heading: string): BizPerm => ({ label: heading, owner: "", manager: "", staff: "" })

const BUSINESS_PERMISSIONS: BizPerm[] = [
  section("Business profile"),
  { label: "View business overview", owner: "yes", manager: "yes", staff: "yes" },
  { label: "Edit business info", owner: "yes", manager: "yes", staff: "no" },
  { label: "Delete / deactivate business", owner: "yes", manager: "no", staff: "no" },

  section("Events"),
  { label: "View all events", owner: "yes", manager: "yes", staff: "yes" },
  { label: "Create events", owner: "yes", manager: "yes", staff: "no" },
  { label: "Edit / cancel events", owner: "yes", manager: "yes", staff: "no" },
  { label: "Duplicate past events", owner: "yes", manager: "yes", staff: "no" },
  { label: "Scan tickets / check in", owner: "yes", manager: "yes", staff: "yes" },

  section("Deals"),
  { label: "View all deals", owner: "yes", manager: "yes", staff: "yes" },
  { label: "Create deals", owner: "yes", manager: "yes", staff: "yes" },
  { label: "Edit / deactivate deals", owner: "yes", manager: "yes", staff: "Own only" },
  { label: "Delete deals", owner: "yes", manager: "yes", staff: "no" },

  section("Analytics"),
  { label: "View free-tier analytics", owner: "yes", manager: "yes", staff: "no" },
  { label: "View paid AI insights", owner: "yes", manager: "yes", staff: "no" },
  { label: "Export analytics data", owner: "yes", manager: "yes", staff: "no" },

  section("Team management"),
  { label: "View team members", owner: "yes", manager: "yes", staff: "yes" },
  { label: "Add team members", owner: "yes", manager: "yes", staff: "no" },
  { label: "Remove team members", owner: "yes", manager: "Not owner", staff: "no" },
  { label: "Change member roles", owner: "yes", manager: "Staff only", staff: "no" },
  { label: "Transfer ownership", owner: "yes", manager: "no", staff: "no" },

  section("Financial / billing"),
  { label: "View revenue & payouts", owner: "yes", manager: "no", staff: "no" },
  { label: "Manage Stripe Connect", owner: "yes", manager: "no", staff: "no" },
  { label: "Manage subscription / billing", owner: "yes", manager: "no", staff: "no" },
  { label: "Set promo codes & pricing", owner: "yes", manager: "yes", staff: "no" },
]

function Yes() {
  return <Check className="mx-auto size-4 text-[#05EB54]" />
}
function No() {
  return <Minus className="mx-auto size-3.5 text-neutral-300 dark:text-neutral-600" />
}
function CellValue({ value }: { value: string }) {
  if (value === "yes") return <Yes />
  if (value === "no" || value === "") return <No />
  return <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{value}</span>
}

export default function RolePermissionsDialog({ variant }: RolePermissionsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Shield /> Role permissions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Role permissions</DialogTitle>
          <DialogDescription>
            {variant === "event"
              ? "What each event team role can do."
              : "What each business team role can do."}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 max-h-[65vh] overflow-y-auto px-1">
          {variant === "event" ? <EventTable /> : <BusinessTable />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EventTable() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-200 dark:border-neutral-800">
          <th className="w-1/2 py-2 text-left font-semibold text-neutral-900 dark:text-neutral-100">Permission</th>
          <th className="py-2 text-center font-semibold text-neutral-900 dark:text-neutral-100">Owner</th>
          <th className="py-2 text-center font-semibold text-neutral-900 dark:text-neutral-100">Co-host</th>
          <th className="py-2 text-center font-semibold text-neutral-900 dark:text-neutral-100">Crew</th>
        </tr>
      </thead>
      <tbody>
        {EVENT_PERMISSIONS.map((p) => (
          <tr key={p.label} className="border-b border-neutral-100 dark:border-neutral-800">
            <td className="py-2.5 text-neutral-700 dark:text-neutral-300">{p.label}</td>
            <td className="py-2.5 text-center">{p.owner ? <Yes /> : <No />}</td>
            <td className="py-2.5 text-center">{p.cohost ? <Yes /> : <No />}</td>
            <td className="py-2.5 text-center">{p.crew ? <Yes /> : <No />}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BusinessTable() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-200 dark:border-neutral-800">
          <th className="w-2/5 py-2 text-left font-semibold text-neutral-900 dark:text-neutral-100">Permission</th>
          <th className="py-2 text-center font-semibold text-neutral-900 dark:text-neutral-100">Owner</th>
          <th className="py-2 text-center font-semibold text-neutral-900 dark:text-neutral-100">Manager</th>
          <th className="py-2 text-center font-semibold text-neutral-900 dark:text-neutral-100">Staff</th>
        </tr>
      </thead>
      <tbody>
        {BUSINESS_PERMISSIONS.map((p, i) => {
          if (!p.owner && !p.manager && !p.staff) {
            return (
              <tr key={i}>
                <td colSpan={4} className="pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {p.label}
                </td>
              </tr>
            )
          }
          return (
            <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
              <td className="py-2.5 text-neutral-700 dark:text-neutral-300">{p.label}</td>
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
