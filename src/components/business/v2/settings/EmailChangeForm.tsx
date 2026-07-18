"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Clock } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import {
  PENDING_STORAGE_KEY,
  canSubmitEmailChange,
  emailChangeErrorMessage,
  emailChangePendingMessage,
  emailChangeSuccessMessage,
  isSameAddress,
  makePendingRecord,
  readPendingRecord,
} from "@/lib/business/email-change"

interface EmailChangeFormProps {
  /** The current login credential — `businesses.email`, not `users.email`. */
  currentEmail: string
  businessId: number
}

interface ChangeEmailResponse {
  message?: string
  pending_email?: string
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

/**
 * Owner-only form for changing the business login email.
 *
 * Rendering is gated by the caller (settings page checks canChangeBusinessEmail);
 * HF-1's 403 is the authoritative backstop, and its copy is surfaced if a
 * non-owner ever reaches the endpoint anyway.
 */
export default function EmailChangeForm({ currentEmail, businessId }: EmailChangeFormProps) {
  const [newEmail, setNewEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  // Restore the "awaiting confirmation" hint on revisit. Client-side only —
  // see the LIMITATION note in lib/business/email-change.ts.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(PENDING_STORAGE_KEY)
      const pending = readPendingRecord(stored, businessId, currentEmail, Date.now())
      setPendingEmail(pending)
      if (stored && !pending) window.localStorage.removeItem(PENDING_STORAGE_KEY)
    } catch {
      // Storage unavailable (private mode, blocked). The banner is optional.
    }
  }, [businessId, currentEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await apiClient.post<ChangeEmailResponse>("/business/auth/change-email", {
        new_email: newEmail.trim(),
        password,
      })

      // Trust the server's echo of the address it actually staged.
      const staged = res?.pending_email || newEmail.trim()
      setSuccess(emailChangeSuccessMessage(staged))
      setPendingEmail(staged)
      setPassword("")
      setNewEmail("")

      try {
        window.localStorage.setItem(
          PENDING_STORAGE_KEY,
          JSON.stringify(makePendingRecord(businessId, staged, Date.now()))
        )
      } catch {
        // Non-fatal: the change is staged server-side regardless.
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(emailChangeErrorMessage(err.status, err.message))
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const submittable = canSubmitEmailChange(newEmail, password, currentEmail)
  const showsSameAddressHint = newEmail.length > 0 && isSameAddress(newEmail, currentEmail)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field id="current-email" label="Current login email">
        <Input id="current-email" type="email" value={currentEmail} disabled readOnly />
      </Field>

      {pendingEmail && !success && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <Clock className="size-4 shrink-0 mt-0.5" />
          <span>{emailChangePendingMessage(pendingEmail)}</span>
        </div>
      )}

      <Field id="new-email" label="New login email">
        <Input
          id="new-email"
          name="new_email"
          type="email"
          autoComplete="email"
          value={newEmail}
          onChange={(e) => {
            setNewEmail(e.target.value)
            setError("")
            setSuccess("")
          }}
          placeholder="you@business.com"
        />
      </Field>

      <Field id="current-password" label="Confirm your password">
        <Input
          id="current-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError("")
            setSuccess("")
          }}
          placeholder="Your current password"
        />
      </Field>

      {showsSameAddressHint && (
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          That&apos;s already your login email.
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !submittable}>
          {loading ? "Sending…" : "Send confirmation email"}
        </Button>
      </div>
    </form>
  )
}
