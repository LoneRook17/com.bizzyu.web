"use client"

import Link from "next/link"
import { CheckCircle2, Circle, CircleDot, Eye, Plus, Lock, ArrowRight } from "lucide-react"
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
  hero?: boolean
  cta?: { label: string; href: string }
  locked?: boolean
}

export default function TrialHome() {
  const { user } = useAuth()
  const { venues } = useVenue()
  const { mode } = useDashboardMode()

  const hasVenue = venues.length > 0
  const firstName = user?.full_name?.split(" ")[0]

  const hero =
    mode === "events"
      ? { title: "Create your first event", sub: "Takes about 2 minutes. It's queued and goes live the moment you're approved.", cta: { label: "Create event", href: "/business/v2/events/new" } }
      : mode === "hybrid"
        ? { title: "Build your first deal or event", sub: "Takes about 2 minutes. It's queued and goes live the moment you're approved.", cta: { label: "Build deal", href: "/business/v2/deals/new" } }
        : { title: "Build your first deal", sub: "Takes about 2 minutes. It's queued and goes live the moment you're approved.", cta: { label: "Build deal", href: "/business/v2/deals/new" } }

  const steps: Step[] = [
    { title: "Create your account", sub: "Welcome to Bizzy", done: true },
    { title: "Set up your venue", sub: hasVenue ? "Venue added" : "Add your location, hours, and logo", done: hasVenue, current: !hasVenue, cta: hasVenue ? undefined : { label: "Set up", href: "/business/v2/settings" } },
    { title: hero.title, sub: hero.sub, done: false, hero: true, cta: hero.cta },
    { title: "Get approved & go live", sub: "Most businesses are reviewed within 24 hours — we'll email you the moment you're live", done: false, locked: true },
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
          <Badge variant="warning">Trial</Badge>
        </div>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">Get your venue set up — you can explore everything while we review your account.</p>
      </div>

      {/* trial banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3.5">
        <Eye className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-300">
          <span className="font-semibold">Trial mode.</span> Look around the dashboard and build your first deal now —
          nothing goes live to students until your business is approved.
        </p>
      </div>

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
          {steps.map((s, i) =>
            s.hero ? (
              <div key={i} className="my-1 flex items-center gap-3.5 rounded-xl border border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-950/40 px-4 py-3.5">
                <Circle className="size-5 shrink-0 text-neutral-300 dark:text-neutral-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{s.title}</p>
                  <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">{s.sub}</p>
                </div>
                <Button asChild><Link href={s.cta!.href}><Plus /> {s.cta!.label}</Link></Button>
              </div>
            ) : (
              <div key={i} className="flex items-center gap-3.5 px-4 py-3">
                {s.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-[#05EB54]" />
                ) : s.current ? (
                  <CircleDot className="size-5 shrink-0 text-neutral-900 dark:text-neutral-100" />
                ) : (
                  <Circle className="size-5 shrink-0 text-neutral-300 dark:text-neutral-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", s.done ? "text-neutral-500 dark:text-neutral-400" : s.locked ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-900 dark:text-neutral-100")}>
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{s.sub}</p>
                </div>
                {s.locked ? (
                  <Lock className="size-4 text-neutral-300 dark:text-neutral-600" />
                ) : s.cta ? (
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={s.cta.href}>{s.cta.label} <ArrowRight className="size-3.5" /></Link>
                  </Button>
                ) : null}
              </div>
            )
          )}
        </div>
      </Card>

      {/* explore hint */}
      <p className="px-1 text-[13px] text-neutral-500 dark:text-neutral-400">
        Want to look around first? Use the sidebar to explore — anything you build is saved as a draft until you&apos;re approved.
      </p>
    </>
  )
}
