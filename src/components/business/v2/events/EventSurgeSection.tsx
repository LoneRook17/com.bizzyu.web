"use client"

import { SurgeCard } from "@/components/business/SurgeCard"
import { canConfigureSurge, surgeableTiers } from "@/lib/business/surge-validation"
import type { TicketTier } from "@/lib/business/types"

/**
 * The surge block on the event manage page (D10).
 *
 * A surge ladder is per TICKET TIER, not per event — "GA" and "VIP" step up on
 * their own sold counts — so this fans out one card per priced tier rather than
 * pretending the event has a single price.
 *
 * Deliberately excluded:
 *  - free and guest tiers, which have no price to step up;
 *  - hidden tiers, which cannot be bought, so a ladder on one would be a
 *    configuration nobody can trigger.
 *
 * Renders NOTHING (no heading, no empty state) when the operator is not an
 * owner/manager, or when the event has no priced tier. An empty "Surge pricing"
 * heading on a free event is noise that implies a missing feature.
 */
export function EventSurgeSection({
  tickets,
  role,
}: {
  tickets: TicketTier[] | undefined
  role: string | null | undefined
}) {
  if (!canConfigureSurge(role)) return null

  const priced = surgeableTiers(tickets)
  if (priced.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Surge pricing</h2>
        <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
          Step the price up automatically as each tier sells. Configured per ticket tier.
        </p>
      </div>

      {priced.map((t) => (
        <SurgeCard
          key={t.ticket_id}
          entityType="event_ticket"
          entityId={t.ticket_id as number}
          role={role}
          label={t.name}
        />
      ))}
    </section>
  )
}

export default EventSurgeSection
