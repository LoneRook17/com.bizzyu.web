/**
 * BETA shell: drafts the hybrid Create event modal made in THIS browser.
 *
 * Live-after-approve (D3) promotes every `draft` row to live on dashboard
 * load for an approved business, and the event detail page auto-publishes a
 * draft it lands on. Both predate the hybrid flow and exist for trial
 * leftovers. A draft the host just created on purpose — name, date, venue
 * and a placeholder $0 tier, nothing else filled in — must not go on sale
 * behind their back, so the modal records its id here and both promoters
 * skip it until the host publishes (editor Publish step, Overview Publish,
 * detail page Publish) or the row stops being a draft.
 *
 * Browser-local by design (localStorage, per business): no API change in
 * slice 1. The gap — another device's dashboard still sweeps it — is called
 * out in the REPORT; the durable fix is a services-side distinction between
 * trial leftovers and host drafts.
 */

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function shellDraftsKey(businessId: number): string {
  return `bizzy.shellDrafts:${businessId}`
}

export function readShellDraftIds(storage: KeyValueStorage | null | undefined, businessId: number | null | undefined): Set<number> {
  if (!storage || businessId == null || !Number.isFinite(businessId) || businessId <= 0) return new Set()
  try {
    const raw = storage.getItem(shellDraftsKey(businessId))
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0))
  } catch {
    return new Set()
  }
}

function write(storage: KeyValueStorage, businessId: number, ids: Set<number>) {
  try {
    storage.setItem(shellDraftsKey(businessId), JSON.stringify([...ids]))
  } catch {
    // Storage blocked (private mode, quota): the guard degrades to the old
    // behaviour, which is exactly what it was before this module existed.
  }
}

export function addShellDraftId(storage: KeyValueStorage | null | undefined, businessId: number | null | undefined, eventId: number): void {
  if (!storage || businessId == null || !(businessId > 0) || !(eventId > 0)) return
  const ids = readShellDraftIds(storage, businessId)
  ids.add(eventId)
  write(storage, businessId, ids)
}

export function removeShellDraftId(storage: KeyValueStorage | null | undefined, businessId: number | null | undefined, eventId: number): void {
  if (!storage || businessId == null || !(businessId > 0)) return
  const ids = readShellDraftIds(storage, businessId)
  if (!ids.delete(eventId)) return
  write(storage, businessId, ids)
}

/** The promoter's id list minus the host's own in-progress drafts. */
export function excludeShellDrafts(ids: readonly number[], shellIds: ReadonlySet<number>): number[] {
  return ids.filter((id) => !shellIds.has(id))
}

export function isShellDraft(storage: KeyValueStorage | null | undefined, businessId: number | null | undefined, eventId: number | null | undefined): boolean {
  if (eventId == null) return false
  return readShellDraftIds(storage, businessId).has(Number(eventId))
}

/** `window.localStorage` when it exists and is readable; null otherwise. */
export function browserStorage(): KeyValueStorage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}
