"use client"

// #9 venue-stripe V3-ui — the "Venue payout accounts" settings area.
//
// Backed by the six-endpoint services contract (businessStripeAccounts.ts):
// list (live-verified flags + matched_venue_ids), create (owner), onboard /
// onboard-complete continuation (?stripe=return&account_id=), set-default
// (owner; the API 422s on an un-onboarded target and we render that message
// verbatim), and the per-venue matcher (PUT /business/venues/:id/stripe-account).
//
// Locked decision 2 mitigation (non-negotiable): matching a venue to an
// account that isn't fully onboarded PAUSES sales at that venue — so the
// matcher warns loudly before confirming that state, blocked venues get an
// unmissable badge + banner, and un-matching is ONE click (no confirm) that
// instantly restores default routing.

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowUpRight,
  CheckCircle2,
  CircleX,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  TriangleAlert,
  X,
} from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import {
  useBusinessStripeAccounts,
  isStripeAccountReady,
  getVenuePayoutBlock,
} from "@/lib/business/venue-payout"
import type { BusinessStripeAccount, Venue } from "@/lib/business/types"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { Input, Select } from "@/components/business/v2/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import ConfirmDialog from "@/components/business/v2/ConfirmDialog"
import { VenuePayoutPausedBadge, VenuePayoutPausedBanner } from "./VenuePayoutPaused"

function accountDisplayName(account: BusinessStripeAccount): string {
  return account.label || `Payout account #${account.id}`
}

/** Start (or resume/reconnect) Stripe onboarding for a row and follow the link. */
async function startOnboarding(accountId: number): Promise<void> {
  const data = await apiClient.post<{ url: string }>(
    `/business/stripe-accounts/${accountId}/onboard?platform=web`
  )
  window.location.href = data.url
}

function AccountStatusChips({ account }: { account: BusinessStripeAccount }) {
  if (account.stripe_reconnect_required) {
    return (
      <Badge variant="danger" size="sm">
        <TriangleAlert className="size-3" /> Needs reconnect
      </Badge>
    )
  }
  return (
    <>
      <Badge variant={account.stripe_connect_onboarded ? "success" : "warning"} size="sm">
        {account.stripe_connect_onboarded ? "Onboarded" : "Onboarding incomplete"}
      </Badge>
      <Badge variant={account.charges_enabled ? "success" : "neutral"} size="sm">
        Charges {account.charges_enabled ? "on" : "off"}
      </Badge>
      <Badge variant={account.payouts_enabled ? "success" : "neutral"} size="sm">
        Payouts {account.payouts_enabled ? "on" : "off"}
      </Badge>
    </>
  )
}

function AccountRow({
  account,
  venues,
  isOwner,
  canManage,
  onChanged,
}: {
  account: BusinessStripeAccount
  venues: Venue[]
  isOwner: boolean
  canManage: boolean
  onChanged: () => Promise<void>
}) {
  const [onboardLoading, setOnboardLoading] = useState(false)
  const [defaultLoading, setDefaultLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = isStripeAccountReady(account)
  const matchedNames = account.matched_venue_ids
    .map((id) => venues.find((v) => v.id === id)?.name)
    .filter((name): name is string => !!name)

  const handleOnboard = async () => {
    setOnboardLoading(true)
    setError(null)
    try {
      await startOnboarding(account.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start Stripe onboarding")
      setOnboardLoading(false)
    }
  }

  const handleMakeDefault = async () => {
    setDefaultLoading(true)
    setError(null)
    try {
      await apiClient.put(`/business/stripe-accounts/${account.id}/default`)
      await onChanged()
    } catch (err) {
      // The 422 for an un-onboarded target renders the API message verbatim:
      // "Only a fully onboarded Stripe account can be the default"
      setError(err instanceof ApiError ? err.message : "Failed to set default account")
    } finally {
      setDefaultLoading(false)
    }
  }

  return (
    <div
      data-testid={`payout-account-${account.id}`}
      className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <Landmark className="size-4" />
            </span>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {accountDisplayName(account)}
            </h4>
            {account.is_default && <Badge variant="brand" size="sm">Default</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <AccountStatusChips account={account} />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {account.is_default && (matchedNames.length > 0
              ? "Receives all sales not routed to a matched venue account."
              : "Receives all ticket sales.")}
            {!account.is_default && (matchedNames.length > 0
              ? `Routes sales at: ${matchedNames.join(", ")}`
              : "Not matched to any venue yet.")}
          </p>
          {account.stripe_connect_id && (
            <p className="mt-1 font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
              {account.stripe_connect_id}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canManage && account.stripe_reconnect_required && (
            <Button size="sm" variant="danger" onClick={handleOnboard} disabled={onboardLoading}>
              {onboardLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Reconnect
            </Button>
          )}
          {canManage && !account.stripe_reconnect_required && !account.stripe_connect_onboarded && (
            <Button size="sm" variant="secondary" onClick={handleOnboard} disabled={onboardLoading}>
              {onboardLoading ? <Loader2 className="animate-spin" /> : <ArrowUpRight />} Finish onboarding
            </Button>
          )}
          {isOwner && !account.is_default && (
            <Button size="sm" variant="ghost" onClick={handleMakeDefault} disabled={defaultLoading}>
              {defaultLoading ? <Loader2 className="animate-spin" /> : null} Make default
            </Button>
          )}
        </div>
      </div>

      {account.stripe_reconnect_required && (
        <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">
          Stripe no longer recognizes this account — it may have been disconnected or deleted.
          {ready ? "" : " Venues matched to it can't sell tickets until it's reconnected."}
        </p>
      )}

      {error && (
        <p data-testid="account-row-error" className="mt-2 text-[13px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

function AddAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [label, setLabel] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    const trimmed = label.trim()
    if (!trimmed) {
      setError("Give this account a label, like the venue it will pay out to.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.post<{ account: BusinessStripeAccount; url: string }>(
        "/business/stripe-accounts?platform=web",
        { label: trimmed }
      )
      // Straight to Stripe onboarding; ?stripe=return&account_id= brings us back.
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create payout account")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!loading) { onOpenChange(next); setError(null) } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add payout account</DialogTitle>
          <DialogDescription>
            Creates a new Stripe account for this business and takes you to Stripe onboarding.
            Once onboarded, you can match venues to it so their ticket sales pay out there.
          </DialogDescription>
        </DialogHeader>
        <div>
          <label htmlFor="payout-account-label" className="mb-1.5 block text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Label
          </label>
          <Input
            id="payout-account-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Downtown bar LLC"
            maxLength={255}
            disabled={loading}
          />
        </div>
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? (<><Loader2 className="animate-spin" /> Creating…</>) : (<>Continue to Stripe <ArrowUpRight /></>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * ?stripe=return&account_id=N → verify the row via POST /:id/onboard/complete
 * and render the returned flags. ?stripe=refresh&account_id=N means the Stripe
 * onboarding session ended early — offer to resume.
 */
function AccountReturnBanner({
  accountId,
  mode,
  account,
  onVerified,
  onDismiss,
}: {
  accountId: number
  mode: "return" | "refresh"
  account: BusinessStripeAccount | undefined
  onVerified: () => Promise<void>
  onDismiss: () => void
}) {
  type CompleteResponse = {
    id: number
    stripe_connect_id: string
    charges_enabled: boolean
    payouts_enabled: boolean
    onboarded: boolean
    reconnect_required?: boolean
  }
  const [status, setStatus] = useState<"verifying" | "done" | "failed">(
    mode === "return" ? "verifying" : "failed"
  )
  const [result, setResult] = useState<CompleteResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const verifyStarted = useRef(false)

  const verify = useCallback(async () => {
    setStatus("verifying")
    setError(null)
    try {
      const data = await apiClient.post<CompleteResponse>(
        `/business/stripe-accounts/${accountId}/onboard/complete`
      )
      setResult(data)
      setStatus("done")
      await onVerified()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to verify Stripe onboarding")
      setStatus("failed")
    }
  }, [accountId, onVerified])

  useEffect(() => {
    if (mode !== "return" || verifyStarted.current) return
    verifyStarted.current = true
    verify()
  }, [mode, verify])

  const handleResume = async () => {
    setResumeLoading(true)
    setError(null)
    try {
      await startOnboarding(accountId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start Stripe onboarding")
      setResumeLoading(false)
    }
  }

  const name = account ? `“${accountDisplayName(account)}”` : `payout account #${accountId}`

  if (status === "verifying") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
        <Loader2 className="size-4 animate-spin" /> Verifying Stripe onboarding for {name}…
      </div>
    )
  }

  if (status === "done" && result?.onboarded) {
    return (
      <div data-testid="account-return-banner" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 px-4 py-3">
        <div className="flex items-start gap-2 text-sm font-medium text-green-700 dark:text-green-400">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            {name} finished Stripe onboarding — charges and payouts are enabled. You can now match
            venues to it or make it the default.
          </span>
        </div>
        <button onClick={onDismiss} className="shrink-0 rounded-lg p-1 text-green-700/70 hover:bg-green-100 dark:text-green-400/70 dark:hover:bg-green-900/40">
          <X className="size-4" /><span className="sr-only">Dismiss</span>
        </button>
      </div>
    )
  }

  const reconnectRequired = result?.reconnect_required === true

  return (
    <div data-testid="account-return-banner" className="mb-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
      <div className="flex items-start justify-between gap-3">
        <div>
          {reconnectRequired ? (
            <p>Stripe no longer recognizes the account behind {name}. Reconnect it to continue.</p>
          ) : mode === "refresh" ? (
            <p>Your Stripe onboarding session for {name} ended before finishing.</p>
          ) : (
            <p>Stripe onboarding for {name} isn&apos;t finished yet.</p>
          )}
          {status === "done" && result && !reconnectRequired && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span className="inline-flex items-center gap-1">
                {result.charges_enabled ? <CheckCircle2 className="size-3.5" /> : <CircleX className="size-3.5" />}
                Charges {result.charges_enabled ? "enabled" : "not enabled"}
              </span>
              <span className="inline-flex items-center gap-1">
                {result.payouts_enabled ? <CheckCircle2 className="size-3.5" /> : <CircleX className="size-3.5" />}
                Payouts {result.payouts_enabled ? "enabled" : "not enabled"}
              </span>
            </p>
          )}
          {error && <p className="mt-1 text-[13px] text-red-600 dark:text-red-400">{error}</p>}
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              onClick={handleResume}
              disabled={resumeLoading}
              className="cursor-pointer text-[13px] font-semibold text-[#05EB54] hover:underline disabled:opacity-50"
            >
              {resumeLoading ? "Opening Stripe…" : reconnectRequired ? "Reconnect account" : "Resume onboarding"}
            </button>
            {mode === "return" && (
              <button onClick={verify} className="cursor-pointer text-[13px] font-semibold text-[#05EB54] hover:underline">
                Check again
              </button>
            )}
          </div>
        </div>
        <button onClick={onDismiss} className="shrink-0 rounded-lg p-1 text-amber-700/70 hover:bg-amber-100 dark:text-amber-400/70 dark:hover:bg-amber-900/40">
          <X className="size-4" /><span className="sr-only">Dismiss</span>
        </button>
      </div>
    </div>
  )
}

function VenueMatcherRow({
  venue,
  accounts,
  canManage,
  onChanged,
}: {
  venue: Venue
  accounts: BusinessStripeAccount[]
  canManage: boolean
  onChanged: () => Promise<void>
}) {
  const currentId = venue.business_stripe_account_id ?? null
  const currentAccount = currentId !== null ? accounts.find((a) => a.id === currentId) : undefined
  const blockReason = getVenuePayoutBlock(venue, accounts)

  // A pending assignment awaiting the locked-decision-2 confirm (target not fully onboarded).
  const [pendingAccount, setPendingAccount] = useState<BusinessStripeAccount | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assign = async (accountId: number | null) => {
    setSaving(true)
    setError(null)
    try {
      await apiClient.put(`/business/venues/${venue.id}/stripe-account`, {
        business_stripe_account_id: accountId,
      })
      await onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update venue payout account")
    } finally {
      setSaving(false)
      setPendingAccount(null)
    }
  }

  const handleSelect = (value: string) => {
    const targetId = value === "" ? null : Number(value)
    if (targetId === currentId) return
    if (targetId !== null) {
      const target = accounts.find((a) => a.id === targetId)
      if (!target) return
      if (!isStripeAccountReady(target)) {
        // Locked decision 2: matching an un-onboarded account pauses sales —
        // never let that happen without a loud, explicit confirmation.
        setPendingAccount(target)
        return
      }
      assign(targetId)
      return
    }
    assign(null)
  }

  return (
    <div
      data-testid={`venue-matcher-${venue.id}`}
      className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{venue.name}</h4>
            {blockReason && <VenuePayoutPausedBadge />}
          </div>
          {venue.address && (
            <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{venue.address}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Select
            aria-label={`Payout account for ${venue.name}`}
            className="w-56"
            value={currentId === null ? "" : String(currentId)}
            onChange={(e) => handleSelect(e.target.value)}
            disabled={!canManage || saving}
          >
            <option value="">Default payout account</option>
            {/* A dangling match (deleted account row) still needs to display. */}
            {currentId !== null && !currentAccount && (
              <option value={String(currentId)} disabled>
                Deleted account #{currentId}
              </option>
            )}
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {accountDisplayName(a)}
                {a.is_default ? " (default)" : ""}
                {!isStripeAccountReady(a)
                  ? a.stripe_reconnect_required ? " — needs reconnect" : " — not onboarded"
                  : ""}
              </option>
            ))}
          </Select>
          {canManage && currentId !== null && (
            // One click, no confirm — instantly restores default routing
            // (locked decision 2: a stalled Stripe verification must never
            // strand a door further than one click).
            <Button size="sm" variant="secondary" onClick={() => assign(null)} disabled={saving} data-testid={`unassign-venue-${venue.id}`}>
              {saving ? <Loader2 className="animate-spin" /> : <X />} Unassign
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}

      {blockReason && (
        <VenuePayoutPausedBanner venueName={venue.name} reason={blockReason} className="mt-3" />
      )}

      <ConfirmDialog
        open={!!pendingAccount}
        onOpenChange={(open) => { if (!open) setPendingAccount(null) }}
        onConfirm={() => { if (pendingAccount) assign(pendingAccount.id) }}
        title={`Pause ticket sales at ${venue.name}?`}
        description={
          <>
            <span className="font-semibold text-red-600 dark:text-red-400">
              Ticket sales at this venue will PAUSE until this account finishes Stripe onboarding.
            </span>{" "}
            &ldquo;{pendingAccount ? accountDisplayName(pendingAccount) : ""}&rdquo; can&apos;t take
            payments yet, and Bizzy never silently falls back to another account — every checkout at{" "}
            {venue.name} will be blocked until onboarding completes. You can un-match the account at
            any time to instantly restore default routing.
          </>
        }
        confirmLabel="Match & pause sales"
        variant="danger"
        loading={saving}
        error={error}
      />
    </div>
  )
}

export default function VenuePayoutAccountsSection() {
  const { user } = useAuth()
  const role = user?.business_role
  const isOwner = role === "owner"
  const canManage = role === "owner" || role === "manager"

  const { accounts, loading, error, refresh } = useBusinessStripeAccounts()
  const { venues, refreshVenues } = useVenue()

  const router = useRouter()
  const searchParams = useSearchParams()
  const stripeParam = searchParams.get("stripe")
  const accountIdParam = searchParams.get("account_id")
  const returnAccountId = accountIdParam ? Number(accountIdParam) : null
  const returnMode =
    returnAccountId && Number.isInteger(returnAccountId) && (stripeParam === "return" || stripeParam === "refresh")
      ? stripeParam
      : null

  const [addOpen, setAddOpen] = useState(false)

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), refreshVenues()])
  }, [refresh, refreshVenues])

  const dismissReturnBanner = useCallback(() => {
    router.replace("/business/settings?tab=payments", { scroll: false })
  }, [router])

  const header = (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Venue payout accounts</h3>
        <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
          Route each venue&apos;s ticket sales to its own Stripe account. Unmatched venues pay out to
          your default account.
        </p>
      </div>
      {isOwner && (
        <Button size="sm" onClick={() => setAddOpen(true)} data-testid="add-payout-account">
          <Plus /> Add account
        </Button>
      )}
    </div>
  )

  // Staff/promoter roles can't call the accounts API — say so instead of
  // rendering a broken section.
  if (!canManage) {
    return (
      <section id="venue-payout-accounts" className="mt-5">
        {header}
        <Card>
          <CardContent className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Venue payout accounts are managed by owners and managers.
          </CardContent>
        </Card>
      </section>
    )
  }

  if (loading && accounts === null) {
    return (
      <section id="venue-payout-accounts" className="mt-5">
        {header}
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </section>
    )
  }

  // Degraded: the list fetch failed. Never hide the section silently — a
  // paused venue must stay diagnosable even when this API is down.
  if (accounts === null) {
    return (
      <section id="venue-payout-accounts" className="mt-5">
        {header}
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="py-6 text-center">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Couldn&apos;t load your payout accounts.
            </p>
            <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
              {error || "Something went wrong."} Venue-specific payout routing (including any paused
              venues) can&apos;t be shown right now.
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refresh()}>
              <RefreshCw /> Retry
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  const activeVenues = venues.filter((v) => v.is_active)
  const anyVenueMatched = activeVenues.some((v) => (v.business_stripe_account_id ?? null) !== null)
  const showMatcher = accounts.length > 1 || anyVenueMatched

  return (
    <section id="venue-payout-accounts" className="mt-5">
      {header}

      {returnMode && (
        <AccountReturnBanner
          accountId={returnAccountId!}
          mode={returnMode}
          account={accounts.find((a) => a.id === returnAccountId)}
          onVerified={refreshAll}
          onDismiss={dismissReturnBanner}
        />
      )}

      {/* Stale-but-usable list: a background refresh failed but we still have data. */}
      {error && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-[13px] text-amber-700 dark:text-amber-400">
          <span>Couldn&apos;t refresh payout accounts — showing the last loaded state.</span>
          <button onClick={() => refresh()} className="shrink-0 cursor-pointer font-semibold hover:underline">Retry</button>
        </div>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Landmark className="size-6 text-neutral-400 dark:text-neutral-500" />
            </span>
            <h4 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">No payout accounts yet</h4>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              Connect your business Stripe account above to create your default payout account.
              {isOwner ? " You can then add more accounts here and route specific venues' ticket sales to them." : ""}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              venues={activeVenues}
              isOwner={isOwner}
              canManage={canManage}
              onChanged={refreshAll}
            />
          ))}
        </div>
      )}

      {accounts.length === 1 && (
        <p className="mt-3 text-[13px] text-neutral-500 dark:text-neutral-400">
          All ticket sales currently pay out to your default account.
          {isOwner
            ? " Add a payout account to route a specific venue's sales to a different Stripe account."
            : " The business owner can add payout accounts to route specific venues elsewhere."}
        </p>
      )}

      {showMatcher && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Venue routing</h4>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            Match a venue to a payout account. Sales at that venue pay out there instead of the
            default account.
          </p>
          <div className="mt-3 space-y-3">
            {activeVenues.length === 0 ? (
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                No active venues yet — add a venue in the Venues tab first.
              </p>
            ) : (
              activeVenues.map((venue) => (
                <VenueMatcherRow
                  key={venue.id}
                  venue={venue}
                  accounts={accounts}
                  canManage={canManage}
                  onChanged={refreshAll}
                />
              ))
            )}
          </div>
        </div>
      )}

      <AddAccountDialog open={addOpen} onOpenChange={setAddOpen} />
    </section>
  )
}
