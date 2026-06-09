"use client"

import { use } from "react"
import LineSkipForm from "@/components/business/v2/line-skips/LineSkipForm"

export default function EditLineSkipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <LineSkipForm mode="edit" lineSkipId={Number(id)} />
}
