"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, CalendarDays, Camera, CheckCircle2, ChevronRight, ScanLine, XCircle,
} from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { ACCESS_ACCENT, ACCESS_ACCENT_DEEP, isWeeklyCoverProduct } from "@/lib/business/door-access"
import { getApiBaseUrl } from "@/lib/api-url"
import { cn } from "@/lib/v2/utils"
import type { EventListItem } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Badge } from "@/components/business/v2/ui/badge"
import { EmptyState } from "@/components/business/v2/ui/empty-state"

const API_URL = getApiBaseUrl()

interface ScanResult {
  type?: "event_ticket" | "line_skip"
  status: string
  ticket_type: string | null
  ticket: {
    uuid: string
    ticket_name: string
    event_name: string
    owner_name: string
    redeemed_at: string | null
  }
}

interface ScanLogEntry {
  uuid: string
  name: string
  ticket_name: string
  ticket_type: string | null
  type?: "event_ticket" | "line_skip"
  status: string
  time: string
}

interface CheckinStats {
  total: number
  redeemed: number
}

const SCANNER_CONTAINER_ID = "v2-qr-reader"

export default function ScannerClient() {
  const searchParams = useSearchParams()
  const urlEventId = searchParams.get("eventId")

  const [events, setEvents] = useState<EventListItem[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([])
  const [stats, setStats] = useState<CheckinStats>({ total: 0, redeemed: 0 })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [cameraError, setCameraError] = useState("")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null)
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scanLockRef = useRef(false)

  // Fetch events
  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await apiClient.get<{ events: EventListItem[] }>("/business/events?tab=upcoming&limit=100")
        const loadedEvents = data.events || []
        setEvents(loadedEvents)
        if (urlEventId) {
          const id = Number(urlEventId)
          if (loadedEvents.some((e) => e.event_id === id)) setSelectedEventId(id)
        }
      } catch {
        setError("Failed to load events")
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [urlEventId])

  // Fetch stats when event changes (+ poll)
  useEffect(() => {
    if (!selectedEventId) return
    let active = true
    async function loadStats() {
      try {
        const data = await apiClient.get<CheckinStats>(`/checkin/event/${selectedEventId}/stats`)
        if (active) setStats(data)
      } catch {}
    }
    loadStats()
    const interval = setInterval(loadStats, 15000)
    return () => { active = false; clearInterval(interval) }
  }, [selectedEventId])

  const extractUUID = (text: string): string => {
    try {
      const url = new URL(text)
      const filtered = url.pathname.split("/").filter(Boolean)
      return filtered[filtered.length - 1] || text
    } catch {
      return text
    }
  }

  const handleScan = useCallback(async (decodedText: string) => {
    if (scanLockRef.current || !selectedEventId) return
    scanLockRef.current = true

    const uuid = extractUUID(decodedText)
    const dismiss = () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)
      resultTimeoutRef.current = setTimeout(() => {
        setResult(null)
        scanLockRef.current = false
      }, 3000)
    }

    try {
      const res = await fetch(`${API_URL}/checkin/${uuid}/redeem`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data: ScanResult = await res.json()
      setResult(data)

      if (data.status === "redeemed_now") {
        setStats((prev) => ({ ...prev, redeemed: prev.redeemed + 1 }))
      }

      setScanLog((prev) => [
        {
          uuid,
          name: data.ticket?.owner_name || "Unknown",
          ticket_name: data.ticket?.ticket_name || "Ticket",
          ticket_type: data.ticket_type,
          type: data.type,
          status: data.status,
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 49),
      ])
      dismiss()
    } catch {
      setResult({
        status: "invalid",
        ticket_type: null,
        ticket: { uuid, ticket_name: "", event_name: "", owner_name: "Error", redeemed_at: null },
      })
      dismiss()
    }
  }, [selectedEventId])

  const startScanner = useCallback(async () => {
    setCameraError("")
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const scanner = new Html5Qrcode(SCANNER_CONTAINER_ID)
      scannerRef.current = scanner

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 }

      try {
        await scanner.start({ facingMode: "environment" }, config, (decodedText: string) => handleScan(decodedText), () => {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (primaryErr: any) {
        const errName = primaryErr?.name || ""
        if (errName === "OverconstrainedError" || errName === "ConstraintNotSatisfiedError") {
          await scanner.start({ facingMode: "user" }, config, (decodedText: string) => handleScan(decodedText), () => {})
        } else {
          throw primaryErr
        }
      }
      setScanning(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errName = err?.name || ""
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setCameraError("Camera access denied. Allow camera permissions in your browser settings.")
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setCameraError("Camera is in use by another app or tab. Close other camera apps and try again.")
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setCameraError("No camera found on this device.")
      } else if (errName === "AbortError") {
        setCameraError("Camera initialization was interrupted. Please try again.")
      } else {
        setCameraError(err?.message || "Failed to start camera. Please try again.")
      }
    }
  }, [handleScan])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
    setScanning(false)
    scanLockRef.current = false
  }, [])

  // Start scanner when event is selected
  useEffect(() => {
    if (selectedEventId && !scanning) startScanner()
    return () => { stopScanner() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)
      stopScanner()
    }
  }, [stopScanner])

  const selectedEvent = events.find((e) => e.event_id === selectedEventId)
  // product_kind when services sends it, access_kind on older payloads.
  // Never the event's name.
  const weeklyCoverScan = !!selectedEvent && isWeeklyCoverProduct(selectedEvent)
  const isLineSkip = result?.type === "line_skip"

  const getResultClasses = () => {
    if (!result) return ""
    if (result.status === "redeemed_now") {
      if (weeklyCoverScan) return ""
      return isLineSkip ? "from-[#c2410c] to-[#ea580c]" : "from-[#0d7a3e] to-[#05EB54]"
    }
    return "from-[#8B1A2B] to-[#c41e3a]"
  }

  const weeklyCoverResultStyle =
    result?.status === "redeemed_now" && weeklyCoverScan
      ? {
          backgroundImage: `linear-gradient(to bottom right, ${ACCESS_ACCENT_DEEP}, ${ACCESS_ACCENT})`,
        }
      : undefined

  const getResultLabel = () => {
    if (!result) return ""
    if (result.status === "redeemed_now") return isLineSkip ? "LINE SKIP" : "ENTRY"
    const labels: Record<string, string> = {
      already_redeemed: "ALREADY SCANNED",
      invalid: "INVALID TICKET",
      refunded: "REFUNDED",
      event_cancelled: "EVENT CANCELLED",
      ticket_belongs_to_another_event: "WRONG EVENT",
      event_not_active: "EVENT NOT ACTIVE",
      not_active: "NOT ACTIVE YET",
      cancelled: "CANCELLED",
    }
    return labels[result.status] || "ERROR"
  }

  const getResultDescription = () => {
    if (!result) return ""
    if (result.status === "redeemed_now") return "Checked in successfully"
    const descriptions: Record<string, string> = {
      ticket_belongs_to_another_event: "This ticket belongs to a different event",
      already_redeemed: "This ticket has already been checked in",
      invalid: "Ticket not found",
      refunded: "This ticket has been refunded",
      event_cancelled: "This event has been cancelled",
      event_not_active: "Scanning is not open for this event yet",
      not_active: "This ticket is not active yet",
      cancelled: "This ticket has been cancelled",
    }
    return descriptions[result.status] || "An error occurred"
  }

  const getLogStatusColor = (status: string, type?: string) => {
    if (status === "redeemed_now") return type === "line_skip" ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
    if (status === "already_redeemed") return "text-amber-600 dark:text-amber-400"
    return "text-red-600 dark:text-red-400"
  }
  const logLabel = (status: string, type?: string) =>
    status === "redeemed_now"
      ? type === "line_skip" ? "LINE SKIP" : "ENTRY"
      : status === "already_redeemed" ? "ALREADY IN" : "ERROR"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="size-7 animate-spin text-[#05EB54]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (error) {
    return <EmptyState icon={CalendarDays} title="Couldn't load events" description={error} />
  }

  return (
    <>
      {/* Full-screen result overlay (intentional bold treatment for door staff) */}
      {result && (
        <div
          className={cn("fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gradient-to-br p-8", getResultClasses())}
          style={weeklyCoverResultStyle}
        >
          <div className="text-center">
            {result.status === "redeemed_now" ? (
              <CheckCircle2 className="mx-auto mb-4 size-24 text-white" strokeWidth={1.75} />
            ) : (
              <XCircle className="mx-auto mb-4 size-24 text-white" strokeWidth={1.75} />
            )}
            <h1 className="mb-2 text-5xl font-black tracking-tight text-white">{getResultLabel()}</h1>
            <p className="mb-3 text-lg font-medium text-white/70">{getResultDescription()}</p>
            {isLineSkip && result.status === "redeemed_now" && (
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/60">Guaranteed entry</p>
            )}
            <p className="text-2xl font-semibold text-white/90">{result.ticket.owner_name}</p>
            <p className="mt-1 text-lg text-white/70">{result.ticket.ticket_name}</p>
          </div>
        </div>
      )}

      <PageHeader
        title="Scanner"
        description="Scan ticket QR codes to check in attendees."
        actions={
          selectedEventId ? (
            <Badge variant="success" size="md" className="h-8 px-3 text-[13px]">
              {stats.redeemed} / {stats.total} checked in
            </Badge>
          ) : undefined
        }
      />

      {urlEventId && (
        <Link
          href={`/business/events/${urlEventId}/manage`}
          className="-mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="size-3.5" /> Back to event
        </Link>
      )}

      {!selectedEventId ? (
        <Card className="mx-auto w-full max-w-md overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Select an event</h2>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">Choose which event you&apos;re checking guests into.</p>
          </div>
          <div className="border-t border-neutral-100 dark:border-neutral-800">
            {events.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={CalendarDays} title="No upcoming events" description="Create an event to start checking in attendees." />
              </div>
            ) : (
              events.map((event, i) => (
                <button
                  key={event.event_id}
                  onClick={() => setSelectedEventId(event.event_id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
                    i > 0 && "border-t border-neutral-100 dark:border-neutral-800"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{event.name}</span>
                    <span className="block truncate text-[13px] text-neutral-500 dark:text-neutral-400">
                      {event.venue_name} ·{" "}
                      {new Date(event.start_date_time).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-400 dark:text-neutral-500">
                      {event.total_attendees} sold · {Math.round(event.checkin_rate)}% checked in
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
                </button>
              ))
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Camera + controls */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-5 py-3.5">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{selectedEvent?.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { stopScanner(); setSelectedEventId(null); setScanLog([]) }}
                >
                  Change event
                </Button>
              </div>

              <div className="relative bg-neutral-950">
                <div id={SCANNER_CONTAINER_ID} className="w-full [&_video]:w-full" />
                {cameraError && (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <Camera className="mb-3 size-10 text-neutral-400" />
                    <p className="mb-3 text-sm text-neutral-300">{cameraError}</p>
                    <Button size="sm" onClick={startScanner}>Retry camera</Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", scanning ? "animate-pulse bg-green-500" : "bg-neutral-300 dark:bg-neutral-600")} />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{scanning ? "Scanning…" : "Camera off"}</span>
                </div>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {scanLog.length} scan{scanLog.length !== 1 ? "s" : ""} this session
                </span>
              </div>
            </Card>
          </div>

          {/* Scan feed */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <div className="border-b border-neutral-100 dark:border-neutral-800 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent scans</h3>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {scanLog.length === 0 ? (
                  <div className="flex flex-col items-center px-5 py-10 text-center">
                    <ScanLine className="mb-2 size-7 text-neutral-300 dark:text-neutral-600" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">No scans yet</p>
                    <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Point the camera at a ticket QR code.</p>
                  </div>
                ) : (
                  scanLog.map((entry, i) => (
                    <div key={`${entry.uuid}-${i}`} className={cn("flex items-start justify-between gap-3 px-5 py-3", i > 0 && "border-t border-neutral-50 dark:border-neutral-800/60")}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{entry.name}</p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{entry.ticket_name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn("text-xs font-semibold", getLogStatusColor(entry.status, entry.type))}>
                          {logLabel(entry.status, entry.type)}
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">{entry.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
