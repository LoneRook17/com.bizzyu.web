"use client"

import Link from "next/link"
import { ChevronRight, Check, DoorOpen, PartyPopper, Lock } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import {
  ACCESS_ACCENT,
  ACCESS_INK,
  EVENT_ACCENT,
  EVENT_TYPE_LABEL,
  WEEKLY_ACCESS_CREATION_LABEL,
  WEEKLY_ACCESS_TYPE_LABEL,
} from "@/lib/business/door-access"
import RequireVenue from "@/components/business/v2/RequireVenue"
import { EmptyState } from "@/components/business/v2/ui/empty-state"

/**
 * Flutter CreateChoicePage. "What are you setting up?"
 *
 * Event is the green card. Weekly Cover is the pink card with the
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
          fill={EVENT_ACCENT}
          ink="#0A1F0E"
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
          fill={ACCESS_ACCENT}
          ink={ACCESS_INK}
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
  fill,
  ink,
  icon: Icon,
  title,
  tag,
  blurb,
  bullets,
}: {
  href: string
  kindLabel: string
  fill: string
  ink: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  tag?: string
  blurb: string
  bullets: string[]
}) {
  return (
    <Link
      href={href}
      style={{ backgroundColor: fill, color: ink, borderColor: fill }}
      className="group flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${ink}1a` }}
        >
          <Icon className="size-6" style={{ color: ink }} />
        </span>
        <span className="flex-1 text-[13px] font-extrabold uppercase tracking-wider" style={{ color: ink }}>
          {kindLabel}
        </span>
        <ChevronRight className="size-5 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold" style={{ color: ink }}>
          {title}
        </h2>
        {tag && (
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: `${ink}1a`, color: ink }}
          >
            {tag}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[14px] leading-relaxed opacity-90">{blurb}</p>

      <ul className="mt-5 flex flex-col gap-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0" style={{ color: ink }} />
            <span className="text-[13px] leading-snug">{bullet}</span>
          </li>
        ))}
      </ul>
    </Link>
  )
}
