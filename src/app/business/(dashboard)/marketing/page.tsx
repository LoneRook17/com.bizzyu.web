"use client"

import { useState } from "react"
import { useAuth } from "@/lib/business/auth-context"
import EventsTab from "@/components/business/dashboard/marketing/EventsTab"
import FollowingTab from "@/components/business/dashboard/marketing/FollowingTab"

type TabKey = "events" | "followers"

/**
 * Marketing dashboard — two send-paths surface to owners and managers.
 *
 *   • Events    — pick one event, blast that event's audience via the
 *                 existing per-event composers under /business/events/[id]/manage/.
 *   • Following — blast everyone who follows the business (audience:
 *                 {all_followers: true}). Independent of ticket purchase.
 *
 * The old Attendees / Tags / Campaigns surface was dropped in favor of these
 * two clearer mental models. Per-event Announcement + SMS Blast menu items
 * stay on each event's manage page as a power-user shortcut.
 */
export default function MarketingPage() {
  const { user } = useAuth()
  const role = user?.business_role
  const canSend = role === "owner" || role === "manager"

  const [tab, setTab] = useState<TabKey>("events")

  if (!canSend) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-600">
          Only owners and managers can send marketing blasts.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold text-ink">Marketing</h1>
      <div role="tablist" className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        <TabPill active={tab === "events"} onClick={() => setTab("events")}>
          Events
        </TabPill>
        <TabPill
          active={tab === "followers"}
          onClick={() => setTab("followers")}
        >
          Following
        </TabPill>
      </div>
      {tab === "events" ? <EventsTab /> : <FollowingTab />}
    </div>
  )
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-white text-primary shadow-sm"
          : "text-gray-600 hover:text-ink"
      }`}
    >
      {children}
    </button>
  )
}
