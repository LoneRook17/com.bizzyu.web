"use client"

import { useState, useRef } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { cn } from "@/lib/v2/utils"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  className?: string
}

/** v2 image uploader — drag/drop or click, POSTs to /business/upload/image. */
export default function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ""
  }

  return (
    <div className={className}>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Upload preview" className="h-48 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-neutral-600 shadow-sm transition-colors hover:bg-white hover:text-red-500"
          >
            <X className="size-4" />
          </button>
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
          onDrop={handleDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
            dragOver ? "border-[#079455] bg-green-50/60" : "border-neutral-300 hover:border-neutral-400"
          )}
        >
          {uploading ? (
            <Loader2 className="size-7 animate-spin text-[#079455]" />
          ) : (
            <>
              <ImagePlus className="mb-2 size-7 text-neutral-400" />
              <p className="text-sm text-neutral-600">Drag and drop or click to upload</p>
              <p className="mt-1 text-xs text-neutral-400">PNG, JPG, GIF up to 10MB</p>
            </>
          )}
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleInputChange} className="hidden" />

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}
