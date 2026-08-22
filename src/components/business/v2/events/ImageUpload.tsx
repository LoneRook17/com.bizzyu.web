"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { useWeeklyCoverAccent } from "@/components/business/v2/door-access/WeeklyCoverAccent"
import { cn } from "@/lib/v2/utils"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  /** Visual aspect of the preview; flyers are portrait-ish, banners wide. */
  aspect?: "video" | "square"
  className?: string
  /** Shown when value is empty. Not treated as an uploaded flyer. */
  fallbackSrc?: string | null
  fallbackCaption?: string
}

/**
 * v2-styled image uploader. Mirrors the legacy dashboard ImageUpload behaviour
 * (POST /business/upload/image, 10MB cap, image-only) with the v2 surface look.
 */
export function ImageUpload({
  value,
  onChange,
  aspect = "video",
  className,
  fallbackSrc,
  fallbackCaption,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const weekly = useWeeklyCoverAccent()

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB")
      return
    }
    setError("")
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("image", file)
      const data = await apiClient.upload<{ url: string }>("/business/upload/image", formData)
      onChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const previewClass = aspect === "square" ? "aspect-square" : "aspect-video"
  const fallback = fallbackSrc?.trim() || ""
  const showFallback = !value && fallback.length > 0

  return (
    <div className={className}>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
          {/* Show the whole flyer (object-contain) at its natural ratio so portrait
              or landscape art isn't cropped; cap the height so it's not oversized. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Upload preview" className="mx-auto block max-h-[520px] w-auto max-w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-white/90 dark:bg-neutral-900/90 p-1.5 text-neutral-600 dark:text-neutral-400 shadow-sm transition-colors hover:bg-white dark:hover:bg-neutral-900 hover:text-red-500 dark:hover:text-red-400"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : showFallback ? (
        <div>
          <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fallback}
              alt={fallbackCaption || "Venue photo"}
              className="mx-auto block max-h-[520px] w-auto max-w-full object-contain"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) handleFile(file)
              }}
              className={cn(
                "absolute inset-0 flex items-end justify-end p-3 transition-colors",
                dragOver && (weekly ? "bg-access/10" : "bg-[#05EB54]/10")
              )}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm dark:bg-neutral-900/90 dark:text-neutral-200">
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
                {uploading ? "Uploading…" : "Add a flyer"}
              </span>
            </button>
          </div>
          {fallbackCaption && (
            <p className="mt-2 text-[13px] text-neutral-500 dark:text-neutral-400">{fallbackCaption}</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            previewClass,
            dragOver
              ? weekly
                ? "border-access bg-access/10 dark:bg-access/10"
                : "border-[#05EB54] bg-green-50/60 dark:bg-green-950/40"
              : "border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/50 hover:border-neutral-400 dark:hover:border-neutral-600"
          )}
        >
          {uploading ? (
            <Loader2 className={cn("size-7 animate-spin", weekly ? "text-access" : "text-[#05EB54]")} />
          ) : (
            <>
              <span className="flex size-11 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                <ImagePlus className="size-5" />
              </span>
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Drag and drop or click to upload</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">PNG, JPG, GIF up to 10MB</span>
            </>
          )}
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
        e.target.value = ""
      }} />

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
