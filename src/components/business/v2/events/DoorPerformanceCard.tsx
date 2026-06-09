"use client"

import { useMemo, useState } from "react"
import type { PerScannerRow } from "@/lib/business/types"
import { usd } from "@/lib/v2/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"

type SortKey =
  | "staff" | "scanner_label" | "valid_scans" | "rejected_scans"
  | "sold_count" | "sold_revenue" | "revenue" | "first_scan_at" | "last_scan_at"
type SortDir = "asc" | "desc"

function totalRevenueOf(r: PerScannerRow): number {
  return r.total_revenue ?? r.revenue
}

function fmtTime(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function staffLabel(row: PerScannerRow) {
  if (row.staff_user_id == null) return "Unknown"
  if (!row.staff_name) return "Removed staff"
  return row.staff_name
}

export function DoorPerformanceCard({ rows, error }: { rows: PerScannerRow[]; error?: string | null }) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "staff": return staffLabel(a).localeCompare(staffLabel(b)) * dir
        case "scanner_label": return (a.scanner_label ?? "").localeCompare(b.scanner_label ?? "") * dir
        case "valid_scans": return (a.valid_scans - b.valid_scans) * dir
        case "rejected_scans": return (a.rejected_scans - b.rejected_scans) * dir
        case "sold_count": return ((a.sold_count ?? 0) - (b.sold_count ?? 0)) * dir
        case "sold_revenue": return ((a.sold_revenue ?? 0) - (b.sold_revenue ?? 0)) * dir
        case "revenue": return (totalRevenueOf(a) - totalRevenueOf(b)) * dir
        case "first_scan_at": return (a.first_scan_at ?? "").localeCompare(b.first_scan_at ?? "") * dir
        case "last_scan_at": return (a.last_scan_at ?? "").localeCompare(b.last_scan_at ?? "") * dir
      }
    })
    return copy
  }, [rows, sortKey, sortDir])

  function clickHeader(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else {
      setSortKey(key)
      setSortDir(key === "staff" || key === "scanner_label" ? "asc" : "desc")
    }
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return ""
    return sortDir === "asc" ? " ▲" : " ▼"
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40">
        <CardContent>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Door performance</h3>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
          <p className="mt-1 text-xs text-red-500 dark:text-red-400">Refresh the page to retry.</p>
        </CardContent>
      </Card>
    )
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Door performance</CardTitle></CardHeader>
        <CardContent className="pt-0"><p className="text-sm text-neutral-400 dark:text-neutral-500">No door activity recorded yet.</p></CardContent>
      </Card>
    )
  }

  const th = "py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 cursor-pointer select-none hover:text-neutral-900 dark:hover:text-neutral-100"

  return (
    <Card>
      <CardHeader><CardTitle>Door performance</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className={`${th} text-left`} onClick={() => clickHeader("staff")}>Staff{arrow("staff")}</th>
                <th className={`${th} text-left`} onClick={() => clickHeader("scanner_label")}>Scanner{arrow("scanner_label")}</th>
                <th className={`${th} text-right`} onClick={() => clickHeader("valid_scans")}>Valid{arrow("valid_scans")}</th>
                <th className={`${th} text-right`} onClick={() => clickHeader("rejected_scans")}>Rejected{arrow("rejected_scans")}</th>
                <th className={`${th} text-right`} onClick={() => clickHeader("sold_count")}>Sold{arrow("sold_count")}</th>
                <th className={`${th} text-right`} onClick={() => clickHeader("sold_revenue")}>Sales{arrow("sold_revenue")}</th>
                <th className={`${th} text-right`} onClick={() => clickHeader("revenue")}>Revenue{arrow("revenue")}</th>
                <th className={`${th} text-right`} onClick={() => clickHeader("first_scan_at")}>First{arrow("first_scan_at")}</th>
                <th className={`${th} text-right`} onClick={() => clickHeader("last_scan_at")}>Last{arrow("last_scan_at")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => (
                <tr key={`${r.staff_user_id ?? "null"}-${r.scanner_label ?? "null"}-${idx}`} className="border-b border-neutral-50 dark:border-neutral-800 last:border-0">
                  <td className="py-2 text-neutral-900 dark:text-neutral-100">{staffLabel(r)}</td>
                  <td className="py-2 text-neutral-600 dark:text-neutral-400">{r.scanner_label ?? "—"}</td>
                  <td className="py-2 text-right text-neutral-600 dark:text-neutral-400">{r.valid_scans}</td>
                  <td className="py-2 text-right text-neutral-600 dark:text-neutral-400">{r.rejected_scans}</td>
                  <td className="py-2 text-right text-neutral-600 dark:text-neutral-400">{r.sold_count ?? 0}</td>
                  <td className="py-2 text-right text-neutral-600 dark:text-neutral-400">{usd(r.sold_revenue ?? 0)}</td>
                  <td className="py-2 text-right font-medium text-neutral-900 dark:text-neutral-100">{usd(totalRevenueOf(r))}</td>
                  <td className="whitespace-nowrap py-2 text-right text-neutral-500 dark:text-neutral-400">{fmtTime(r.first_scan_at)}</td>
                  <td className="whitespace-nowrap py-2 text-right text-neutral-500 dark:text-neutral-400">{fmtTime(r.last_scan_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
