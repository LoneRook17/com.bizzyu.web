"use client"

import { useMemo, useState } from "react"
import type { PerScannerRow } from "@/lib/business/types"

type SortKey = "staff" | "scanner_label" | "valid_scans" | "rejected_scans" | "revenue" | "first_scan_at" | "last_scan_at"
type SortDir = "asc" | "desc"

function formatCurrency(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTime(iso: string | null) {
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

export default function DoorPerformanceCard({ rows }: { rows: PerScannerRow[] }) {
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
        case "revenue": return (a.revenue - b.revenue) * dir
        case "first_scan_at": return ((a.first_scan_at ?? "").localeCompare(b.first_scan_at ?? "")) * dir
        case "last_scan_at": return ((a.last_scan_at ?? "").localeCompare(b.last_scan_at ?? "")) * dir
      }
    })
    return copy
  }, [rows, sortKey, sortDir])

  function clickHeader(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir(key === "staff" || key === "scanner_label" ? "asc" : "desc")
    }
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return ""
    return sortDir === "asc" ? " ▲" : " ▼"
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-ink mb-3">Door Performance</h3>
        <p className="text-sm text-gray-400">No scans recorded yet.</p>
      </div>
    )
  }

  const cellHeader = "text-xs text-gray-500 py-2 font-medium cursor-pointer select-none hover:text-ink"

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-ink mb-3">Door Performance</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className={`${cellHeader} text-left`} onClick={() => clickHeader("staff")}>Staff{arrow("staff")}</th>
              <th className={`${cellHeader} text-left`} onClick={() => clickHeader("scanner_label")}>Scanner Label{arrow("scanner_label")}</th>
              <th className={`${cellHeader} text-right`} onClick={() => clickHeader("valid_scans")}>Valid{arrow("valid_scans")}</th>
              <th className={`${cellHeader} text-right`} onClick={() => clickHeader("rejected_scans")}>Rejected{arrow("rejected_scans")}</th>
              <th className={`${cellHeader} text-right`} onClick={() => clickHeader("revenue")}>Revenue{arrow("revenue")}</th>
              <th className={`${cellHeader} text-right`} onClick={() => clickHeader("first_scan_at")}>First scan{arrow("first_scan_at")}</th>
              <th className={`${cellHeader} text-right`} onClick={() => clickHeader("last_scan_at")}>Last scan{arrow("last_scan_at")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => (
              <tr key={`${r.staff_user_id ?? "null"}-${r.scanner_label ?? "null"}-${idx}`} className="border-b border-gray-50 last:border-0">
                <td className="py-2 text-ink">{staffLabel(r)}</td>
                <td className="py-2 text-gray-600">{r.scanner_label ?? "—"}</td>
                <td className="py-2 text-right text-gray-600">{r.valid_scans}</td>
                <td className="py-2 text-right text-gray-600">{r.rejected_scans}</td>
                <td className="py-2 text-right font-medium text-ink">{formatCurrency(r.revenue)}</td>
                <td className="py-2 text-right text-gray-500 whitespace-nowrap">{formatTime(r.first_scan_at)}</td>
                <td className="py-2 text-right text-gray-500 whitespace-nowrap">{formatTime(r.last_scan_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
