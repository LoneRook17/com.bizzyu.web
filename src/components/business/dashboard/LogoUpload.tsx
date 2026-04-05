"use client"

import { useState, useRef } from "react"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

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
    } catch (err: any) {
      setError(err.message || "Upload failed")
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
    <div className="flex flex-col items-center w-full">
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled || uploading}
        className="relative w-full max-w-[320px] aspect-[16/9] rounded-xl overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors group cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        {currentUrl ? (
          <img src={currentUrl} alt="Business photo" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        {!disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? (
              <svg className="h-6 w-6 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            )}
          </div>
        )}
      </button>

      <p className="text-xs text-gray-500 mt-2">
        {disabled ? "Business Photo" : "This image appears on your venue card in the student app"}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
