"use client"

import { useState, useRef } from "react"
import { ImageIcon, Loader2, Upload } from "lucide-react"
import { getApiBaseUrl } from "@/lib/api-url"
import { cn } from "@/lib/v2/utils"

const BASE_URL = getApiBaseUrl()

interface LogoUploadProps {
  currentUrl: string | null
  onUploaded: () => void
  disabled?: boolean
}

export default function LogoUpload({ currentUrl, onUploaded, disabled }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
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
      formData.append("logo", file)
      const res = await fetch(`${BASE_URL}/business/profile/logo`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Upload failed")
      }
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ""
  }

  return (
    <div className="flex w-full flex-col items-center">
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled || uploading}
        className={cn(
          "group relative aspect-[16/9] w-full max-w-[340px] overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 transition-colors",
          !disabled && "cursor-pointer hover:border-[#05EB54]",
          (disabled || uploading) && "cursor-not-allowed opacity-70"
        )}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="Business logo" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-50 dark:bg-neutral-800/50 text-neutral-300 dark:text-neutral-600">
            <ImageIcon className="size-10" />
          </div>
        )}

        {!disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/40 opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? (
              <Loader2 className="size-6 animate-spin text-white" />
            ) : (
              <Upload className="size-6 text-white" />
            )}
          </div>
        )}
      </button>

      {!disabled && (
        <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
          Looking for venue photos? Each venue has its own, in the Venues tab.
        </p>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleInputChange} className="hidden" />
      {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
}
