"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Zap } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import {
  DEFAULT_SERIES_LOOKAHEAD_DAYS,
  loadDoorAccessSeriesForPath,
  MISSING_PROGRAM_ID_DESCRIPTION,
  MISSING_PROGRAM_ID_TITLE,
  parseProgramPathId,
  programEditHref,
  WEEKLY_ACCESS_SECTION_LABEL,
  type DoorAccessNight,
  type DoorAccessProgram,
} from "@/lib/business/door-access"
import type { BusinessProfile } from "@/lib/business/types"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Button } from "@/components/business/v2/ui/button"
import RequireVenue from "@/components/business/v2/RequireVenue"
import { DoorAccessWizard } from "@/components/business/v2/door-access/DoorAccessWizard"

/**
 * Dedicated Weekly Access template editor.
 *
 * Same fields as create (DoorAccessWizard), for this program id. The series
 * page stays view + tap a night; this route is the only place to change
 * nights of week, door hours, default tiers, and flyer for the whole program.
 */
export default function EditDoorAccessProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const programId = parseProgramPathId(id)
  const router = useRouter()
  const { user } = useAuth()
  const [program, setProgram] = useState<DoorAccessProgram | null>(null)
  /**
   * The program's scheduled nights.
   *
   * The weekday editors hydrate from THESE, not from the program row: services
   * takes a `weekday_edits` map on a write and never echoes it back on a GET, so
   * a weekday editor seeded from the program opens on template defaults and the
   * host's saved Thursday price is invisible, and then the next save pushes the
   * template back over it. The nights are the only durable record of "Thursdays
   * are $15".
   */
  const [nights, setNights] = useState<DoorAccessNight[]>([])
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(programId != null)
  const [error, setError] = useState<string | null>(null)

  // Same gate as create (owner/manager). Staff can view the series, not edit it.
  const canBuild = user?.business_role === "owner" || user?.business_role === "manager"

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (programId == null) {
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      let redirected = false
      try {
        const [loaded] = await Promise.all([
          loadDoorAccessSeriesForPath(programId, DEFAULT_SERIES_LOOKAHEAD_DAYS),
          apiClient
            .get<BusinessProfile>("/business/profile")
            .then((p) => {
              if (!cancelled) setProfile(p)
            })
            .catch(() => {}),
        ])
        if (loaded.redirectTo != null) {
          redirected = true
          router.replace(programEditHref(loaded.redirectTo))
          return
        }
        if (!loaded.ok || !loaded.series) {
          if (!cancelled) setError("Could not load this program.")
          return
        }
        if (!cancelled) {
          setProgram(loaded.series.program)
          setNights(loaded.series.nights)
        }
      } catch {
        if (!cancelled) setError("Could not load this program.")
      } finally {
        if (!cancelled && !redirected) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [programId, router])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!canBuild) {
    return (
      <EmptyState
        icon={Lock}
        title="You can't edit here"
        description={`Only owners and managers can change a ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} program.`}
      />
    )
  }

  if (programId == null) {
    return (
      <EmptyState
        icon={Zap}
        title={MISSING_PROGRAM_ID_TITLE}
        description={MISSING_PROGRAM_ID_DESCRIPTION}
        action={
          <Button asChild variant="secondary">
            <Link href="/business/door-access">{`Back to ${WEEKLY_ACCESS_SECTION_LABEL}`}</Link>
          </Button>
        }
      />
    )
  }

  if (error || !program) {
    return (
      <EmptyState
        icon={Zap}
        title="Program not found"
        description={error ?? `This ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} program isn't available.`}
        action={
          <Button asChild variant="secondary">
            <Link href="/business/door-access">{`Back to ${WEEKLY_ACCESS_SECTION_LABEL}`}</Link>
          </Button>
        }
      />
    )
  }

  const isPending =
    profile?.status === "pending" ||
    profile?.status === "pending_approval" ||
    profile?.status === "pending_verification"

  return (
    <RequireVenue>
      <DoorAccessWizard
        mode="edit"
        programId={program.id || programId}
        initialData={program}
        initialNights={nights}
        stripeOnboarded={profile?.stripe_connect_onboarded ?? true}
        isPending={isPending}
      />
    </RequireVenue>
  )
}
