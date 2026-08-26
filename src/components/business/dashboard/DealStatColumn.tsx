// Compact Impressions/Views/Claims column used in the deals list rows (DI-B3w).
// Loading → pulse placeholder; unavailable (endpoint not deployed / no row) →
// "—" quietly; otherwise the count with a "N unique" sub-text.

export function nf(n: number): string {
  return n.toLocaleString("en-US")
}

export function DealStatColumn({
  label,
  value,
  unique,
  loading,
  unavailable,
}: {
  label: string
  value?: number
  unique?: number
  loading: boolean
  unavailable: boolean
}) {
  return (
    <div className="w-20 text-right">
      <p className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{label}</p>
      {loading ? (
        <div className="ml-auto mt-1 h-4 w-12 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
      ) : unavailable || value === undefined ? (
        <p className="text-sm font-semibold text-neutral-300 dark:text-neutral-600">—</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{nf(value)}</p>
          {unique !== undefined && (
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{nf(unique)} unique</p>
          )}
        </>
      )}
    </div>
  )
}
