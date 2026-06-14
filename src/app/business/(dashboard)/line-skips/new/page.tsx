"use client"

import LineSkipForm from "@/components/business/v2/line-skips/LineSkipForm"
import RequireVenue from "@/components/business/v2/RequireVenue"

export default function CreateLineSkipPage() {
  return (
    <RequireVenue>
      <LineSkipForm mode="create" />
    </RequireVenue>
  )
}
