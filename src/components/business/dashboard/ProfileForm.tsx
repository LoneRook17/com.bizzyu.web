"use client"

import { useState } from "react"
import FormInput from "@/components/business/auth/FormInput"
import AuthSubmitButton from "@/components/business/auth/AuthSubmitButton"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { BusinessProfile } from "@/lib/business/types"

interface ProfileFormProps {
  profile: BusinessProfile
  onSaved: () => void
  disabled?: boolean
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
      await apiClient.put("/business/profile", form)
      setSuccess(true)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Read-only email */}
      <FormInput
        label="Email"
        name="email"
        type="email"
        value={profile.email}
        onChange={() => {}}
        disabled
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <FormInput
          label="Business Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          disabled={disabled}
        />
        <FormInput
          label="Contact Name"
          name="contact_name"
          value={form.contact_name}
          onChange={handleChange}
          disabled={disabled}
        />
      </div>

      <FormInput
        label="Phone"
        name="phone"
        type="tel"
        value={form.phone}
        onChange={handleChange}
        disabled={disabled}
      />

      <FormInput
        label="Address"
        name="address"
        value={form.address}
        onChange={handleChange}
        disabled={disabled}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <FormInput
          label="Website"
          name="website"
          type="url"
          value={form.website}
          onChange={handleChange}
          placeholder="https://..."
          disabled={disabled}
        />
        <FormInput
          label="Instagram"
          name="instagram"
          value={form.instagram}
          onChange={handleChange}
          placeholder="@handle"
          disabled={disabled}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">Profile updated successfully.</div>
      )}

      {!disabled && (
        <AuthSubmitButton loading={loading}>Save Changes</AuthSubmitButton>
      )}
    </form>
  )
}
