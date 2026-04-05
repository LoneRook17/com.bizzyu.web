"use client"

interface SelectorItem {
  id: number
  label: string
}

interface AnalyticsEventSelectorProps {
  items: SelectorItem[]
  selected: number | null
  onChange: (id: number) => void
  placeholder: string
  loading?: boolean
}

export default function AnalyticsEventSelector({
  items,
  selected,
  onChange,
  placeholder,
  loading,
}: AnalyticsEventSelectorProps) {
  return (
    <select
      value={selected ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={loading}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink min-w-[200px] disabled:opacity-50"
    >
      <option value="">{loading ? "Loading..." : placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  )
}
