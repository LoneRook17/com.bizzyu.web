"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/business/v2/ui/button"

interface PaginationProps {
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="size-3.5" /> Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

/**
 * BETA visual polish: the pager as a table footer row ("1–10 of 14 ·
 * Page 1 of 2 ‹ ›"). Renders the count even on a single page; the arrows
 * only when there is somewhere to go.
 */
export function TablePager({
  page,
  total,
  limit,
  onPageChange,
  noun,
}: PaginationProps & { noun: string }) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return (
    <>
      <span className="tabular-nums">
        {total.toLocaleString("en-US")} {noun}
      </span>
      {totalPages > 1 && (
        <span className="ml-auto flex items-center gap-2">
          <span className="tabular-nums">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="icon-sm" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight />
          </Button>
        </span>
      )}
    </>
  )
}
