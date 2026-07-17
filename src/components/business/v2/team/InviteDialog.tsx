"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { AlertTriangle, CheckCircle2, Info, UserPlus } from "lucide-react"

import { createInvite } from "@/lib/team-invite/client"
import { formatUsPhone, isValidEmail, toE164 } from "@/lib/team-invite/phone"
import {
  EmailFailedError,
  MultipleMatchesError,
  type ContactType,
  type InviteCandidate,
  type InviteDelivery,
  type InviteRole,
} from "@/lib/team-invite/types"
import type { Venue } from "@/lib/business/types"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { Button } from "@/components/business/v2/ui/button"
import { Label } from "@/components/business/v2/ui/label"
import { Input, Select } from "@/components/business/v2/ui/input"
import CandidatePicker from "./CandidatePicker"
import InviteLinkActions from "./InviteLinkActions"

// Dev-only scenario switch for the invite mock. The inline literal compare is
// what folds at build time and drops the import — see lib/team-invite/client.ts.
const MockScenarioPicker =
  process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === "1"
    ? dynamic(() => import("./MockInviteScenarioPicker"), { ssr: false })
    : null

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited: () => void
  venues: Venue[]
  /** Real business name — it goes in the SMS the owner sends. */
  businessName: string
  /**
   * Prefill for re-inviting an existing pending row. The owner still presses
   * Create: a resend mints a fresh token and a fresh link, and the link is the
   * whole deliverable, so it lands on the result panel like any other invite
   * rather than firing off invisibly behind a menu item.
   */
  initial?: { contactType: ContactType; value: string; role: InviteRole; venueId: number | null } | null
}

const INVITABLE_ROLES: { value: InviteRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
]

interface Result {
  delivery: InviteDelivery
  link: string
  /** E.164 when invited by phone — prefills the composer. */
  phone: string | null
}

export default function InviteDialog({
  open, onOpenChange, onInvited, venues, businessName, initial = null,
}: InviteDialogProps) {
  // Phone-first: the contract's default, and the number is what a bar owner
  // actually has for their staff.
  const [contactType, setContactType] = useState<ContactType>(initial?.contactType ?? "phone")
  const [phone, setPhone] = useState(initial?.contactType === "phone" ? initial.value : "")
  const [email, setEmail] = useState(initial?.contactType === "email" ? initial.value : "")
  const [name, setName] = useState("")
  const [role, setRole] = useState<InviteRole>(initial?.role ?? "staff")
  const [venueId, setVenueId] = useState<string>(
    initial?.venueId != null ? String(initial.venueId) : ""
  ) // "" = global (null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [candidates, setCandidates] = useState<InviteCandidate[] | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const reset = () => {
    setContactType(initial?.contactType ?? "phone")
    setPhone(initial?.contactType === "phone" ? initial.value : "")
    setEmail(initial?.contactType === "email" ? initial.value : "")
    setName("")
    setRole(initial?.role ?? "staff")
    setVenueId(initial?.venueId != null ? String(initial.venueId) : "")
    setError("")
    setCandidates(null)
    setResult(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // Refresh on the way out if an invite actually landed, so the new pending
      // row is there when the dialog closes.
      if (result) onInvited()
      reset()
    }
    onOpenChange(next)
  }

  const contactValue = contactType === "phone" ? toE164(phone) : email.trim()
  const contactValid =
    contactType === "phone" ? contactValue !== null : isValidEmail(email)

  const submit = async (chosenUserId?: number) => {
    if (!contactValid || !contactValue) return
    setLoading(true)
    setError("")
    try {
      const created = await createInvite({
        role,
        contact: { type: contactType, value: contactValue },
        name: name.trim() || undefined,
        chosen_user_id: chosenUserId,
        venue_id: venueId ? Number(venueId) : null,
      })
      setCandidates(null)
      setResult({
        delivery: created.delivery,
        link: created.invite_link,
        phone: contactType === "phone" ? contactValue : null,
      })
    } catch (err) {
      if (err instanceof MultipleMatchesError) {
        setCandidates(err.candidates)
      } else if (err instanceof EmailFailedError) {
        // The invite EXISTS — only the email failed. Land on the result panel
        // with the link rather than an error that implies nothing happened.
        setCandidates(null)
        setResult({ delivery: "email_failed", link: err.invite_link, phone: null })
      } else {
        setError(err instanceof Error ? err.message : "Could not send the invite")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {result ? "Invite created" : candidates ? "Which one?" : "Invite team member"}
          </DialogTitle>
          <DialogDescription>
            {result
              ? "Send them the link — Bizzy doesn't text invites."
              : candidates
                ? "More than one account uses that contact."
                : "They'll get a link to join your team. You send it."}
          </DialogDescription>
        </DialogHeader>

        {MockScenarioPicker && <MockScenarioPicker />}

        {result ? (
          <ResultPanel
            result={result}
            businessName={businessName}
            onDone={() => handleOpenChange(false)}
          />
        ) : candidates ? (
          <CandidatePicker
            candidates={candidates}
            contactValue={contactType === "phone" ? formatUsPhone(phone) : email.trim()}
            loading={loading}
            onBack={() => setCandidates(null)}
            onChoose={(id) => submit(id)}
          />
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); submit() }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Invite by</Label>
              <div className="flex gap-1.5" role="tablist">
                {(["phone", "email"] as ContactType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={contactType === t}
                    onClick={() => { setContactType(t); setError("") }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      contactType === t
                        ? "border-primary bg-primary/5 text-neutral-900 dark:text-neutral-100"
                        : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {contactType === "phone" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-phone">Phone number</Label>
                <Input
                  id="invite-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  placeholder="(555) 123-4567"
                  value={formatUsPhone(phone)}
                  onChange={(e) => { setPhone(e.target.value); setError("") }}
                />
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                  We&apos;ll make you a link to text them. Bizzy never texts your staff.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError("") }}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-name">Their name <span className="font-normal text-neutral-400">(optional)</span></Label>
              <Input
                id="invite-name"
                autoComplete="off"
                placeholder="So you can tell invites apart"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as InviteRole)}>
                {INVITABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-venue">Venue assignment</Label>
              <Select id="invite-venue" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                <option value="">All venues (global)</option>
                {venues.map((v) => (
                  <option key={v.id} value={String(v.id)}>{v.name}</option>
                ))}
              </Select>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Global members can access all venues. Venue-specific members only see their assigned venue.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !contactValid}>
                <UserPlus /> {loading ? "Creating…" : "Create invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * The honest outcome panel. Every arm states what actually happened — an
 * emailed invite says so, a phone invite says the link is yours to send, and a
 * failed email says it failed. There is no arm that reports a send Bizzy did
 * not make.
 */
function ResultPanel({
  result, businessName, onDone,
}: {
  result: Result
  businessName: string
  onDone: () => void
}) {
  const tone = {
    email_sent: {
      icon: <CheckCircle2 className="size-5 shrink-0 text-green-600 dark:text-green-500" />,
      className: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40",
      title: "Invite emailed.",
      body: "They can also use the link below if the email goes missing.",
    },
    link_only: {
      icon: <Info className="size-5 shrink-0 text-blue-600 dark:text-blue-500" />,
      className: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
      title: "Invite ready to send.",
      body: "Bizzy doesn't text invites — send them this link and they're in.",
    },
    email_failed: {
      icon: <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-500" />,
      className: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
      title: "The invite email didn't send.",
      body: "The invite itself is fine — send them the link instead.",
    },
  }[result.delivery]

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${tone.className}`}>
        {tone.icon}
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{tone.title}</p>
          <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">{tone.body}</p>
        </div>
      </div>

      <InviteLinkActions link={result.link} businessName={businessName} phone={result.phone} />

      <DialogFooter>
        <Button type="button" onClick={onDone}>Done</Button>
      </DialogFooter>
    </div>
  )
}
