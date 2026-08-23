"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Sparkles, Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import {
  ACCESS_BUTTON_VARIANT,
  fetchDoorAccessPrograms,
  WEEKLY_ACCESS_CREATION_LABEL,
  WEEKLY_ACCESS_SECTION_LABEL,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { AccessProgramRow } from "@/components/business/v2/door-access/AccessProgramRow"

/**
 * The Weekly Access program list (V5 F14).
 *
 * Every program the business runs, active first. Programs are "ongoing by
 * nature" (D-F9.2), so this list is never filtered by date the way the events
 * list is — an active program always shows, and its next night carries the
 * "when".
 *
 * A row opens the SERIES page, never a night (D-F11.1).
 *
 * This section is ADDITIVE. The existing /business/line-skips pages stay live
 * and are not redirected here; the two systems run side by side until the F15
 * conversion moves the data across. Nothing on this page writes to a line-skip.
 */
export default function DoorAccessProgramsPage() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState<DoorAccessProgramSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Staff SEE everything; role gates what they can DO (D-F9.3). The list
  // endpoint admits staff, so there is no read gate here.
  const canBuild = user?.business_role === "owner" || user?.business_role === "manager"

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPrograms(await fetchDoorAccessPrograms())
    } catch {
      setError(`Could not load your ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} programs.`)
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const active = programs.filter((p) => p.is_active)
  const ended = programs.filter((p) => !p.is_active)

  return (
    <>
      <PageHeader
        title={WEEKLY_ACCESS_SECTION_LABEL}
        description={`${WEEKLY_ACCESS_CREATION_LABEL}. Recurring door programs that sell every night they run.`}
        actions={
          canBuild ? (
            <Button asChild variant={ACCESS_BUTTON_VARIANT}>
              <Link href="/business/door-access/new">
                <Plus /> New program
              </Link>
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[132px] rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Zap}
          title="Couldn't load programs"
          description={error}
        />
      ) : programs.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={`No ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} programs yet`}
          description={
            canBuild
              ? `A ${WEEKLY_ACCESS_CREATION_LABEL} program sells cover and skip-the-line passes for every night it runs. Set the nights once and each one is generated for you.`
              : `Your managers haven't set up a ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} program yet.`
          }
          action={
            canBuild ? (
              <Button asChild variant={ACCESS_BUTTON_VARIANT}>
                <Link href="/business/door-access/new">
                  <Plus /> New program
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <ProgramSection programs={active} />
          {ended.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Ended
              </h2>
              <ProgramSection programs={ended} />
            </div>
          )}
        </div>
      )}

      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
        Looking for the older setup? Your{" "}
        <Link href="/business/line-skips" className="font-medium text-[#05EB54] hover:underline">
          Line Skips
        </Link>{" "}
        are still running and unchanged.
      </p>
    </>
  )
}

function ProgramSection({ programs }: { programs: DoorAccessProgramSummary[] }) {
  if (programs.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {programs.map((program) => (
        <AccessProgramRow key={program.id} program={program} />
      ))}
    </div>
  )
}
