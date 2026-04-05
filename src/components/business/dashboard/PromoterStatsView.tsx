"use client"

import type { PromoterLink } from "@/lib/business/types"

export default function PromoterStatsView({ links }: { links: PromoterLink[] }) {
  if (links.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">No tracking link data yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-ink mb-3">Your Tracking Links</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="text-left py-2 font-medium">Event</th>
              <th className="text-left py-2 font-medium">Code</th>
              <th className="text-right py-2 font-medium">Clicks</th>
              <th className="text-right py-2 font-medium">Sales</th>
              <th className="text-right py-2 font-medium">CTR</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => {
              const ctr = link.clicks > 0 ? ((link.sales_count / link.clicks) * 100).toFixed(1) : "0.0"
              return (
                <tr key={link.tracking_link_id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-ink">{link.event_name}</td>
                  <td className="py-2 text-gray-500 font-mono text-xs">{link.code}</td>
                  <td className="py-2 text-right text-gray-600">{link.clicks}</td>
                  <td className="py-2 text-right font-medium text-ink">{link.sales_count}</td>
                  <td className="py-2 text-right text-gray-600">{ctr}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
