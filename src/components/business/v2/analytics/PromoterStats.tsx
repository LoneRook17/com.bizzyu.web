"use client"

import { Link2 } from "lucide-react"
import type { PromoterLink } from "@/lib/business/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/business/v2/ui/card"
import { EmptyState } from "@/components/business/v2/ui/empty-state"

export default function PromoterStatsView({ links }: { links: PromoterLink[] }) {
  if (links.length === 0) {
    return <EmptyState icon={Link2} title="No tracking link data yet" description="Your clicks and sales will show up here once your links start getting traffic." />
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Your tracking links</CardTitle>
      </CardHeader>
      <CardContent className="border-t border-neutral-100 dark:border-neutral-800 px-0 py-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-xs text-neutral-500 dark:text-neutral-400">
                <th className="px-5 py-3 text-left font-medium">Event</th>
                <th className="px-5 py-3 text-left font-medium">Code</th>
                <th className="px-5 py-3 text-right font-medium">Clicks</th>
                <th className="px-5 py-3 text-right font-medium">Sales</th>
                <th className="px-5 py-3 text-right font-medium">CTR</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => {
                const ctr = link.clicks > 0 ? ((link.sales_count / link.clicks) * 100).toFixed(1) : "0.0"
                return (
                  <tr key={link.tracking_link_id} className="border-b border-neutral-50 dark:border-neutral-800 last:border-0">
                    <td className="px-5 py-3 text-neutral-900 dark:text-neutral-100">{link.event_name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-neutral-500 dark:text-neutral-400">{link.code}</td>
                    <td className="px-5 py-3 text-right text-neutral-600 dark:text-neutral-400">{link.clicks}</td>
                    <td className="px-5 py-3 text-right font-medium text-neutral-900 dark:text-neutral-100">{link.sales_count}</td>
                    <td className="px-5 py-3 text-right text-neutral-600 dark:text-neutral-400">{ctr}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
