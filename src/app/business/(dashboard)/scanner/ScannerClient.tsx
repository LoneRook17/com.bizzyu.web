"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { apiClient } from "@/lib/business/api-client"
import type { EventListItem } from "@/lib/business/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

interface ScanResult {
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
  status: string
  time: string
}

interface CheckinStats {
  total: number
  redeemed: number
}

export default function ScannerClient() {
  const [events, setEvents] = useState<EventListItem[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([])
  const [stats, setStats] = useState<CheckinStats>({ total: 0, redeemed: 0 })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [cameraError, setCameraError] = useState("")

  const scannerRef = useRef<any>(null)
  const scannerContainerId = "qr-reader"
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scanLockRef = useRef(false)

  // Fetch events
  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await apiClient.get<{ events: EventListItem[] }>("/business/events?tab=upcoming&limit=100")
        setEvents(data.events || [])
      } catch (err: any) {
        setError("Failed to load events")
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [])

  // Fetch stats when event changes
  useEffect(() => {
    if (!selectedEventId) return
    async function loadStats() {
      try {
        const data = await apiClient.get<CheckinStats>(`/checkin/event/${selectedEventId}/stats`)
        setStats(data)
      } catch {}
    }
    loadStats()
    const interval = setInterval(loadStats, 15000)
    return () => clearInterval(interval)
  }, [selectedEventId])

  // Extract UUID from QR content (URL or bare UUID)
  const extractUUID = (text: string): string => {
    try {
      const url = new URL(text)
      const filtered = url.pathname.split("/").filter(Boolean)
      return filtered[filtered.length - 1] || text
    } catch {
      return text
    }
  }

  // Handle a scanned QR code
  const handleScan = useCallback(async (decodedText: string) => {
    if (scanLockRef.current || !selectedEventId) return
    scanLockRef.current = true

    const uuid = extractUUID(decodedText)

    try {
      const res = await fetch(`${API_URL}/checkin/${uuid}/redeem`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data: ScanResult = await res.json()
      setResult(data)

      // Update stats on successful scan
      if (data.status === "redeemed_now") {
        setStats((prev) => ({ ...prev, redeemed: prev.redeemed + 1 }))
      }

      // Add to scan log
      setScanLog((prev) => [
        {
          uuid,
          name: data.ticket?.owner_name || "Unknown",
          ticket_name: data.ticket?.ticket_name || "Ticket",
          ticket_type: data.ticket_type,
          status: data.status,
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 49),
      ])

      // Auto-dismiss result after 3 seconds
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)
      resultTimeoutRef.current = setTimeout(() => {
        setResult(null)
        scanLockRef.current = false
      }, 3000)
    } catch {
      setResult({
        status: "invalid",
        ticket_type: null,
        ticket: { uuid, ticket_name: "", event_name: "", owner_name: "Error", redeemed_at: null },
      })
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)
      resultTimeoutRef.current = setTimeout(() => {
        setResult(null)
        scanLockRef.current = false
      }, 3000)
    }
  }, [selectedEventId])

  // Start camera scanner
  const startScanner = useCallback(async () => {
    setCameraError("")
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const scanner = new Html5Qrcode(scannerContainerId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          handleScan(decodedText)
        },
        () => {}
      )
      setScanning(true)
    } catch (err: any) {
      setCameraError(err?.message || "Camera access denied. Please allow camera permissions.")
    }
  }, [handleScan])

  // Stop camera scanner
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
    if (selectedEventId && !scanning) {
      startScanner()
    }
    return () => {
      stopScanner()
    }
  }, [selectedEventId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)
      stopScanner()
    }
  }, [stopScanner])

  // Result overlay colors
  const getResultColor = () => {
    if (!result) return ""
    if (result.status === "redeemed_now") {
      return "from-[#0d7a3e] to-[#05EB54]"
    }
    return "from-[#8B1A2B] to-[#c41e3a]"
  }

  const getResultLabel = () => {
    if (!result) return ""
    if (result.status === "redeemed_now") {
      return "ENTRY"
    }
    const labels: Record<string, string> = {
      already_redeemed: "ALREADY SCANNED",
      invalid: "INVALID TICKET",
      refunded: "REFUNDED",
      event_cancelled: "EVENT CANCELLED",
      ticket_belongs_to_another_event: "WRONG EVENT",
      event_not_active: "EVENT NOT ACTIVE",
    }
    return labels[result.status] || "ERROR"
  }

  const getLogStatusColor = (status: string) => {
    if (status === "redeemed_now") return "text-green-400"
    if (status === "already_redeemed") return "text-yellow-400"
    return "text-red-400"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Result overlay */}
      {result && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br ${getResultColor()} p-8`}
        >
          <div className="text-center">
            {result.status === "redeemed_now" ? (
              <svg className="mx-auto mb-4 h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="mx-auto mb-4 h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <h1 className="mb-2 text-5xl font-black text-white tracking-tight">{getResultLabel()}</h1>
            <p className="text-2xl font-semibold text-white/90">{result.ticket.owner_name}</p>
            <p className="mt-1 text-lg text-white/70">{result.ticket.ticket_name}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Scanner</h1>
          <p className="text-sm text-gray-500">Scan ticket QR codes to check in attendees</p>
        </div>
        {selectedEventId && (
          <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-2">
            <span className="text-sm font-medium text-primary">
              {stats.redeemed} / {stats.total} checked in
            </span>
          </div>
        )}
      </div>

      {/* Event selector */}
      {!selectedEventId ? (
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Select Event</h2>
            {events.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming events found.</p>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <button
                    key={event.event_id}
                    onClick={() => setSelectedEventId(event.event_id)}
                    className="w-full rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 cursor-pointer"
                  >
                    <p className="font-medium text-ink">{event.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {event.venue_name} &middot;{" "}
                      {new Date(event.start_date_time).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {event.total_attendees} tickets sold &middot; {Math.round(event.checkin_rate)}% checked in
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Camera + controls */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Event bar */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-medium text-ink">
                  {events.find((e) => e.event_id === selectedEventId)?.name}
                </p>
                <button
                  onClick={() => {
                    stopScanner()
                    setSelectedEventId(null)
                    setScanLog([])
                  }}
                  className="text-xs text-gray-500 hover:text-ink transition-colors cursor-pointer"
                >
                  Change Event
                </button>
              </div>

              {/* Camera view */}
              <div className="relative bg-black">
                <div id={scannerContainerId} className="w-full" />
                {cameraError && (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <svg className="mb-3 h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    <p className="mb-3 text-sm text-gray-500">{cameraError}</p>
                    <button
                      onClick={startScanner}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:brightness-110 transition-all cursor-pointer"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Scanner status */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${scanning ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                  <span className="text-xs text-gray-500">{scanning ? "Scanning..." : "Camera off"}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {scanLog.length} scan{scanLog.length !== 1 ? "s" : ""} this session
                </span>
              </div>
            </div>
          </div>

          {/* Scan feed */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-ink">Recent Scans</h3>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {scanLog.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-400">No scans yet</p>
                    <p className="mt-1 text-xs text-gray-300">Point camera at a ticket QR code</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {scanLog.map((entry, i) => (
                      <div key={`${entry.uuid}-${i}`} className="px-4 py-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-ink truncate">{entry.name}</p>
                            <p className="text-xs text-gray-500">
                              {entry.ticket_name}
                            </p>
                          </div>
                          <div className="ml-3 text-right shrink-0">
                            <p className={`text-xs font-semibold ${getLogStatusColor(entry.status)}`}>
                              {entry.status === "redeemed_now"
                                ? "ENTRY"
                                : entry.status === "already_redeemed"
                                  ? "ALREADY IN"
                                  : "ERROR"}
                            </p>
                            <p className="text-xs text-gray-400">{entry.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
