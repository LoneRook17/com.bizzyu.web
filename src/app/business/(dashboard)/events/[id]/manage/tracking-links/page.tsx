"use client"

// Manage Event → Tracking links (Wave 2B). The dashboard surface for the
// host tracking links services shipped in Tracking Links W1 (DEV `:414`).
// Thin view: list / create / rename / archive against the real endpoints;
// every rule lives in lib/business/tracking-links.ts. Owners and managers
// only — the services gate is requireBusinessRole(owner, manager) and the
// page mirrors it so staff never see a dead-ending "+ New link".
//
// Deliberately NOT the promoters page: no avatars, no commission maths, and
// the code is immutable (a URL on a printed flyer must keep resolving), so
// rename edits the label only and archive is soft.

import { useState, useEffect, use, useCallback } from "react"
import {
  Archive, ArchiveRestore, Check, Copy, Info, Link2, Loader2, Pencil, Plus,
} from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { HostTrackingLink, TrackingLinkResponse, TrackingLinksResponse } from "@/lib/business/types"
import {
  TRACKING_LABEL_MAX,
  TRACKING_LINK_ARCHIVE_DESCRIPTION,
  TRACKING_LINK_ARCHIVE_TITLE,
  TRACKING_LINKS_EMPTY_DESCRIPTION,
  TRACKING_LINKS_EMPTY_TITLE,
  TRACKING_LINKS_SUBTITLE,
  TRACKING_LINKS_TITLE,
  TRACKING_LINKS_TOOLTIP,
  checkTrackingLabel,
  countArchived,
  isArchived,
  trackingLinkDisplayName,
  upsertTrackingLink,
  visibleTrackingLinks,
} from "@/lib/business/tracking-links"
import { money } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/business/v2/ui/tooltip"
import ConfirmDialog from "@/components/business/v2/ConfirmDialog"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { fmtDate } from "@/components/business/v2/events/eventStatus"
import { showToast } from "@/components/business/dashboard/Toast"

/** The (i) next to the title — hover AND keyboard, like PayoutsAccessControl. */
function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="How tracking links work"
            className="inline-flex size-6 items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 dark:text-neutral-500 dark:hover:text-neutral-200"
          >
            <Info className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px] text-center font-normal leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

type LabelDialog =
  | { mode: "create" }
  | { mode: "rename"; link: HostTrackingLink }

export default function V2EventTrackingLinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const canManage = user?.business_role === "owner" || user?.business_role === "manager"

  const [links, setLinks] = useState<HostTrackingLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const [labelDialog, setLabelDialog] = useState<LabelDialog | null>(null)
  const [labelValue, setLabelValue] = useState("")
  const [labelError, setLabelError] = useState("")
  const [saving, setSaving] = useState(false)

  const [archiveTarget, setArchiveTarget] = useState<HostTrackingLink | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const base = `/business/events/${id}/tracking-links`

  const fetchLinks = useCallback(() => {
    setError("")
    return apiClient
      .get<TrackingLinksResponse>(base)
      .then((res) => setLinks(res.links ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load tracking links"))
      .finally(() => setLoading(false))
  }, [base])

  useEffect(() => {
    if (!canManage) {
      setLoading(false)
      return
    }
    fetchLinks()
  }, [canManage, fetchLinks])

  const openCreate = () => {
    setLabelValue("")
    setLabelError("")
    setLabelDialog({ mode: "create" })
  }

  const openRename = (link: HostTrackingLink) => {
    setLabelValue(link.label ?? "")
    setLabelError("")
    setLabelDialog({ mode: "rename", link })
  }

  const submitLabel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!labelDialog) return
    const check = checkTrackingLabel(labelValue)
    if (!check.ok) {
      setLabelError(check.error)
      return
    }
    setSaving(true)
    setLabelError("")
    try {
      if (labelDialog.mode === "create") {
        const res = await apiClient.post<TrackingLinkResponse>(base, { label: check.label })
        setLinks((cur) => upsertTrackingLink(cur, res.link))
        showToast("Link created")
      } else {
        const res = await apiClient.patch<TrackingLinkResponse>(`${base}/${labelDialog.link.id}`, { label: check.label })
        setLinks((cur) => upsertTrackingLink(cur, res.link))
        showToast("Link renamed")
      }
      setLabelDialog(null)
    } catch (err) {
      setLabelError(err instanceof ApiError ? err.message : "Something went wrong. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const setArchived = async (link: HostTrackingLink, archived: boolean) => {
    setBusyId(link.id)
    setArchiveError(null)
    try {
      const res = await apiClient.patch<TrackingLinkResponse>(`${base}/${link.id}`, { archived })
      setLinks((cur) => upsertTrackingLink(cur, res.link))
      showToast(archived ? "Link archived" : "Link restored")
      setArchiveTarget(null)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong. Try again."
      if (archived) setArchiveError(message)
      else showToast(message, "error")
    } finally {
      setBusyId(null)
    }
  }

  const copyShareUrl = async (link: HostTrackingLink) => {
    try {
      await navigator.clipboard.writeText(link.share_url)
      setCopiedId(link.id)
      showToast("Link copied")
      setTimeout(() => setCopiedId((cur) => (cur === link.id ? null : cur)), 1500)
    } catch {
      // Clipboard is permission-gated and absent on insecure origins; a prompt
      // still lets the operator get the link out (same fallback as ShareLinkRow).
      // Embedded webviews can refuse prompt() too — never let that throw past
      // the click; the URL is already visible in the row.
      try {
        window.prompt("Copy this link:", link.share_url)
      } catch {
        showToast("Couldn't copy. Select the link in the row instead.", "error")
      }
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (!canManage) {
    return (
      <>
        <ManageSubheader eventId={id} title={TRACKING_LINKS_TITLE} />
        <EmptyState
          icon={Link2}
          title="Owners and managers only"
          description="Ask the business owner or a manager to set up tracking links for this event."
        />
      </>
    )
  }

  const archivedCount = countArchived(links)
  const visible = visibleTrackingLinks(links, showArchived)

  return (
    <>
      <ManageSubheader
        eventId={id}
        title={TRACKING_LINKS_TITLE}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {TRACKING_LINKS_SUBTITLE}
            <InfoTip text={TRACKING_LINKS_TOOLTIP} />
          </span>
        }
        actions={<Button onClick={openCreate}><Plus /> New link</Button>}
      />

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={() => { setLoading(true); fetchLinks() }}>Retry</Button>
        </div>
      )}

      {!error && links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title={TRACKING_LINKS_EMPTY_TITLE}
          description={TRACKING_LINKS_EMPTY_DESCRIPTION}
          action={<Button onClick={openCreate}><Plus /> New link</Button>}
        />
      ) : !error && (
        <>
          {archivedCount > 0 && (
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-[13px] text-neutral-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="size-4 rounded border-neutral-300 accent-[#05EB54] dark:border-neutral-700"
              />
              Show archived ({archivedCount})
            </label>
          )}

          {visible.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="Every link is archived"
              description="Tick “Show archived” to see them, or make a new link."
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                      <th className="min-w-[170px] px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">Link</th>
                      <th className="px-4 py-3 text-right font-medium">Clicks</th>
                      <th className="px-4 py-3 text-right font-medium">Purchases</th>
                      <th className="px-4 py-3 text-right font-medium">Revenue</th>
                      <th className="px-4 py-3 text-left font-medium">Created</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((link) => {
                      const archived = isArchived(link)
                      const busy = busyId === link.id
                      return (
                        <tr
                          key={link.id}
                          className={
                            "border-b border-neutral-50 last:border-0 dark:border-neutral-800" +
                            (archived ? " bg-neutral-50/40 text-neutral-500 dark:bg-neutral-800/30 dark:text-neutral-400" : "")
                          }
                        >
                          <td className="min-w-[170px] px-4 py-3 align-top">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                {trackingLinkDisplayName(link)}
                              </span>
                              {archived && <Badge variant="neutral" size="sm">Archived</Badge>}
                            </div>
                            <p className="mt-0.5 font-mono text-[11px] text-neutral-400 dark:text-neutral-500">{link.code}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="max-w-[200px] truncate font-mono text-xs text-neutral-600 dark:text-neutral-400"
                                title={link.share_url}
                              >
                                {link.share_url}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyShareUrl(link)}
                                aria-label={`Copy link for ${trackingLinkDisplayName(link)}`}
                                className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-[#05EB54] hover:underline"
                              >
                                {copiedId === link.id ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy</>}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">{link.clicks}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                            {link.orders}
                            {link.tickets !== link.orders && (
                              <span className="ml-1 text-xs text-neutral-400 dark:text-neutral-500">({link.tickets} tickets)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-neutral-900 dark:text-neutral-100">{money(link.revenue_cents)}</td>
                          <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{fmtDate(link.created_at)}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center justify-end gap-3 text-xs font-medium">
                              <button
                                type="button"
                                onClick={() => openRename(link)}
                                disabled={busy}
                                className="inline-flex cursor-pointer items-center gap-1 text-neutral-600 hover:underline disabled:opacity-50 dark:text-neutral-300"
                              >
                                <Pencil className="size-3" /> Rename
                              </button>
                              {archived ? (
                                <button
                                  type="button"
                                  onClick={() => setArchived(link, false)}
                                  disabled={busy}
                                  className="inline-flex cursor-pointer items-center gap-1 text-neutral-600 hover:underline disabled:opacity-50 dark:text-neutral-300"
                                >
                                  {busy ? <Loader2 className="size-3 animate-spin" /> : <ArchiveRestore className="size-3" />} Unarchive
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setArchiveError(null); setArchiveTarget(link) }}
                                  disabled={busy}
                                  className="inline-flex cursor-pointer items-center gap-1 text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                                >
                                  <Archive className="size-3" /> Archive
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* create / rename — one form, the label is the only editable field */}
      <Dialog open={labelDialog !== null} onOpenChange={(open) => { if (!open && !saving) setLabelDialog(null) }}>
        <DialogContent>
          <form onSubmit={submitLabel} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{labelDialog?.mode === "rename" ? "Rename link" : "New tracking link"}</DialogTitle>
              <DialogDescription>
                {labelDialog?.mode === "rename"
                  ? "Only the name changes. The link itself stays the same."
                  : "Name it after where you’ll share it, like “Flyer” or “Instagram bio”."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tracking-link-label">Name</Label>
              <Input
                id="tracking-link-label"
                value={labelValue}
                onChange={(e) => { setLabelValue(e.target.value); if (labelError) setLabelError("") }}
                maxLength={TRACKING_LABEL_MAX}
                placeholder="Flyer"
                autoFocus
                required
              />
              <div className="flex items-center justify-between text-xs">
                {labelError ? (
                  <span className="text-red-600 dark:text-red-400">{labelError}</span>
                ) : <span />}
                <span className="text-neutral-400 dark:text-neutral-500">{labelValue.trim().length}/{TRACKING_LABEL_MAX}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setLabelDialog(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="animate-spin" /> Saving…</> : labelDialog?.mode === "rename" ? "Save name" : "Create link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open) { setArchiveTarget(null); setArchiveError(null) } }}
        onConfirm={() => { if (archiveTarget) setArchived(archiveTarget, true) }}
        title={TRACKING_LINK_ARCHIVE_TITLE}
        description={archiveTarget ? <>{TRACKING_LINK_ARCHIVE_DESCRIPTION} <span className="font-medium text-neutral-700 dark:text-neutral-300">({trackingLinkDisplayName(archiveTarget)})</span></> : undefined}
        confirmLabel="Archive"
        loading={archiveTarget !== null && busyId === archiveTarget.id}
        error={archiveError}
      />
    </>
  )
}
