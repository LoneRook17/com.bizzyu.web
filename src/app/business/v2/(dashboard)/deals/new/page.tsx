"use client"

import DealForm from "@/components/business/v2/deals/DealForm"
import RequireVenue from "@/components/business/v2/RequireVenue"

export default function CreateDealPage() {
  return (
    <RequireVenue>
      <DealForm />
    </RequireVenue>
  )
}
