"use client"

import { Suspense } from "react"
import { PageHeader } from "@/components/business/v2/PageHeader"
import ScannerClient from "@/components/business/v2/scanner/ScannerClient"

export default function V2ScannerPage() {
  return (
    <Suspense fallback={<PageHeader title="Scanner" description="Scan ticket QR codes to check in attendees." />}>
      <ScannerClient />
    </Suspense>
  )
}
