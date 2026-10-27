"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react"
import { CalendarDays, Check, ChevronDown, Info, Link2, Loader2, Megaphone, MessageSquare } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { Button } from "@/components/business/v2/ui/button"
import { Textarea } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { cn } from "@/lib/v2/utils"
import { loadMarketingUpcomingRows } from "@/lib/business/marketing-upcoming-load"
import type { MarketingEventRow } from "@/lib/business/marketing-events"
import {
  EMOJI_HINT,
  LINK_NO_ROOM_HINT,
  SMS_SUFFIX,
  canReview,
  channelLabel,
  charLimitFor,
  cohortNoun,
  composerTransition,
  cooldownNote,
  insertMarketingLink,
  linkableMarketingRows,
  marketingEventLinkUrl,
  marketingLength,
  newIdempotencyKey,
  quotaNote,
  reachLine,
  reviewButtonLabel,
  sanitizeMarketingInput,
  sentLine,
  type Cohort,
  type ComposerStage,
} from "@/lib/business/marketing-compose"
import type {
  AudiencePreviewResponse,
  BlastAudienceBody,
  BlastChannel,
  SendBlastResponse,
} from "@/components/business/dashboard/marketing/types"

/**
 * THE marketing composer (web twin of the app's BlastComposerSheet).
 *
 * Four stages so a blast can never go out by accident, and never twice:
 *
 *   compose → the message (160 for texts / 280 for announcements, emoji
 *             stripped as typed), the live reach line, `Add event link`,
 *             `Review & send`
 *   review  → a read-only card of exactly what goes to exactly whom,
 *             `Send to N …` + `Edit message`
 *   sending → both buttons locked, spinner, dialog cannot be dismissed
 *   sent    → the check, "On its way to N …", `Done`. Nothing else is left
 *             to click.
 *
 * Venue blasts hit `/business/marketing/blasts` with a client idempotency
 * key; the per-event Announce rides in through `previewOverride` /
 * `sendOverride` (same flow, its own wire). `Add event link` inserts the
 * PROD public event page — one tap for `eventLinkId`, a picker of that
 * venue's upcoming events + Weekly Cover nights for `linkVenueId`.
 */

/** What a send resolved to. The per-event wire answers `recipient_count`. */
export type ComposerSendResult = Partial<SendBlastResponse> & { recipient_count?: number }

export interface BlastComposerProps {
  open: boolean
  onClose: () => void
  channel: BlastChannel
  /** Either user_ids OR filters OR all_followers+venue OR event_id - NOT a mix. */
  audience: BlastAudienceBody
  /** Human-readable summary of who's being targeted. */
  audienceLabel?: string
  onSent?: (result: ComposerSendResult) => void
  /** Noun for the reach / confirm copy. Default "followers". */
  cohort?: Cohort
  /** Whose weekly pool the review card says this uses. Default "venue". */
  quotaScope?: "venue" | "account"
  /** Event-scoped composer: `Add event link` inserts THIS event's page in one tap. */
  eventLinkId?: number | null
  /**
   * Venue-wide composer: scope of the `Add event link` picker (null = every
   * venue). Leave undefined (with no eventLinkId) to hide the control.
   */
  linkVenueId?: number | null
  /** A different preview wire answering in the blast preview shape. */
  previewOverride?: () => Promise<AudiencePreviewResponse>
  /** A different send wire; gets the trimmed message and the idempotency key. */
  sendOverride?: (message: string, idempotencyKey: string) => Promise<ComposerSendResult>
}

export default function BlastComposer({
  open,
  onClose,
  channel,
  audience,
  audienceLabel,
  onSent,
  cohort = "followers",
  quotaScope = "venue",
  eventLinkId = null,
  linkVenueId,
  previewOverride,
  sendOverride,
}: BlastComposerProps) {
  const [stage, setStage] = useState<ComposerStage>("compose")
  const [message, setMessage] = useState("")
  const [preview, setPreview] = useState<AudiencePreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [sentResult, setSentResult] = useState<ComposerSendResult | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [linkRows, setLinkRows] = useState<MarketingEventRow[] | null>(null)
  const [linkRowsLoading, setLinkRowsLoading] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingCursor = useRef<number | null>(null)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Idempotency key per composition: reused for a retry of the same text,
  // regenerated when the text changes, dropped on a confirmed send.
  const idemKey = useRef<{ key: string; message: string } | null>(null)
  // Overrides live in refs so an inline arrow from the caller never re-runs
  // the preview effect every render.
  const previewRef = useRef(previewOverride)
  const sendRef = useRef(sendOverride)
  useEffect(() => {
    previewRef.current = previewOverride
    sendRef.current = sendOverride
  })

  const limit = charLimitFor(channel)
  const isSms = channel === "sms"
  const audienceKey = JSON.stringify(audience)
  const locked = stage === "sending"
  const onCooldown = cooldownSeconds > 0

  // ─── lifecycle ──────────────────────────────────────────────────────

  // Every open is a fresh composition, and a new audience (or channel) means
  // a new preview. Adjusted during render from the props, so nothing stale
  // ever flashes and no effect has to reset state after the fact.
  const session = open ? `${audienceKey}|${channel}` : null
  const [seenSession, setSeenSession] = useState<string | null>(session)
  if (session !== seenSession) {
    setSeenSession(session)
    setPreview(null)
    setPreviewLoading(session != null)
    setError(null)
    setCooldownSeconds(0)
    setPickerOpen(false)
    if (session == null || seenSession == null) {
      setStage("compose")
      setMessage("")
      setHint(null)
      setSentResult(null)
      setLinkRows(null)
    }
  }

  useEffect(() => {
    if (!open) return
    // A fresh composition never reuses the last one's idempotency key: the
    // server would dedupe an identical message into a silent no-op.
    idemKey.current = null
    let cancelled = false
    const run = previewRef.current
      ? previewRef.current()
      : apiClient.post<AudiencePreviewResponse>("/business/marketing/blasts/audience-preview", { audience })
    run
      .then((res) => {
        if (cancelled) return
        setPreview(res)
        const cd = channel === "sms" ? res.sms_cooldown : res.announcement_cooldown
        setCooldownSeconds(cd && cd.allowed === false ? Math.max(0, cd.retry_after_seconds ?? 0) : 0)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load audience preview")
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, audienceKey, channel])

  // The reset countdown ticks locally from the server's absolute delta.
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const t = setInterval(() => setCooldownSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldownSeconds > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  // Put the caret where the sanitised text (or an inserted link) left it.
  // Focus first: a blurred textarea's selection is reset by the controlled
  // value write, so setting it before focus lands at 0.
  useEffect(() => {
    const c = pendingCursor.current
    const el = textareaRef.current
    if (c == null || !el) return
    pendingCursor.current = null
    el.focus()
    el.setSelectionRange(c, c)
  }, [message])

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
  }, [])

  const flashHint = useCallback((copy: string) => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
    setHint(copy)
    hintTimer.current = setTimeout(() => setHint(null), 2600)
  }, [])

  // ─── derived ────────────────────────────────────────────────────────

  const total = preview?.recipients_count ?? 0
  const reachable = useMemo(() => {
    if (!preview) return null
    return isSms ? preview.breakdown_by_channel.phone_reachable : preview.breakdown_by_channel.push_reachable
  }, [preview, isSms])
  const confirmCount = reachable ?? 0
  const len = marketingLength(message)
  const left = limit - len
  const reviewable = canReview({ text: message, limit, previewLoading, reachable, locked: locked || onCooldown })
  const showLinkControl = eventLinkId != null || linkVenueId !== undefined
  const label = channelLabel(channel)
  const reviewing = stage !== "compose" && stage !== "sent"

  // ─── actions ────────────────────────────────────────────────────────

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target
    const { text, cursor, strippedEmoji } = sanitizeMarketingInput(el.value, limit, el.selectionStart ?? el.value.length)
    if (text !== el.value) pendingCursor.current = cursor
    setMessage(text)
    if (strippedEmoji) flashHint(EMOJI_HINT)
  }

  const insertLink = (id: number) => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? message.length
    const end = el?.selectionEnd ?? message.length
    const out = insertMarketingLink(message, marketingEventLinkUrl(id), start, end, limit)
    setPickerOpen(false)
    if (!out) {
      flashHint(LINK_NO_ROOM_HINT)
      return
    }
    pendingCursor.current = out.cursor
    setMessage(out.text)
  }

  const onAddLink = async () => {
    if (locked) return
    if (eventLinkId != null) {
      insertLink(eventLinkId)
      return
    }
    if (linkVenueId === undefined) return
    setPickerOpen((o) => !o)
    if (linkRows == null && !linkRowsLoading) {
      setLinkRowsLoading(true)
      try {
        setLinkRows(await loadMarketingUpcomingRows(linkVenueId))
      } catch {
        setLinkRows([])
      } finally {
        setLinkRowsLoading(false)
      }
    }
  }

  const toReview = () => {
    if (!reviewable) return
    setPickerOpen(false)
    setStage((s) => composerTransition(s, "review"))
  }

  const backToCompose = () => {
    if (locked) return
    setStage((s) => composerTransition(s, "edit"))
  }

  const send = async () => {
    if (stage !== "review" || locked || onCooldown) return
    const trimmed = message.trim()
    if (!trimmed) return
    const key = idemKey.current && idemKey.current.message === trimmed ? idemKey.current.key : newIdempotencyKey()
    idemKey.current = { key, message: trimmed }
    setError(null)
    setStage((s) => composerTransition(s, "send"))
    try {
      const res = sendRef.current
        ? await sendRef.current(trimmed, key)
        : await apiClient.post<SendBlastResponse>("/business/marketing/blasts", {
            channel,
            message: trimmed,
            audience,
            idempotency_key: key,
          })
      idemKey.current = null
      setSentResult(res)
      setStage((s) => composerTransition(s, "sent"))
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429) {
        const secs = Number((err.body as { retry_after_seconds?: unknown })?.retry_after_seconds ?? 0)
        if (secs > 0) setCooldownSeconds(secs)
      }
      setError(err instanceof ApiError ? err.message : "Send failed")
      setStage((s) => composerTransition(s, "fail"))
    }
  }

  const finish = () => {
    if (sentResult && onSent) onSent(sentResult)
    onClose()
  }

  const handleOpenChange = (o: boolean) => {
    if (o || locked) return
    if (stage === "sent") finish()
    else onClose()
  }

  // ─── render ─────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onEscapeKeyDown={(e) => locked && e.preventDefault()} onPointerDownOutside={(e) => locked && e.preventDefault()}>
        {stage === "sent" ? (
          <SentPanel label={label} line={sentLine(cohort, confirmCount)} onDone={finish} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{reviewing ? "Ready to send?" : `Send ${label}`}</DialogTitle>
              {audienceLabel && <DialogDescription>{audienceLabel}</DialogDescription>}
            </DialogHeader>

            {reviewing ? (
              <ReviewCard
                channel={channel}
                who={`${confirmCount} ${cohortNoun(cohort, confirmCount)}`}
                message={message.trim()}
                quota={quotaNote(channel, quotaScope)}
              />
            ) : (
              <>
                <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300">
                  {previewLoading && <span>Calculating audience…</span>}
                  {!previewLoading && preview && (
                    <span>{reachLine({ channel, cohort, reachable: reachable ?? 0, total })}</span>
                  )}
                  {!previewLoading && !preview && error && <span className="text-red-600 dark:text-red-400">Couldn&apos;t load audience.</span>}
                </div>

                {!previewLoading && preview && reachable === 0 && (
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                    {isSms
                      ? `No ${cohort} have SMS opted-in${cohort === "ticket holders" ? " for this event" : ""} yet.`
                      : `No ${cohort} have push notifications enabled${cohort === "ticket holders" ? " for this event" : ""} yet.`}
                  </p>
                )}

                {onCooldown && (
                  <Note tone="warn">{cooldownNote(channel, quotaScope, cooldownSeconds)}</Note>
                )}

                <div>
                  <Label htmlFor="blast-message" className="mb-1.5 block">
                    Message
                  </Label>
                  <Textarea
                    id="blast-message"
                    ref={textareaRef}
                    value={message}
                    onChange={onChange}
                    disabled={locked}
                    rows={5}
                    autoFocus
                    placeholder={isSms ? "Hey! New event drop this weekend - link in bio." : "Tap to see what's new at our spot."}
                  />
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
                    <span
                      data-testid="blast-counter"
                      className={cn(
                        "font-semibold tabular-nums",
                        left <= 0
                          ? "text-red-600 dark:text-red-400"
                          : left <= 20
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-neutral-500 dark:text-neutral-400",
                      )}
                    >
                      {len}/{limit}
                    </span>
                    <span className="min-w-0 truncate text-right">
                      {hint ? (
                        <span className="font-semibold text-orange-700 dark:text-orange-400">{hint}</span>
                      ) : isSms ? (
                        <span className="text-neutral-400 dark:text-neutral-500">
                          Plain text only · &ldquo;{SMS_SUFFIX.trim()}&rdquo; is added
                        </span>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-500">Plain text only</span>
                      )}
                    </span>
                  </div>

                  {showLinkControl && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onAddLink}
                        disabled={locked}
                        aria-expanded={eventLinkId == null ? pickerOpen : undefined}
                        className="rounded-full"
                      >
                        <Link2 /> Add event link
                        {eventLinkId == null && <ChevronDown className={cn("transition-transform", pickerOpen && "rotate-180")} />}
                      </Button>
                      {eventLinkId == null && pickerOpen && (
                        <LinkPicker rows={linkRows} loading={linkRowsLoading} onPick={insertLink} />
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {error && preview && <Note tone="error">{error}</Note>}

            <DialogFooter>
              {reviewing ? (
                <>
                  <Button variant="secondary" onClick={backToCompose} disabled={locked}>
                    Edit message
                  </Button>
                  <Button onClick={send} disabled={locked || onCooldown}>
                    {locked ? (
                      <>
                        <Loader2 className="animate-spin" /> Sending…
                      </>
                    ) : (
                      reviewButtonLabel(cohort, confirmCount)
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={toReview} disabled={!reviewable}>
                    {onCooldown ? "Limit reached" : "Review & send"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── pieces ───────────────────────────────────────────────────────────────

function Note({ tone, children }: { tone: "warn" | "error"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
        tone === "warn"
          ? "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400",
      )}
    >
      <Info className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

/** The frozen "exactly this, to exactly them" card. */
function ReviewCard({ channel, who, message, quota }: { channel: BlastChannel; who: string; message: string; quota: string }) {
  const isSms = channel === "sms"
  const Icon = isSms ? MessageSquare : Megaphone
  return (
    <div className="space-y-2.5">
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <Icon className="size-4 text-[#05EB54]" />
          <span>
            To <span className="font-bold text-neutral-900 dark:text-neutral-100">{who}</span>{" "}
            {isSms ? "by text (SMS)" : "as a push notification"}
          </span>
        </div>
        <div className="my-3 h-px bg-neutral-200 dark:bg-neutral-700" />
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900 dark:text-neutral-100" data-testid="blast-review-message">
          {message}
        </p>
        {isSms && <p className="mt-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">{SMS_SUFFIX.trim()}</p>}
      </div>
      <p className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
        <Info className="mt-px size-3.5 shrink-0" />
        <span>{quota} It goes out once and can&apos;t be unsent.</span>
      </p>
    </div>
  )
}

/** The terminal confirmation: the check, what went where, and Done. */
function SentPanel({ label, line, onDone }: { label: string; line: string; onDone: () => void }) {
  return (
    <div className="flex flex-col items-center py-2 text-center" data-testid="blast-sent-panel">
      <div className="flex size-20 items-center justify-center rounded-full bg-[#05EB54] shadow-lg shadow-[#05EB54]/30">
        <Check className="size-10 text-black" strokeWidth={3} />
      </div>
      <DialogTitle className="mt-5 text-xl">{label} sent</DialogTitle>
      <DialogDescription className="mt-1.5">{line}</DialogDescription>
      <Button className="mt-6 w-full" size="lg" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}

function formatRowDate(iso: string): string {
  if (!iso) return ""
  const day = iso.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(day) && iso.length <= 19) {
    const [y, m, d] = day.split("-")
    const dt = new Date(Number(y), Number(m) - 1, Number(d))
    return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
  }
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
  } catch {
    return iso
  }
}

/**
 * The venue-wide picker: that venue's upcoming named events + Weekly Cover
 * nights (the same list Marketing → Events paints). Inline under the button
 * rather than a second dialog, so nothing fights the first one.
 */
function LinkPicker({
  rows,
  loading,
  onPick,
}: {
  rows: MarketingEventRow[] | null
  loading: boolean
  onPick: (eventId: number) => void
}) {
  const options = rows ? linkableMarketingRows(rows) : []
  return (
    <div
      className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      role="listbox"
      aria-label="Link an event"
      data-testid="blast-link-picker"
    >
      {loading || rows == null ? (
        <div className="flex items-center gap-2 px-3 py-3 text-xs text-neutral-500 dark:text-neutral-400">
          <Loader2 className="size-3.5 animate-spin" /> Loading upcoming events…
        </div>
      ) : options.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-3 text-xs text-neutral-500 dark:text-neutral-400">
          <CalendarDays className="size-3.5" /> No upcoming events to link yet.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {options.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onPick(row.eventId)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{row.name}</span>
                  <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {formatRowDate(row.start)}
                    {row.venueName ? ` · ${row.venueName}` : ""}
                    {row.kind === "weekly_cover" ? " · Weekly Cover" : ""}
                  </span>
                </span>
                <Link2 className="size-4 shrink-0 text-neutral-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
