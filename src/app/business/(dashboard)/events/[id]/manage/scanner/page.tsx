"use client"

import { use } from "react"
import Link from "next/link"

export default function ScannerLinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const checkinUrl = `https://bizzyu.com/checkin`

  return (
    <div className="max-w-3xl">
      <Link href={`/business/events/${id}/manage`} className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
        &larr; Back to Manage
      </Link>
      <h1 className="text-xl font-bold text-ink mb-6">Scanner & QR Codes</h1>

      {/* How it works */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-3">How Check-In Works</h2>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>Each ticket has a unique QR code containing a check-in URL</li>
          <li>Door staff scans the QR code using the Bizzy scanner</li>
          <li>The system validates the ticket and marks it as redeemed</li>
          <li>A full-screen confirmation shows entry type (Entry / Line Skip)</li>
        </ol>
      </div>

      {/* Check-in URL format */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-3">Check-In URL Format</h2>
        <p className="text-xs text-gray-500 mb-2">Each ticket QR code contains a URL in this format:</p>
        <div className="rounded-lg bg-gray-50 px-4 py-3 font-mono text-xs text-gray-700 break-all">
          {checkinUrl}/&#123;ticket-uuid&#125;
        </div>
      </div>

      {/* Scanner link */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-3">Open Scanner</h2>
        <p className="text-xs text-gray-500 mb-3">
          Use the batch QR scanner to check in attendees at the door. The scanner uses your device camera to read ticket QR codes.
        </p>
        <Link
          href="/business/scanner"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          </svg>
          Open QR Scanner
        </Link>
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
        <h2 className="text-sm font-semibold text-blue-800 mb-2">Tips for Door Staff</h2>
        <ul className="space-y-1.5 text-xs text-blue-700">
          <li>Ensure good lighting for camera scanning</li>
          <li>Hold the camera steady, about 6-8 inches from the QR code</li>
          <li>Green screen = entry, Orange screen = line skip only</li>
          <li>Red screen = invalid or already scanned</li>
          <li>Check-in stats update in real-time across all devices</li>
        </ul>
      </div>
    </div>
  )
}
