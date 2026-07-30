"use client"

import { useEffect, useRef, useState } from "react"
import { ImageIcon, X } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import { getApiBaseUrl } from "@/lib/api-url"
import { cn } from "@/lib/v2/utils"
import type { Venue, BusinessProfile } from "@/lib/business/types"
import AddressAutocomplete from "@/components/business/dashboard/AddressAutocomplete"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle,
} from "@/components/business/v2/ui/dialog"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Textarea, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import {
  CAMPUS_FIELD_HELPER,
  CAMPUS_FIELD_LABEL,
  SAME_AS_BUSINESS_LABEL,
  campusOptionLabel,
  campusSelectValue,
  venueCampusPayload,
  venueSaveErrorMessage,
  type CampusOption,
} from "@/lib/business/venue-campus"

const BASE_URL = getApiBaseUrl()
const MAX_PHOTO_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png"]

function normalizeWebsite(raw: string): string | null {
  let w = raw.trim()
  if (w && !w.startsWith("http://") && !w.startsWith("https://")) w = "https://" + w
  return w || null
}

interface VenueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, the dialog edits this venue; otherwise it creates a new one. */
  venue?: Venue | null
}

export default function VenueDialog({ open, onOpenChange, venue }: VenueDialogProps) {
  const isEdit = !!venue
  const { refreshVenues, setSelectedVenue } = useVenue()

  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [description, setDescription] = useState("")
  const [website, setWebsite] = useState("")
  const [instagram, setInstagram] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [savedPhotoUrl, setSavedPhotoUrl] = useState("")
  const [photoPreview, setPhotoPreview] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [photoDeleting, setPhotoDeleting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [sameAsBusiness, setSameAsBusiness] = useState(false)
  // #14 per-venue campus. "" = "Same as business (default)" (inherit).
  const [campusValue, setCampusValue] = useState("")
  const [campuses, setCampuses] = useState<CampusOption[]>([])

  // Sync form to venue (or reset for create) whenever opened / venue changes
  useEffect(() => {
    if (!open) return
    setName(venue?.name ?? "")
    setAddress(venue?.address ?? "")
    setDescription(venue?.description ?? "")
    setWebsite(venue?.website ?? "")
    setInstagram(venue?.instagram ?? "")
    setPhotoFile(null)
    setSavedPhotoUrl(venue?.photo_url ?? "")
    setPhotoPreview(venue?.photo_url ?? "")
    setPhotoError("")
    setError("")
    setSameAsBusiness(false)
    // Edit prefills the venue's campus; create defaults to "Same as business".
    setCampusValue(campusSelectValue(venue?.campus_id))
  }, [open, venue])

  // Campus options (#14): the live universities list, same source the signup
  // campus picker reads (GET /business/auth/campuses). Fetched once, lazily,
  // when the dialog first opens; a failure just leaves "Same as business" — the
  // safe inherit default — as the only option.
  useEffect(() => {
    if (!open || campuses.length > 0) return
    let cancelled = false
    apiClient
      .authGet<{ campuses: CampusOption[] }>("/business/auth/campuses")
      .then((data) => { if (!cancelled && data.campuses?.length) setCampuses(data.campuses) })
      .catch(() => {}) // picker falls back to inherit-only
    return () => { cancelled = true }
  }, [open, campuses.length])

  // Create mode: load the business profile so we can offer "same as my
  // business" autofill - most businesses' first venue is their own location.
  useEffect(() => {
    if (!open || isEdit || profile) return
    let cancelled = false
    apiClient
      .get<BusinessProfile>("/business/profile")
      .then((p) => { if (!cancelled) setProfile(p) })
      .catch(() => {}) // checkbox just won't show if this fails
    return () => { cancelled = true }
  }, [open, isEdit, profile])

  const applySameAsBusiness = (checked: boolean) => {
    setSameAsBusiness(checked)
    if (checked && profile) {
      setName(profile.name ?? "")
      setAddress(profile.address ?? "")
      setWebsite(profile.website ?? "")
      setInstagram(profile.instagram ?? "")
    } else if (!checked) {
      setName("")
      setAddress("")
      setWebsite("")
      setInstagram("")
    }
  }

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

  const clearPhoto = async () => {
    setPhotoError("")
    if (photoFile) {
      setPhotoFile(null)
      setPhotoPreview(savedPhotoUrl)
      return
    }
    if (!savedPhotoUrl || !isEdit || !venue) {
      setPhotoPreview("")
      return
    }
    setPhotoDeleting(true)
    try {
      await apiClient.delete(`/business/venues/${venue.id}/photo`)
      setSavedPhotoUrl("")
      setPhotoPreview("")
      await refreshVenues()
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : "Failed to remove photo.")
    } finally {
      setPhotoDeleting(false)
    }
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
      return res.ok
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Venue name is required.")
      return
    }
    setLoading(true)
    setError("")
    try {
      if (isEdit && venue) {
        await apiClient.patch(`/business/venues/${venue.id}`, {
          name: name.trim(),
          address: address.trim() || null,
          description: description.trim() || null,
          website: normalizeWebsite(website),
          instagram: instagram.trim() || null,
          // null resets the venue to inherit the business campus; PATCH leaves
          // campus_id untouched only when the field is ABSENT, so it is always sent.
          campus_id: venueCampusPayload(campusValue),
        })
        const ok = await uploadPhoto(venue.id)
        await refreshVenues()
        if (!ok) {
          setError("Venue updated but photo upload failed.")
          setLoading(false)
          return
        }
        onOpenChange(false)
      } else {
        const created = await apiClient.post<{ venue: { id: number } }>("/business/venues", {
          name: name.trim(),
          address: address.trim() || undefined,
          description: description.trim() || undefined,
          website: normalizeWebsite(website) ?? undefined,
          instagram: instagram.trim() || undefined,
          // null → the server inherits the business campus (same as omitting).
          campus_id: venueCampusPayload(campusValue),
        })
        const venueId = created.venue.id
        const ok = await uploadPhoto(venueId)
        await refreshVenues()
        setSelectedVenue(venueId)
        if (!ok) {
          setError("Venue created but photo upload failed. You can add a photo later.")
          setLoading(false)
          return
        }
        onOpenChange(false)
      }
    } catch (err) {
      // Surface the API's 400 (e.g. an invalid campus_id) verbatim; everything
      // else keeps the generic mode-specific retry line.
      const status = err instanceof ApiError ? err.status : null
      const message = err instanceof ApiError ? err.message : undefined
      setError(venueSaveErrorMessage(status, message, isEdit))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!loading) onOpenChange(next) }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit venue" : "Add new venue"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isEdit && profile && (
            <label className="flex items-start gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors">
              <input
                type="checkbox"
                checked={sameAsBusiness}
                onChange={(e) => applySameAsBusiness(e.target.checked)}
                className="mt-0.5 size-4 rounded border-neutral-300 dark:border-neutral-600 text-[#05EB54] focus:ring-[#05EB54] cursor-pointer"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                <span className="font-medium">Same as my business</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Use {profile.name}&apos;s name, address, and contact info. Uncheck if this venue is somewhere different.
                </span>
              </span>
            </label>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue-name">Venue name</Label>
            <Input id="venue-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Downtown Location" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue-address">Address</Label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder="123 Main St, City, ST"
              className="flex h-9 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 shadow-sm outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus-visible:border-[#05EB54] focus-visible:ring-2 focus-visible:ring-[#05EB54]/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue-campus">{CAMPUS_FIELD_LABEL}</Label>
            <Select
              id="venue-campus"
              value={campusValue}
              onChange={(e) => setCampusValue(e.target.value)}
            >
              <option value="">{SAME_AS_BUSINESS_LABEL}</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {campusOptionLabel(c)}
                </option>
              ))}
            </Select>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{CAMPUS_FIELD_HELPER}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue-desc">Description <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span></Label>
            <Textarea id="venue-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description of this venue…" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="venue-website">Website <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span></Label>
              <Input id="venue-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="venue-instagram">Instagram <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span></Label>
              <Input id="venue-instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourvenue" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Venue photo</Label>
            {photoPreview ? (
              <div className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Venue photo preview" className="h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  disabled={photoDeleting}
                  className="absolute right-2 top-2 rounded-full bg-white/90 dark:bg-neutral-900/90 p-1.5 text-neutral-600 dark:text-neutral-400 shadow-sm transition-colors hover:bg-white dark:hover:bg-neutral-900 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-60"
                  aria-label={photoFile ? "Cancel new photo" : "Remove photo"}
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handlePhotoSelect(f) }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                  dragOver ? "border-[#05EB54] bg-green-50/60 dark:bg-green-950/40" : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400"
                )}
              >
                <ImageIcon className="mb-2 size-8 text-neutral-400 dark:text-neutral-500" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Drag and drop or click to upload</p>
                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">JPEG or PNG, max 5MB</p>
              </div>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); e.target.value = "" }}
              className="hidden"
            />
            {photoError && <p className="text-xs text-red-500 dark:text-red-400">{photoError}</p>}
          </div>

          {error && <div className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create venue")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
