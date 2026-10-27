"use client"

import BlastComposer, { type BlastComposerProps } from "@/components/business/v2/marketing/BlastComposer"

/**
 * Legacy entry (the unrouted `_legacy` dashboard's Followers tab). Delegates
 * to the staged v2 composer so there is exactly ONE composer contract: 160
 * for texts / 280 for announcements, emoji stripped as typed, compose →
 * review → send → sent. Before 2026-10-27 this file carried its own one-shot
 * textarea whose text cap was far past one SMS segment.
 */
export default function BlastComposerModal(props: BlastComposerProps) {
  return <BlastComposer {...props} />
}
