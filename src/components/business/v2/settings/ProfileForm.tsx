"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { BusinessProfile } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"

interface ProfileFormProps {
  profile: BusinessProfile
  onSaved: () => void
  disabled?: boolean
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

export default function ProfileForm({ profile, onSaved, disabled }: ProfileFormProps) {
  const [form, setForm] = useState({
    name: profile.name || "",
    contact_name: profile.contact_name || "",
    phone: profile.phone || "",
    address: profile.address || "",
    website: profile.website || "",
    instagram: profile.instagram || "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError("")
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled) return

    setLoading(true)
    setError("")
    setSuccess(false)
    try {
      const payload = { ...form }
      if (payload.website && !/^https?:\/\//i.test(payload.website)) {
        payload.website = `https://${payload.website}`
      }
      await apiClient.put("/business/profile", payload)
      setSuccess(true)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field id="profile-email" label="Email">
        <Input id="profile-email" type="email" value={profile.email} disabled readOnly />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="profile-name" label="Business name">
          <Input id="profile-name" name="name" value={form.name} onChange={handleChange} disabled={disabled} />
        </Field>
        <Field id="profile-contact" label="Contact name">
          <Input id="profile-contact" name="contact_name" value={form.contact_name} onChange={handleChange} disabled={disabled} />
        </Field>
      </div>

      <Field id="profile-phone" label="Phone">
        <Input id="profile-phone" name="phone" type="tel" value={form.phone} onChange={handleChange} disabled={disabled} />
      </Field>

      <Field id="profile-address" label="Address">
        <Input id="profile-address" name="address" value={form.address} onChange={handleChange} disabled={disabled} />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="profile-website" label="Website">
          <Input id="profile-website" name="website" value={form.website} onChange={handleChange} placeholder="www.yourbusiness.com" disabled={disabled} />
        </Field>
        <Field id="profile-instagram" label="Instagram">
          <Input id="profile-instagram" name="instagram" value={form.instagram} onChange={handleChange} placeholder="@handle" disabled={disabled} />
        </Field>
      </div>

      {error && <div className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="size-4" /> Profile updated successfully.
        </div>
      )}

      {!disabled && (
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save changes"}</Button>
        </div>
      )}
    </form>
  )
}
