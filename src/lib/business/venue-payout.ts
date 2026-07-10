"use client"

// #9 venue-stripe V3-ui — shared client-side state for the "Venue payout
// accounts" settings area and the operator paused-venue badges/banners
// (settings venue cards + event manage pages).
//
// Block semantics mirror the services resolver (StripeManager tier-0 venue
// lookup, locked decision 2): a venue matched to an account that can't take
// charges yet BLOCKS every sale at that venue — never a silent fallback to
// the default account. The reasons here are the same three the resolver
// raises in `venue_stripe_account_not_ready` payloads.

import { useCallback, useEffect, useState } from "react"
import { apiClient, ApiError } from "./api-client"
import { useAuth } from "./auth-context"
import type { BusinessStripeAccount, Venue } from "./types"

export type VenuePayoutBlockReason =
  | "dangling_account" // venue points at an account row that no longer exists
  | "no_connect_account" // account row exists but Stripe onboarding never started
  | "not_onboarded" // onboarding started but the account can't take charges/payouts yet

/** Fully usable as a sale destination: onboarded, both flags, and Stripe still recognizes it. */
export function isStripeAccountReady(account: BusinessStripeAccount): boolean {
  return (
    !account.stripe_reconnect_required &&
    !!account.stripe_connect_id &&
    account.stripe_connect_onboarded &&
    account.charges_enabled &&
    account.payouts_enabled
  )
}

/**
 * Why sales at this venue are paused, or null when the venue routes normally
 * (unmatched venues route to the business default — never blocked from here).
 * Returns null while `accounts` hasn't loaded: an unproven block is never shown.
 */
export function getVenuePayoutBlock(
  venue: Pick<Venue, "business_stripe_account_id">,
  accounts: BusinessStripeAccount[] | null
): VenuePayoutBlockReason | null {
  const accountId = venue.business_stripe_account_id ?? null
  if (accountId === null || !accounts) return null
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return "dangling_account"
  if (!account.stripe_connect_id) return "no_connect_account"
  if (!isStripeAccountReady(account)) return "not_onboarded"
  return null
}

/** Operator-facing copy per block reason (buyer copy lives in venue-stripe-block.ts). */
export function venuePayoutBlockCopy(reason: VenuePayoutBlockReason): string {
  if (reason === "dangling_account") {
    return "This venue is matched to a payout account that no longer exists. Every checkout at this venue is blocked."
  }
  return "This venue is matched to a payout account that hasn't finished Stripe onboarding. Every checkout at this venue is blocked until onboarding completes."
}

export interface UseBusinessStripeAccountsResult {
  /** null until the first successful load (or when the caller can't view them). */
  accounts: BusinessStripeAccount[] | null
  loading: boolean
  error: string | null
  /** Whether this role may call GET /business/stripe-accounts (owner/manager). */
  canView: boolean
  refresh: () => Promise<void>
}

/**
 * GET /business/stripe-accounts, gated to owner/manager (the API 403s other
 * roles). Non-viewers resolve immediately with accounts=null so paused badges
 * simply don't render for them.
 */
export function useBusinessStripeAccounts(): UseBusinessStripeAccountsResult {
  const { user } = useAuth()
  const role = user?.business_role
  const canView = role === "owner" || role === "manager"

  const [accounts, setAccounts] = useState<BusinessStripeAccount[] | null>(null)
  const [loading, setLoading] = useState(canView)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!canView) {
      setLoading(false)
      return
    }
    try {
      const data = await apiClient.get<{ accounts: BusinessStripeAccount[] }>("/business/stripe-accounts")
      setAccounts(data.accounts)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load payout accounts")
    } finally {
      setLoading(false)
    }
  }, [canView])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { accounts, loading, error, canView, refresh }
}
