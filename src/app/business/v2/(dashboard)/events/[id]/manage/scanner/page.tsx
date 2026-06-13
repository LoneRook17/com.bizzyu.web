"use client"

import { use } from "react"
import Link from "next/link"
import { QrCode, ScanLine } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"

export default function V2ScannerLinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const checkinUrl = "https://bizzyu.com/checkin"

  return (
    <>
      <ManageSubheader
        eventId={id}
        title="Scanner & QR codes"
        subtitle="How check-in works and where to scan."
        actions={
          <Button asChild>
            <Link href="/business/v2/scanner"><ScanLine /> Open scanner</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader><CardTitle>How check-in works</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ol className="list-inside list-decimal space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li>Each ticket has a unique QR code containing a check-in URL.</li>
            <li>Door staff scan the QR code using the Bizzy scanner.</li>
            <li>The system validates the ticket and marks it as redeemed.</li>
            <li>A full-screen confirmation shows the entry type (Entry / Line skip).</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Check-in URL format</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <p className="mb-2 text-[13px] text-neutral-500 dark:text-neutral-400">Each ticket QR code contains a URL in this format:</p>
          <div className="break-all rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 font-mono text-xs text-neutral-700 dark:text-neutral-300">
            {checkinUrl}/&#123;ticket-uuid&#125;
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2"><QrCode className="size-4 text-[#05EB54]" /><CardTitle>Open scanner</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <p className="mb-3 text-[13px] text-neutral-500 dark:text-neutral-400">
            Use the batch QR scanner to check in attendees at the door. The scanner uses your device camera to read ticket QR codes.
          </p>
          <Button asChild>
            <Link href="/business/v2/scanner"><ScanLine /> Open QR scanner</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/40">
        <CardContent>
          <h2 className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-300">Tips for door staff</h2>
          <ul className="space-y-1.5 text-xs text-blue-700 dark:text-blue-400">
            <li>Ensure good lighting for camera scanning.</li>
            <li>Hold the camera steady, about 6–8 inches from the QR code.</li>
            <li>Green screen = entry, orange screen = line skip only.</li>
            <li>Red screen = invalid or already scanned.</li>
            <li>Check-in stats update in real time across all devices.</li>
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
