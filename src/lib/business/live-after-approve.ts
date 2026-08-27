/**
 * After admin approval, posts go live immediately. Money stays in escrow
 * until Stripe. Drafts created during trial must not stay invisible on
 * Upcoming — the dash promotes them and treats them as live.
 */

export function isApprovedBusinessStatus(status: string | null | undefined): boolean {
  return (status ?? "").toLowerCase() === "approved"
}

export function shouldPromoteQueuedDrafts(isPending: boolean): boolean {
  return !isPending
}

export function shouldTreatDraftAsLive(isPending: boolean): boolean {
  return !isPending
}

export function liveAfterApproveStorageKey(businessId: number): string {
  return `bizzy.liveAfterApprove:${businessId}`
}

export function shouldRunLiveAfterApprove(opts: {
  isPending: boolean
  businessId: number | null | undefined
  alreadyRan: boolean
}): boolean {
  if (opts.isPending) return false
  if (opts.businessId == null || !Number.isFinite(opts.businessId) || opts.businessId <= 0) {
    return false
  }
  return !opts.alreadyRan
}

export function shouldAutoPublishCreatedDraft(opts: {
  returnedStatus: string | null | undefined
  isPending: boolean
  saveAsDraft: boolean
}): boolean {
  if (opts.isPending || opts.saveAsDraft) return false
  return (opts.returnedStatus ?? "").toLowerCase() === "draft"
}

export function mergeUpcomingWithQueuedDrafts<T extends { event_id: number; status?: string | null }>(
  upcoming: T[],
  drafts: T[],
  isPending: boolean,
): T[] {
  if (isPending) return upcoming
  const seen = new Set(upcoming.map((row) => row.event_id))
  const extra = drafts.filter((row) => {
    if (seen.has(row.event_id)) return false
    return (row.status ?? "").toLowerCase() === "draft"
  })
  return [...upcoming, ...extra]
}

export type DraftPublishTarget = { event_id: number; status?: string | null }

export function draftIdsToPublish(drafts: DraftPublishTarget[]): number[] {
  const ids: number[] = []
  for (const row of drafts) {
    if ((row.status ?? "draft").toLowerCase() !== "draft") continue
    if (Number.isFinite(row.event_id) && row.event_id > 0) ids.push(row.event_id)
  }
  return ids
}
