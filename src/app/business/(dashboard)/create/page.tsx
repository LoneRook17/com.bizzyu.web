"use client"

import Link from "next/link"
import { Check, DoorOpen, PartyPopper, Lock, type LucideIcon } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import {
  ACCESS_ACCENT,
  EVENT_ACCENT,
  EVENT_TYPE_LABEL,
  WEEKLY_ACCESS_CREATION_LABEL,
  WEEKLY_ACCESS_TYPE_LABEL,
} from "@/lib/business/door-access"
import {
  IN_APP_CHOICE_BODY,
  IN_APP_CHOICE_TITLE,
  InAppIconTile,
  InAppSelectedCheck,
  inAppChoiceSurfaceStyle,
} from "@/components/business/v2/create/in-app-choice"
import RequireVenue from "@/components/business/v2/RequireVenue"
import { EmptyState } from "@/components/business/v2/ui/empty-state"

/**
 * Flutter CreateChoicePage. "What are you setting up?"
 *
 * Dark charcoal cards with a thin green / pink outline — not neon-filled
 * blocks. Event is the green tile; Weekly Cover is the pink tile with the
 * Low Maintenance Option chip. The dashboard is already scoped to a venue,
 * so this is Flutter screen 1 with the venue picker skipped.
 */
export default function CreateFunnelPage() {
  const { user } = useAuth()
  const canCreate = user?.business_role === "owner" || user?.business_role === "manager"

  if (!canCreate) {
    return (
      <EmptyState
        icon={Lock}
        title="You can't create here"
        description="Only owners and managers can set up events and access programs. Ask a manager on your team to add one."
      />
    )
  }

  return (
    <RequireVenue>
      <div className="flex max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          What are you setting up?
        </h1>

        <ChoiceCard
          href="/business/events/new"
          kindLabel={EVENT_TYPE_LABEL}
          accent={EVENT_ACCENT}
          icon={PartyPopper}
          title="An event"
          blurb="One night with a name: a show, a party, a mixer. Sell tickets or let people in free."
          bullets={[
            "Pick a date and time",
            "As many ticket tiers as you want",
            "Optional weekly repeat",
            "Scan with the in-app Bizzy scanner",
          ]}
        />

        <ChoiceCard
          href="/business/door-access/new"
          kindLabel={WEEKLY_ACCESS_TYPE_LABEL}
          accent={ACCESS_ACCENT}
          icon={DoorOpen}
          title={WEEKLY_ACCESS_CREATION_LABEL}
          tag="Low Maintenance Option"
          blurb="Your regular nights, sold ahead. Set your prices once and they run every week."
          bullets={[
            "Pick the nights it runs",
            "Cover and Skip the Line. Price them per night.",
            "No staff setup. Scan with any phone camera.",
          ]}
        />
      </div>
    </RequireVenue>
  )
}

function ChoiceCard({
  href,
  kindLabel,
  accent,
  icon,
  title,
  tag,
  blurb,
  bullets,
}: {
  href: string
  kindLabel: string
  accent: string
  icon: LucideIcon
  title: string
  tag?: string
  blurb: string
  bullets: string[]
}) {
  return (
    <Link
      href={href}
      style={inAppChoiceSurfaceStyle(accent, true)}
      className="group flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <div className="flex items-center gap-3">
        <InAppIconTile accent={accent} icon={icon} />
        <span className="flex-1 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: accent }}>
          {kindLabel}
        </span>
        <InAppSelectedCheck
          accent={accent}
          selected={false}
          className="group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold" style={{ color: IN_APP_CHOICE_TITLE }}>
          {title}
        </h2>
        {tag && (
          <span
            className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ borderColor: accent, color: accent }}
          >
            {tag}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: IN_APP_CHOICE_BODY }}>
        {blurb}
      </p>

      <ul className="mt-5 flex flex-col gap-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
            <span className="text-[13px] leading-snug" style={{ color: IN_APP_CHOICE_BODY }}>
              {bullet}
            </span>
          </li>
        ))}
      </ul>
    </Link>
  )
}
