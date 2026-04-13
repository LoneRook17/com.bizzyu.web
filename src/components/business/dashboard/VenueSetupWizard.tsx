"use client"

import { useState, useRef } from "react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import AddressAutocomplete from "./AddressAutocomplete"

import { getApiBaseUrl } from "@/lib/api-url"

const BASE_URL = getApiBaseUrl()
const MAX_PHOTO_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png"]

export default function VenueSetupWizard() {
  const { business } = useAuth()
  const { venues, showWizard, dismissWizard, refreshVenues } = useVenue()

  const venue = venues[0] ?? null
  const isCreate = venue === null

  const [name, setName] = useState(venue?.name ?? business?.name ?? "")
  const [address, setAddress] = useState(venue?.address ?? "")
  const [description, setDescription] = useState(venue?.description ?? "")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState(venue?.photo_url ?? "")
  const [photoError, setPhotoError] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  if (!showWizard) return null

  const handlePhotoSelect = (file: File) => {
    setPhotoError("")
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Only JPEG and PNG files are accepted.")
      return
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError("Photo must be under 5MB.")
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const clearPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview("")
    setPhotoError("")
  }

  const uploadPhoto = async (venueId: number): Promise<boolean> => {
    if (!photoFile) return true
    try {
      const formData = new FormData()
      formData.append("image", photoFile)
      const res = await fetch(`${BASE_URL}/business/venues/${venueId}/photo`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed")
      return true
    } catch {
      setWarning("Venue created but photo upload failed. You can add a photo later in settings.")
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Venue name is required.")
      return
    }
    if (!photoFile && !photoPreview) {
      setPhotoError("Venue photo is required.")
      return
    }
    setLoading(true)
    setError("")
    setWarning("")
    try {
      let venueId: number
      if (isCreate) {
        const created = await apiClient.post<{ venue: { id: number } }>("/business/venues", {
          name: name.trim(),
          address: address.trim() || undefined,
          description: description.trim() || undefined,
        })
        venueId = created.venue.id
      } else {
        await apiClient.patch(`/business/venues/${venue.id}`, {
          name: name.trim(),
          address: address.trim() || undefined,
          description: description.trim() || undefined,
        })
        venueId = venue.id
      }

      const photoOk = await uploadPhoto(venueId)
      await refreshVenues()
      if (photoOk) dismissWizard()
    } catch {
      setError(isCreate ? "Failed to create venue. Please try again." : "Failed to update venue. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative rounded-2xl bg-white p-8 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-ink">
            {isCreate ? "Welcome! Let\u2019s create your first venue." : "Welcome! Let\u2019s set up your venue."}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Customize your venue details so students can find you.
          </p>
        </div>

        {warning && (
          <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
            {warning}
            <button type="button" onClick={dismissWizard} className="ml-2 font-medium underline">Dismiss</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Rooftop Bar"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder={business?.name ? `${business.name}'s address` : "123 Main St, City, ST"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Tell students about your venue..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* Venue Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue Photo <span className="text-red-500">*</span></label>
            {photoPreview ? (
              <div className="relative rounded-lg border border-gray-200 overflow-hidden">
                <img src={photoPreview} alt="Venue photo preview" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-gray-600 hover:bg-white hover:text-red-500 shadow-sm transition-colors cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handlePhotoSelect(f) }}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors
                  ${dragOver ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"}`}
              >
                <svg className="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <p className="text-sm text-gray-500">Drag & drop or click to upload</p>
                <p className="text-xs text-gray-400 mt-1">JPEG or PNG, max 5MB</p>
              </div>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); e.target.value = "" }}
              className="hidden"
            />
            {photoError && <p className="mt-1 text-xs text-red-500">{photoError}</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={dismissWizard}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? "Saving..." : isCreate ? "Create Venue" : "Save & Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
