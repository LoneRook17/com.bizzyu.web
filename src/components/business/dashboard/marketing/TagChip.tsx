import type { AttendeeTag } from "./types"

interface Props {
  tag: AttendeeTag
  onRemove?: () => void
  size?: "sm" | "md"
}

export default function TagChip({ tag, onRemove, size = "sm" }: Props) {
  const px = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${px}`}
      style={{
        backgroundColor: `${tag.color_hex}1F`,
        color: tag.color_hex,
        border: `1px solid ${tag.color_hex}40`,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full hover:bg-black/10"
          aria-label={`Remove ${tag.name} tag`}
        >
          <svg viewBox="0 0 12 12" className="h-2 w-2" stroke="currentColor" strokeWidth={2} fill="none">
            <path d="M2 2 L10 10 M10 2 L2 10" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  )
}
