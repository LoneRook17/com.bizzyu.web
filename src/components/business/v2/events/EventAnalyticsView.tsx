"use client"

import type { EventAnalytics } from "@/lib/business/types"
import { usd, cn } from "@/lib/v2/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"

function StackedBar({ segments }: { segments: { value: number; className: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) return null
  return (
    <div className="flex h-4 overflow-hidden rounded-full">
      {segments.map((seg, i) =>
        seg.value > 0 ? <div key={i} className={seg.className} style={{ width: `${(seg.value / total) * 100}%` }} /> : null
      )}
    </div>
  )
}

function LegendDot({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-neutral-600">
      <span className={cn("size-2 rounded-full", className)} /> {children}
    </span>
  )
}

export function EventAnalyticsView({ data }: { data: EventAnalytics }) {
  const ticketTotal = data.ticketAccess.paid + data.ticketAccess.free + data.ticketAccess.guest
  const channelTotal = data.doorSales.preSales + data.doorSales.doorSales
  const checkPct = data.checkIn.percent
  const promoterTakeHome = data.revenue?.promoter_attributed_take_home_cents ?? 0

  return (
    <div className="flex flex-col gap-5">
      {/* revenue */}
      <Card>
        <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <p className="text-3xl font-semibold tracking-tight text-[#079455]">{usd(data.revenue?.revenue ?? 0)}</p>
          <p className="mt-1 text-[13px] text-neutral-500">Your take-home — matches Stripe payout.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* ticket access */}
        <Card>
          <CardHeader><CardTitle>Ticket access</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {ticketTotal > 0 ? (
              <>
                <StackedBar segments={[
                  { value: data.ticketAccess.paid, className: "bg-blue-500" },
                  { value: data.ticketAccess.free, className: "bg-green-500" },
                  { value: data.ticketAccess.guest, className: "bg-purple-500" },
                ]} />
                <div className="mt-3 flex flex-wrap gap-4">
                  <LegendDot className="bg-blue-500">Paid: {data.ticketAccess.paid}</LegendDot>
                  <LegendDot className="bg-green-500">Free: {data.ticketAccess.free}</LegendDot>
                  <LegendDot className="bg-purple-500">Guest: {data.ticketAccess.guest}</LegendDot>
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-400">No ticket data</p>
            )}
          </CardContent>
        </Card>

        {/* check-in */}
        <Card>
          <CardHeader><CardTitle>Check-in rate</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="mb-2 text-2xl font-semibold tracking-tight text-neutral-900">{checkPct.toFixed(1)}%</p>
            <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-[#079455]" style={{ width: `${Math.min(checkPct, 100)}%` }} />
            </div>
            <p className="mt-2 text-[13px] text-neutral-500">{data.checkIn.scanned} scanned / {data.checkIn.total} total</p>
          </CardContent>
        </Card>
      </div>

      {/* sales channel */}
      {channelTotal > 0 && (
        <Card>
          <CardHeader><CardTitle>Sales channel</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <StackedBar segments={[
              { value: data.doorSales.preSales, className: "bg-blue-500" },
              { value: data.doorSales.doorSales, className: "bg-orange-500" },
            ]} />
            <div className="mt-3 flex flex-wrap gap-4">
              <LegendDot className="bg-blue-500">Pre-sale: {usd(data.doorSales.preSales)}</LegendDot>
              <LegendDot className="bg-orange-500">Door: {usd(data.doorSales.doorSales)}</LegendDot>
            </div>
          </CardContent>
        </Card>
      )}

      {/* tier breakdown */}
      {data.tierBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Revenue by tier</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                  <th className="py-2 text-left font-medium">Tier</th>
                  <th className="py-2 text-right font-medium">Sold</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.tierBreakdown.map((tier) => (
                  <tr key={tier.ticket_id} className="border-b border-neutral-50 last:border-0">
                    <td className="py-2 text-neutral-900">{tier.tier_name}</td>
                    <td className="py-2 text-right text-neutral-600">{tier.sold}</td>
                    <td className="py-2 text-right font-medium text-neutral-900">{usd(tier.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {promoterTakeHome > 0 && (() => {
              const tierTotal = data.tierBreakdown.reduce((s, t) => s + t.revenue, 0)
              return (
                <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-700">
                  Of the {usd(tierTotal)} above, <span className="font-semibold">{usd(promoterTakeHome / 100)}</span> was promoter-generated.
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* promoter performance */}
      {data.trackingLinks.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Promoter performance</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                  <th className="py-2 text-left font-medium">Name</th>
                  <th className="py-2 text-right font-medium">Clicks</th>
                  <th className="py-2 text-right font-medium">Sales</th>
                  <th className="py-2 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.trackingLinks.map((link) => (
                  <tr key={link.tracking_link_id} className="border-b border-neutral-50 last:border-0">
                    <td className="py-2 text-neutral-900">{link.promoter_name}</td>
                    <td className="py-2 text-right text-neutral-600">{link.clicks}</td>
                    <td className="py-2 text-right text-neutral-600">{link.sales_count}</td>
                    <td className="py-2 text-right font-medium text-neutral-900">{usd((link.commission_cents ?? 0) / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
