"use client"

import { useState } from "react"
import { QRCodeCanvas } from "qrcode.react"
import { Check, Copy, Download, ExternalLink } from "lucide-react"
import { useVenue } from "@/lib/business/venue-context"
import type { Venue } from "@/lib/business/types"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"

function venueUrl(id: number) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://bizzyu.com"
  return `${origin}/venue/${id}`
}

function VenueQrCard({ venue }: { venue: Venue }) {
  const [copied, setCopied] = useState(false)
  const url = venueUrl(venue.id)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt("Copy this link:", url)
    }
  }

  const download = () => {
    const canvas = document.getElementById(`venue-qr-${venue.id}`) as HTMLCanvasElement | null
    if (!canvas) return
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = `${venue.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-bizzy-qr.png`
    a.click()
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        {/* Rendered at 512px for a print-quality download, displayed small */}
        <div className="shrink-0 rounded-lg border border-neutral-200 bg-white p-1.5 dark:border-neutral-800">
          <QRCodeCanvas
            id={`venue-qr-${venue.id}`}
            value={url}
            size={512}
            marginSize={2}
            style={{ width: 84, height: 84 }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{venue.name}</p>
          <p className="mt-0.5 truncate text-[13px] text-neutral-500 dark:text-neutral-400">{url}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? (<><Check className="text-[#05EB54]" /> Copied</>) : (<><Copy /> Copy link</>)}
            </Button>
            <Button variant="secondary" size="sm" onClick={download}>
              <Download /> Download QR
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.open(url, "_blank")}>
              <ExternalLink /> Open page
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VenuePageSection() {
  const { venues } = useVenue()

  if (venues.length === 0) return null

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Venue pages</h2>
        <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
          Every venue gets a public page with its upcoming events. Share the link anywhere, or print the QR code for tables, posters, and the bar.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {venues.map((v) => (
          <VenueQrCard key={v.id} venue={v} />
        ))}
      </div>
    </section>
  )
}
