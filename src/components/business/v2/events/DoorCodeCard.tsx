"use client"

import { useEffect, useState } from "react"
import {
  Check, Copy, DoorOpen, Loader2, Pencil, RefreshCw, Share2, Tag, KeyRound,
} from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { nativeShare } from "@/lib/share"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"

/**
 * ── API CONTRACT (services owns feat/door-code — FINAL, confirmed) ──────────
 * All three endpoints are under /business/*, authed with biz_token, and return
 * EXACTLY { door_code, door_code_label } — nothing else (the raw scanner token
 * is a server-side credential and is never sent here).
 *
 *   Read:   GET   /business/events/:id/door-code
 *           → { door_code: string, door_code_label: string | null }
 *           404 = no code available (past / creator-less event) → empty state.
 *   Rotate: POST  /business/events/:id/door-code/rotate
 *           → { door_code, door_code_label }
 *           Old code stops working immediately (token revoked server-side).
 *   Label:  PATCH /business/events/:id/door-code   body { label: string | null }
 *           → { door_code, door_code_label }
 *
 * The code is a CREDENTIAL, so it deliberately does NOT ride on the broad
 * GET /business/events/:id payload — this card fetches it separately on mount.
 */
const getPath = (id: string) => `/business/events/${id}/door-code`
const rotatePath = (id: string) => `/business/events/${id}/door-code/rotate`
const labelPath = (id: string) => `/business/events/${id}/door-code`

interface DoorCodeResponse {
  door_code: string
  door_code_label: string | null
}

// Group the 6 digits as "123 456" for readability at a glance. The raw,
// ungrouped code is what gets copied/shared so a staffer can type it 1:1.
function grouped(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code
}

// The message optimised for the primary flow: paste straight into the staff
// group chat. Code-first, plain-English, no link (the link is the thing that
// broke on opening night — the flow deliberately contains none).
function shareMessage(eventName: string, code: string) {
  return [
    `Door code for ${eventName}: ${code}`,
    ``,
    `Scan tickets tonight — no account needed:`,
    `1. Download Bizzy (App Store / Google Play)`,
    `2. Open the app, tap "Scan Tickets" on the login screen`,
    `3. Enter code ${code}`,
    ``,
    `This code stops working after the event.`,
  ].join("\n")
}

export function DoorCodeCard({
  eventId,
  eventName,
  isLive,
  canManage,
}: {
  eventId: string
  eventName: string
  isLive: boolean
  canManage: boolean
}) {
  // The code is a credential, fetched on its own (not off the event payload).
  const [code, setCode] = useState<string | null>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [error, setError] = useState("")

  // Fetch the door code separately from the event.
  //   404 → no code available (past / creator-less event) → empty state.
  //   403 → this viewer isn't entitled to the credential (e.g. a staffer who
  //         isn't a manager/cohost) → hide the card entirely, don't alarm them.
  //   other → a gentle inline message.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiClient
      .get<DoorCodeResponse>(getPath(eventId))
      .then((res) => {
        if (cancelled) return
        setCode(res.door_code)
        setLabel(res.door_code_label)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setCode(null) // expected: no code yet → empty state
        } else if (err instanceof ApiError && err.status === 403) {
          setForbidden(true) // not entitled → card is hidden below
        } else {
          setError(err instanceof ApiError ? err.message : "Couldn't load the door code.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [eventId])

  // Rotate flow
  const [showRotate, setShowRotate] = useState(false)
  const [rotating, setRotating] = useState(false)

  // Label flow
  const [showLabel, setShowLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState("")
  const [savingLabel, setSavingLabel] = useState(false)
  const [labelError, setLabelError] = useState("")

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function")
  }, [])

  const flashCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copy = async () => {
    if (!code) return
    const msg = shareMessage(eventName, code)
    try {
      await navigator.clipboard.writeText(msg)
      flashCopied()
    } catch {
      window.prompt("Copy this message:", msg)
    }
  }

  const share = async () => {
    if (!code) return
    const outcome = await nativeShare({
      title: `Door code for ${eventName}`,
      text: shareMessage(eventName, code),
    })
    if (outcome === "copied") flashCopied()
  }

  const rotate = async () => {
    setRotating(true)
    setError("")
    try {
      const res = await apiClient.post<DoorCodeResponse>(rotatePath(eventId))
      setCode(res.door_code)
      setLabel(res.door_code_label)
      setShowRotate(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't rotate the code. Try again.")
    } finally {
      setRotating(false)
    }
  }

  const saveLabel = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingLabel(true)
    setLabelError("")
    const next = labelDraft.trim()
    try {
      const res = await apiClient.patch<DoorCodeResponse>(labelPath(eventId), { label: next || null })
      setLabel(res.door_code_label)
      setShowLabel(false)
    } catch (err) {
      setLabelError(err instanceof ApiError ? err.message : "Couldn't save the label. Try again.")
    } finally {
      setSavingLabel(false)
    }
  }

  const openLabel = () => {
    setLabelDraft(label ?? "")
    setLabelError("")
    setShowLabel(true)
  }

  // ── Not entitled (403): hide the credential card entirely ─────────────────
  if (forbidden) return null

  // ── Loading: the code is fetched separately from the event ────────────────
  if (loading) {
    return (
      <Card className="border-neutral-200 dark:border-neutral-800">
        <div className="flex items-start gap-3.5 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <DoorOpen className="size-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-8 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      </Card>
    )
  }

  // ── No code: empty state (404 = past/creator-less), or a load error ───────
  if (!code) {
    return (
      <Card className="border-neutral-200 dark:border-neutral-800">
        <div className="flex items-start gap-3.5 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <DoorOpen className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Door code</h2>
            <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
              {error
                ? error
                : isLive
                ? "Your door code is being created — refresh in a moment. Staff will use it to scan tickets with no account."
                : "A 6-digit door code is created automatically when this event goes live. Share it with your door staff so they can scan tickets — no account needed."}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  // ── Live state: the code exists ───────────────────────────────────────────
  return (
    <>
      <Card className="overflow-hidden border-[#05EB54]/30 bg-gradient-to-br from-green-50/60 to-white dark:from-green-950/20 dark:to-neutral-900">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#05EB54]/15 text-[#05EB54]">
              <DoorOpen className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Door code</h2>
              <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                Hand a staffer entry scanning tonight — no account needed.
              </p>
            </div>
          </div>

          {/* The code itself, big and obvious */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <span
              className="select-all font-mono text-4xl font-bold tracking-[0.15em] text-neutral-900 tabular-nums dark:text-neutral-50 sm:text-5xl"
              aria-label={`Door code ${code.split("").join(" ")}`}
            >
              {grouped(code)}
            </span>
            {/* Label — the audit trail. Encouraged, one tap to set. */}
            {canManage && (
              label ? (
                <button
                  onClick={openLabel}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  title="Edit label"
                >
                  <Tag className="size-3" /> {label}
                  <Pencil className="size-3 opacity-60" />
                </button>
              ) : (
                <button
                  onClick={openLabel}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-500 transition-colors hover:border-[#05EB54]/50 hover:text-[#05EB54] dark:border-neutral-700 dark:text-neutral-400"
                  title="Label this code so you know who has it"
                >
                  <Tag className="size-3" /> Add a label
                </button>
              )
            )}
            {!canManage && label && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <Tag className="size-3" /> {label}
              </span>
            )}
          </div>

          {/* Primary actions: copy / share into the group chat */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={copy} className="min-w-[112px]">
              {copied ? <><Check /> Copied</> : <><Copy /> Copy</>}
            </Button>
            {canShare && (
              <Button variant="secondary" onClick={share}>
                <Share2 /> Share
              </Button>
            )}
            {canManage && (
              <Button variant="ghost" onClick={() => setShowRotate(true)} className="ml-auto text-neutral-500 dark:text-neutral-400">
                <RefreshCw /> Rotate
              </Button>
            )}
          </div>

          {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

          {/* Nudge toward labelling — the audit trail the July 3 incident lacked */}
          {canManage && !label && (
            <p className="mt-3 text-[12px] text-neutral-400 dark:text-neutral-500">
              Tip: add a label (“Front door”, “Sarah”) so you know who’s holding this code.
            </p>
          )}

          {/* Plain-English staff instructions */}
          <div className="mt-4 rounded-lg border border-neutral-200 bg-white/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <KeyRound className="size-3.5 text-[#05EB54]" /> How your staff use it
            </p>
            <ol className="mt-2 space-y-1 text-[13px] text-neutral-600 dark:text-neutral-400">
              <li>1. Download the Bizzy app — <span className="font-medium">no account needed</span>.</li>
              <li>2. On the login screen, tap <span className="font-medium">“Scan Tickets”</span>.</li>
              <li>3. Type the code <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{code}</span> — they’re scanning.</li>
            </ol>
            <p className="mt-2 text-[12px] text-neutral-400 dark:text-neutral-500">
              The code dies with the event. Rotate it any time to cut off access.
            </p>
          </div>
        </div>
      </Card>

      {/* Rotate confirmation */}
      <Dialog open={showRotate} onOpenChange={(o) => { if (!o) { setShowRotate(false); setError("") } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rotate door code?</DialogTitle>
            <DialogDescription>
              A new code is generated. <span className="font-medium text-neutral-700 dark:text-neutral-300">The old code
              stops working immediately</span> — anyone using it will need the new one.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setShowRotate(false); setError("") }} disabled={rotating}>Cancel</Button>
            <Button onClick={rotate} disabled={rotating}>
              {rotating && <Loader2 className="animate-spin" />} Rotate code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Label editor */}
      <Dialog open={showLabel} onOpenChange={(o) => { if (!o) { setShowLabel(false); setLabelError("") } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Label this code</DialogTitle>
            <DialogDescription>
              A note for you — who or where this code is for. It’s your audit trail if you ever need to trace a scan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveLabel} className="space-y-3">
            <Input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              placeholder="Front door, Sarah, VIP entrance…"
              maxLength={40}
              autoFocus
            />
            {labelError && <p className="text-xs text-red-600 dark:text-red-400">{labelError}</p>}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => { setShowLabel(false); setLabelError("") }} disabled={savingLabel}>Cancel</Button>
              <Button type="submit" disabled={savingLabel}>
                {savingLabel && <Loader2 className="animate-spin" />} Save label
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
