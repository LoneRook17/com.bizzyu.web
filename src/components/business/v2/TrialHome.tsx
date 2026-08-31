"use client"

import Link from "next/link"
import { CheckCircle2, Circle, CircleDot, Eye, Plus, ArrowRight, PartyPopper, Lock } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { useDashboardMode } from "@/lib/v2/mode"
import { cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Progress } from "@/components/business/v2/ui/progress"
import { Badge } from "@/components/business/v2/ui/badge"

type Step = {
  title: string
  sub: string
  done: boolean
  current?: boolean
  optional?: boolean
  cta?: { label: string; href: string }
}

export default function TrialHome() {
  const { user, business } = useAuth()
  const { venues } = useVenue()
  const { mode } = useDashboardMode()

  const hasVenue = venues.length > 0
  const isApproved = business?.status === "approved"
  const firstName = user?.full_name?.split(" ")[0]

  const heroQueueNote = isApproved
    ? "Takes about 2 minutes. It goes live as soon as your venue is set up."
    : "Takes about 2 minutes. It's queued and goes live the moment you're approved."
  const hero =
    mode === "events"
      ? { title: "Create your first event", cta: { label: "Create event", href: "/business/create" } }
      : mode === "hybrid"
        ? { title: "Build your first deal or event", cta: { label: "Build deal", href: "/business/deals/new" } }
        : { title: "Build your first deal", cta: { label: "Build deal", href: "/business/deals/new" } }

  // Required steps gate going live; the first deal/event is optional.
  const steps: Step[] = [
    { title: "Create your account", sub: "Welcome to Bizzy", done: true },
    {
      title: "Set up your venue",
      sub: hasVenue ? "Venue added" : "Add your location, hours, and logo, students can't see you without a venue",
      done: hasVenue,
      current: !hasVenue,
      cta: hasVenue ? undefined : { label: "Add venue", href: "/business/settings?action=add-venue" },
    },
    {
      title: "Get approved",
      sub: isApproved
        ? "Approved: welcome aboard!"
        : "Most businesses are reviewed within 24 hours, we'll email you the moment you're approved",
      done: isApproved,
    },
  ]

  const doneCount = steps.filter((s) => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <>
      {/* greeting */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Welcome to Bizzy{firstName ? `, ${firstName}` : ""}
          </h1>
          {isApproved ? <Badge variant="success">Approved</Badge> : <Badge variant="warning">Trial</Badge>}
        </div>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          {isApproved
            ? "One thing left: add your venue and you're live to students."
            : "Get your venue set up. You can explore everything while we review your account."}
        </p>
      </div>

      {/* status banner */}
      {isApproved ? (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 px-4 py-3.5">
          <PartyPopper className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400" />
          <p className="text-sm leading-relaxed text-green-900 dark:text-green-300">
            <span className="font-semibold">You&apos;re approved!</span> Add your venue below to go live, students
            can&apos;t find you without a location.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3.5">
          <Eye className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-300">
            <span className="font-semibold">Trial mode.</span> Look around the dashboard, nothing goes live to
            students until your business is approved and your venue is set up.
          </p>
        </div>
      )}

      {/* path to going live */}
      <Card className="overflow-hidden">
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-100">Your path to going live</h2>
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{doneCount} of {steps.length} done</span>
          </div>
          <Progress value={pct} className="mt-3.5" />
        </div>

        <div className="px-3 py-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3.5 px-4 py-3">
              {s.done ? (
                <CheckCircle2 className="size-5 shrink-0 text-[#05EB54]" />
              ) : s.current ? (
                <CircleDot className="size-5 shrink-0 text-neutral-900 dark:text-neutral-100" />
              ) : (
                <Circle className="size-5 shrink-0 text-neutral-300 dark:text-neutral-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", s.done ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-900 dark:text-neutral-100")}>
                  {s.title}
                </p>
                <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{s.sub}</p>
              </div>
              {s.cta && (
                <Button variant={s.current ? "primary" : "secondary"} size="sm" asChild>
                  <Link href={s.cta.href}>{s.cta.label} <ArrowRight className="size-3.5" /></Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* optional: first deal/event - get a head start, not required.
          Deals and events both require a venue, so the CTA stays locked until one exists. */}
      <Card className={cn("overflow-hidden", !hasVenue && "opacity-80")}>
        <div className="flex items-center gap-3.5 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{hero.title}</p>
              <Badge variant="neutral" size="sm">Optional</Badge>
            </div>
            <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
              {hasVenue
                ? `Get a head start, ${heroQueueNote.charAt(0).toLowerCase() + heroQueueNote.slice(1)}`
                : "Needs a venue first. Deals and events are always attached to a location."}
            </p>
          </div>
          {hasVenue ? (
            <Button variant="secondary" asChild>
              <Link href={hero.cta.href}><Plus /> {hero.cta.label}</Link>
            </Button>
          ) : (
            <Button variant="secondary" asChild>
              <Link href="/business/settings?action=add-venue"><Lock className="size-3.5" /> Add venue first</Link>
            </Button>
          )}
        </div>
      </Card>

      {/* explore hint */}
      <p className="px-1 text-[13px] text-neutral-500 dark:text-neutral-400">
        Want to look around first? Use the sidebar to explore, anything you build is saved as a draft until
        you&apos;re live.
      </p>
    </>
  )
}
