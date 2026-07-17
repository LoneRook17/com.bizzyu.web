"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import { usd } from "@/lib/v2/utils"
import type { DealListItem } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { Progress } from "@/components/business/v2/ui/progress"
import { DealFunnel } from "@/components/business/dashboard/DealFunnel"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose,
} from "@/components/business/v2/ui/dialog"

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [deal, setDeal] = useState<DealListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "delete" | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState("")

  const canManage = user?.business_role === "owner" || user?.business_role === "manager"

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiClient.get<DealListItem>(`/business/deals/${id}`)
        if (!cancelled) setDeal(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load deal")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    setActionLoading(true)
    setActionError("")
    try {
      if (confirmAction === "deactivate") {
        await apiClient.patch(`/business/deals/${id}/deactivate`)
      } else {
        await apiClient.delete(`/business/deals/${id}`)
      }
      router.push("/business/deals")
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed")
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </>
    )
  }

  if (error || !deal) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-red-500 dark:text-red-400">{error || "Deal not found"}</p>
        <Button variant="link" asChild>
          <Link href="/business/deals">Back to deals</Link>
        </Button>
      </div>
    )
  }

  const supplyPct = deal.supply_limit
    ? Math.min(((deal.claim_count ?? 0) / deal.supply_limit) * 100, 100)
    : 0

  return (
    <>
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/business/deals"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <ArrowLeft className="size-4" /> Back to deals
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{deal.deal_title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400">
            <span>{deal.deal_category}</span>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span>{deal.deal_type}</span>
            {deal.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Draft</Badge>}
            {deal.moderation_status === "pending_review" && <Badge variant="warning">In review</Badge>}
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" asChild>
              <Link href={`/business/deals/${deal.id}/edit`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
            {deal.is_active && (
              <Button variant="subtle" onClick={() => { setActionError(""); setConfirmAction("deactivate") }}>
                Deactivate
              </Button>
            )}
            <Button variant="danger" onClick={() => { setActionError(""); setConfirmAction("delete") }}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* moderation notice */}
      {deal.moderation_status === "pending_review" && deal.moderation_reason && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Under review:</span> {deal.moderation_reason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* left - image + description */}
        <div className="space-y-6 lg:col-span-2">
          {deal.deal_image_path && (
            <Card className="overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={deal.deal_image_path} alt={deal.deal_title} className="max-h-80 w-full object-cover" />
            </Card>
          )}
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Description</h2>
              <p className="whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">{deal.description}</p>
            </CardContent>
          </Card>
        </div>

        {/* right - meta + performance */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Dates</p>
                <p className="text-sm text-neutral-900 dark:text-neutral-100">
                  {fmtDate(deal.start_date)} - {fmtDate(deal.expired_date)}
                </p>
              </div>
              {deal.location && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Location</p>
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">{deal.location}</p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Total saving</p>
                <p className="text-sm text-neutral-900 dark:text-neutral-100">{usd(deal.total_saving)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Performance</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Claims</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{deal.claim_count ?? 0}</span>
                </div>
                {deal.supply_limit ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Supply</span>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {deal.claim_count ?? 0} / {deal.supply_limit}
                      </span>
                    </div>
                    <Progress value={supplyPct} />
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* engagement funnel — impressions → views → claims (DI-B3w) */}
      <DealFunnel dealId={deal.id} />

      {/* deactivate confirm */}
      <Dialog open={confirmAction === "deactivate"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate deal</DialogTitle>
            <DialogDescription>This will hide the deal from students. You can reactivate it later.</DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-sm text-red-500 dark:text-red-400">{actionError}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={actionLoading}>Cancel</Button>
            </DialogClose>
            <Button variant="subtle" onClick={handleConfirmAction} disabled={actionLoading}>
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <Dialog open={confirmAction === "delete"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete deal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-sm text-red-500 dark:text-red-400">{actionError}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={actionLoading}>Cancel</Button>
            </DialogClose>
            <Button variant="danger" onClick={handleConfirmAction} disabled={actionLoading}>
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              Delete deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
