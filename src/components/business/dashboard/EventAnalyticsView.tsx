"use client"

import type { EventAnalytics } from "@/lib/business/types"

function formatCurrency(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function EventAnalyticsView({ data }: { data: EventAnalytics }) {
  const ticketTotal = data.ticketAccess.paid + data.ticketAccess.free + data.ticketAccess.guest

  return (
    <div className="space-y-6">
      {/* Revenue */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-ink mb-4">Revenue</h3>
        <p className="text-2xl font-bold text-green-600">{formatCurrency(data.revenue?.revenue ?? 0)}</p>
      </div>

      {/* Ticket Access + Check-in */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ticket Access */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">Ticket Access</h3>
          {ticketTotal > 0 ? (
            <>
              <div className="flex h-4 rounded-full overflow-hidden mb-3">
                {data.ticketAccess.paid > 0 && (
                  <div className="bg-blue-500" style={{ width: `${(data.ticketAccess.paid / ticketTotal) * 100}%` }} />
                )}
                {data.ticketAccess.free > 0 && (
                  <div className="bg-green-500" style={{ width: `${(data.ticketAccess.free / ticketTotal) * 100}%` }} />
                )}
                {data.ticketAccess.guest > 0 && (
                  <div className="bg-purple-500" style={{ width: `${(data.ticketAccess.guest / ticketTotal) * 100}%` }} />
                )}
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Paid: {data.ticketAccess.paid}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Free: {data.ticketAccess.free}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> Guest: {data.ticketAccess.guest}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">No ticket data</p>
          )}
        </div>

        {/* Check-in */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">Check-in Rate</h3>
          <p className="text-2xl font-bold text-ink mb-2">{data.checkIn.percent.toFixed(1)}%</p>
          <ProgressBar value={data.checkIn.scanned} max={data.checkIn.total} color="bg-primary" />
          <p className="text-xs text-gray-500 mt-2">
            {data.checkIn.scanned} scanned / {data.checkIn.total} total
          </p>
        </div>
      </div>

      {/* Sales Channel */}
      {(data.doorSales.preSales > 0 || data.doorSales.doorSales > 0) && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">Sales Channel</h3>
          <div className="flex h-4 rounded-full overflow-hidden mb-3">
            {data.doorSales.preSales > 0 && (
              <div className="bg-blue-500" style={{ width: `${(data.doorSales.preSales / (data.doorSales.preSales + data.doorSales.doorSales)) * 100}%` }} />
            )}
            {data.doorSales.doorSales > 0 && (
              <div className="bg-orange-500" style={{ width: `${(data.doorSales.doorSales / (data.doorSales.preSales + data.doorSales.doorSales)) * 100}%` }} />
            )}
          </div>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Pre-sale: {formatCurrency(data.doorSales.preSales)}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Door: {formatCurrency(data.doorSales.doorSales)}</span>
          </div>
        </div>
      )}

      {/* Tier Breakdown */}
      {data.tierBreakdown.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">Revenue by Tier</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left py-2 font-medium">Tier</th>
                <th className="text-right py-2 font-medium">Sold</th>
                <th className="text-right py-2 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.tierBreakdown.map((tier) => (
                <tr key={tier.ticket_id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-ink">{tier.tier_name}</td>
                  <td className="py-2 text-right text-gray-600">{tier.sold}</td>
                  <td className="py-2 text-right font-medium text-ink">{formatCurrency(tier.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tracking Links */}
      {data.trackingLinks.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">Tracking Links</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left py-2 font-medium">Promoter</th>
                <th className="text-left py-2 font-medium">Code</th>
                <th className="text-right py-2 font-medium">Clicks</th>
                <th className="text-right py-2 font-medium">Sales</th>
              </tr>
            </thead>
            <tbody>
              {data.trackingLinks.map((link) => (
                <tr key={link.tracking_link_id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-ink">{link.promoter_name}</td>
                  <td className="py-2 text-gray-500 font-mono text-xs">{link.code}</td>
                  <td className="py-2 text-right text-gray-600">{link.clicks}</td>
                  <td className="py-2 text-right font-medium text-ink">{link.sales_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
