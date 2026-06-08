"use client"

import Link from "next/link"
import { CheckCircle2, Circle, CircleDot, Eye, Plus, Lock, ArrowRight } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
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
  const { user, business } = useAuth()
  const { venues } = useVenue()

  const emailVerified = business?.status !== "pending_verification"
  const hasVenue = venues.length > 0
  const firstName = user?.full_name?.split(" ")[0]

  const steps: Step[] = [
    { title: "Create your account", sub: "Welcome to Bizzy", done: true },
    { title: "Verify your email", sub: emailVerified ? "Verified" : "Check your inbox for the link", done: emailVerified, cta: emailVerified ? undefined : { label: "Resend", href: "/business/v2/settings" } },
    { title: "Set up your venue", sub: hasVenue ? "Venue added" : "Add your location, hours, and logo", done: hasVenue, current: emailVerified && !hasVenue, cta: hasVenue ? undefined : { label: "Set up", href: "/business/v2/settings" } },
    { title: "Build your first deal", sub: "Takes about 2 minutes. It's queued and goes live the moment you're approved.", done: false, hero: true, cta: { label: "Build deal", href: "/business/v2/deals/new" } },
    { title: "Get approved & go live", sub: "Most venues are reviewed within 24 hours", done: false, locked: true },
  ]

  const doneCount = steps.filter((s) => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <>
      {/* greeting */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Welcome to Bizzy{firstName ? `, ${firstName}` : ""}
          </h1>
          <Badge variant="warning">Trial</Badge>
        </div>
        <p className="mt-1 text-[15px] text-neutral-600">Get your venue set up — you can explore everything while we review your account.</p>
      </div>

      {/* trial banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3.5">
        <Eye className="mt-0.5 size-5 shrink-0 text-blue-600" />
        <p className="text-sm leading-relaxed text-blue-900">
          <span className="font-semibold">Trial mode.</span> Look around the dashboard and build your first deal now —
          nothing goes live to students until your business is approved.
        </p>
      </div>

      {/* path to going live */}
      <Card className="overflow-hidden">
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-neutral-900">Your path to going live</h2>
            <span className="text-sm font-medium text-neutral-500">{doneCount} of {steps.length} done</span>
          </div>
          <Progress value={pct} className="mt-3.5" />
        </div>

        <div className="px-3 py-3">
          {steps.map((s, i) =>
            s.hero ? (
              <div key={i} className="my-1 flex items-center gap-3.5 rounded-xl border border-green-200 bg-green-50/60 px-4 py-3.5">
                <Circle className="size-5 shrink-0 text-neutral-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{s.title}</p>
                  <p className="mt-0.5 text-[13px] text-neutral-600">{s.sub}</p>
                </div>
                <Button asChild><Link href={s.cta!.href}><Plus /> {s.cta!.label}</Link></Button>
              </div>
            ) : (
              <div key={i} className="flex items-center gap-3.5 px-4 py-3">
                {s.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-[#079455]" />
                ) : s.current ? (
                  <CircleDot className="size-5 shrink-0 text-neutral-900" />
                ) : (
                  <Circle className="size-5 shrink-0 text-neutral-300" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", s.done ? "text-neutral-500" : s.locked ? "text-neutral-400" : "text-neutral-900")}>
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-neutral-500">{s.sub}</p>
                </div>
                {s.locked ? (
                  <Lock className="size-4 text-neutral-300" />
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
      <p className="px-1 text-[13px] text-neutral-500">
        Want to look around first? Use the sidebar to explore Events, Deals, and Line skips — anything you build is saved as a draft until you're approved.
      </p>
    </>
  )
}
