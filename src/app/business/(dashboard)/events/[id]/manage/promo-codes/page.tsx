"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { ArrowUpRight, Loader2, Plus, Tag } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { PromoCode } from "@/lib/business/types"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { fmtDate } from "@/components/business/v2/events/eventStatus"

function codeStatus(code: PromoCode): { label: string; variant: "success" | "neutral" } {
  const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
  const isMaxed = code.max_redemptions != null && code.current_redemptions >= code.max_redemptions
  if (!code.is_active) return { label: "Inactive", variant: "neutral" }
  if (isExpired) return { label: "Expired", variant: "neutral" }
  if (isMaxed) return { label: "Maxed", variant: "neutral" }
  return { label: "Active", variant: "success" }
}

export default function V2PromoCodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [universalCodes, setUniversalCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [deactivateTarget, setDeactivateTarget] = useState<PromoCode | null>(null)
  const [reactivatingId, setReactivatingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: "",
    max_redemptions: "",
    max_per_user: "1",
    expires_at: "",
  })

  const fetchCodes = () => {
    apiClient
      .get<{ promo_codes: PromoCode[]; universal_promo_codes?: PromoCode[] }>(`/business/events/${id}/promo-codes`)
      .then((data) => {
        setCodes(data.promo_codes)
        setUniversalCodes(data.universal_promo_codes ?? [])
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load promo codes"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCodes() }, [id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim() || !form.discount_value) return
    setCreating(true)
    setCreateError("")
    try {
      await apiClient.post(`/business/events/${id}/promo-codes`, {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions) : null,
        max_per_user: parseInt(form.max_per_user) || 1,
        expires_at: form.expires_at || null,
      })
      setForm({ code: "", discount_type: "percentage", discount_value: "", max_redemptions: "", max_per_user: "1", expires_at: "" })
      setShowCreate(false)
      fetchCodes()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create promo code")
    } finally {
      setCreating(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await apiClient.delete(`/business/events/${id}/promo-codes/${deactivateTarget.promo_code_id}`)
      fetchCodes()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to deactivate")
    } finally {
      setDeactivateTarget(null)
    }
  }

  const handleReactivate = async (code: PromoCode) => {
    setReactivatingId(code.promo_code_id)
    try {
      await apiClient.put(`/business/events/${id}/promo-codes/${code.promo_code_id}`, { is_active: true })
      fetchCodes()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reactivate")
    } finally {
      setReactivatingId(null)
    }
  }

  const activeCodes = codes.filter((c) => c.is_active)
  const inactiveCodes = codes.filter((c) => !c.is_active)

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <ManageSubheader
        eventId={id}
        title="Promo codes"
        subtitle="Offer discounts on this event."
        actions={<Button onClick={() => setShowCreate(true)}><Plus /> Create code</Button>}
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {codes.length === 0 ? (
        <EmptyState icon={Tag} title="No promo codes yet" description="Create a code to offer discounts on this event." />
      ) : activeCodes.length === 0 ? (
        <EmptyState icon={Tag} title="No active promo codes" description="Reactivate a code below or create a new one." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-xs text-neutral-500 dark:text-neutral-400">
                <th className="px-5 py-3 text-left font-medium">Code</th>
                <th className="px-5 py-3 text-left font-medium">Discount</th>
                <th className="px-5 py-3 text-right font-medium">Uses</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Expires</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {activeCodes.map((code) => {
                const status = codeStatus(code)
                return (
                  <tr key={code.promo_code_id} className="border-b border-neutral-50 dark:border-neutral-800 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100">{code.code}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-400">{code.discount_type === "percentage" ? `${code.discount_value}%` : `$${code.discount_value}`}</td>
                    <td className="px-5 py-3 text-right text-neutral-600 dark:text-neutral-400">{code.current_redemptions}{code.max_redemptions ? ` / ${code.max_redemptions}` : ""}</td>
                    <td className="px-5 py-3"><Badge variant={status.variant} size="sm">{status.label}</Badge></td>
                    <td className="px-5 py-3 text-xs text-neutral-500 dark:text-neutral-400">{code.expires_at ? fmtDate(code.expires_at) : "Never"}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setDeactivateTarget(code)} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">Deactivate</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      {/* inactive codes — reactivation restores the code with its usage counts, caps, and expiry untouched */}
      {inactiveCodes.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Inactive</h2>
          <Card className="overflow-hidden bg-neutral-50/40 dark:bg-neutral-800/40">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-xs text-neutral-500 dark:text-neutral-400">
                  <th className="px-5 py-3 text-left font-medium">Code</th>
                  <th className="px-5 py-3 text-left font-medium">Discount</th>
                  <th className="px-5 py-3 text-right font-medium">Uses</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Expires</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {inactiveCodes.map((code) => (
                  <tr key={code.promo_code_id} className="border-b border-neutral-50 dark:border-neutral-800 last:border-0 opacity-60">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100">{code.code}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-400">{code.discount_type === "percentage" ? `${code.discount_value}%` : `$${code.discount_value}`}</td>
                    <td className="px-5 py-3 text-right text-neutral-600 dark:text-neutral-400">{code.current_redemptions}{code.max_redemptions ? ` / ${code.max_redemptions}` : ""}</td>
                    <td className="px-5 py-3"><Badge variant="neutral" size="sm">Inactive</Badge></td>
                    <td className="px-5 py-3 text-xs text-neutral-500 dark:text-neutral-400">{code.expires_at ? fmtDate(code.expires_at) : "Never"}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleReactivate(code)}
                        disabled={reactivatingId === code.promo_code_id}
                        className="text-xs font-medium text-[#05EB54] hover:underline disabled:opacity-50"
                      >
                        {reactivatingId === code.promo_code_id ? "Reactivating…" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        </div>
      )}

      {/* universal venue codes (read-only) */}
      {universalCodes.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Universal promo codes</h2>
            <Link href="/business/promo-codes" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#05EB54] hover:underline">
              Manage <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <p className="-mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
            These apply to <span className="font-medium">every event at this venue</span>. They&apos;re managed under Universal promo codes, not per-event.
          </p>
          <Card className="overflow-hidden bg-neutral-50/40 dark:bg-neutral-800/40">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-xs text-neutral-500 dark:text-neutral-400">
                  <th className="px-5 py-3 text-left font-medium">Code</th>
                  <th className="px-5 py-3 text-left font-medium">Discount</th>
                  <th className="px-5 py-3 text-right font-medium">Uses</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {universalCodes.map((code) => {
                  const status = codeStatus(code)
                  return (
                    <tr key={code.promo_code_id} className="border-b border-neutral-50 dark:border-neutral-800 last:border-0">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100">
                        {code.code}
                        <Badge variant="brand" size="sm" className="ml-2 align-middle">Venue</Badge>
                      </td>
                      <td className="px-5 py-3 text-neutral-600 dark:text-neutral-400">{code.discount_type === "percentage" ? `${code.discount_value}%` : `$${code.discount_value}`}</td>
                      <td className="px-5 py-3 text-right text-neutral-600 dark:text-neutral-400">{code.current_redemptions}{code.max_redemptions ? ` / ${code.max_redemptions}` : ""}</td>
                      <td className="px-5 py-3"><Badge variant={status.variant} size="sm">{status.label}</Badge></td>
                      <td className="px-5 py-3 text-xs text-neutral-500 dark:text-neutral-400">{code.expires_at ? fmtDate(code.expires_at) : "Never"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </Card>
        </div>
      )}

      {/* create dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) setCreateError("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New promo code</DialogTitle>
            <DialogDescription>Discounts apply at checkout for this event.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs">Code</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. EARLYBIRD" className="font-mono" autoFocus />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Discount type</Label>
                <Select value={form.discount_type} onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as "percentage" | "flat" }))}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat ($)</option>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Discount value {form.discount_type === "percentage" ? "(%)" : "($)"}</Label>
                <Input type="number" min="0" max={form.discount_type === "percentage" ? "100" : undefined} step="0.01" value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Max redemptions</Label>
                <Input type="number" min="0" value={form.max_redemptions} placeholder="Unlimited" onChange={(e) => setForm((f) => ({ ...f, max_redemptions: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Max per user</Label>
                <Input type="number" min="1" value={form.max_per_user} onChange={(e) => setForm((f) => ({ ...f, max_per_user: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Expires at</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
              </div>
            </div>
            {createError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {createError}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); setCreateError("") }}>Cancel</Button>
              <Button type="submit" disabled={creating || !form.code.trim() || !form.discount_value}>
                {creating && <Loader2 className="animate-spin" />} Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* deactivate confirm */}
      <Dialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate code?</DialogTitle>
            <DialogDescription>
              <span className="font-mono">{deactivateTarget?.code}</span> will stop working at checkout.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeactivateTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeactivate}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
