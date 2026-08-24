"use client"

import { Lock } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { CreateChoiceCards } from "@/components/business/v2/create/CreateChoiceCards"
import RequireVenue from "@/components/business/v2/RequireVenue"
import { EmptyState } from "@/components/business/v2/ui/empty-state"

/**
 * Flutter CreateChoicePage. "What are you setting up?"
 *
 * Thin green / pink outline — not neon-filled blocks. Event is the green
 * tile; Weekly Cover is the pink tile with the Low Maintenance Option chip.
 * Light uses dash white / ink; dark keeps the in-app charcoal. The
 * dashboard is already scoped to a venue, so this is Flutter screen 1
 * with the venue picker skipped.
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
        <CreateChoiceCards />
      </div>
    </RequireVenue>
  )
}
