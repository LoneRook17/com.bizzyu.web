"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { AlertTriangle, CheckCircle2, Info, Loader2, UserPlus } from "lucide-react"

import { createInvite, lookupInviteContact } from "@/lib/team-invite/client"
import { formatE164, formatUsPhone, isValidEmail, toE164 } from "@/lib/team-invite/phone"
import { resolveInviteOutcome, type InviteOutcome } from "@/lib/team-invite/delivery"
import { resolveLookupView, type InviteLookup, type LookupView } from "@/lib/team-invite/lookup"
import {
  EmailFailedError,
  MultipleMatchesError,
  ReactivationRequiredError,
  type ContactType,
  type InviteCandidate,
  type InviteDelivery,
  type InviteDeliveryReason,
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
  /** null = legacy services that predate auto-send. See lib/team-invite/delivery.ts. */
  reason: InviteDeliveryReason | null
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
  // TI-3 directory lookup. `null` = not yet resolved (idle or in flight); the
  // form defaults to the legacy view until then so nothing jumps under the
  // owner's cursor. `checking` tracks the in-flight probe for the status line.
  const [lookup, setLookup] = useState<InviteLookup | null>(null)
  const [checking, setChecking] = useState(false)
  // TI-F2: the removed-member confirm. Set when create returns
  // REACTIVATION_REQUIRED; cleared on confirm or cancel.
  const [reactivation, setReactivation] = useState<{ maskedName?: string; chosenUserId?: number } | null>(null)

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
    setLookup(null)
    setChecking(false)
    setReactivation(null)
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

  // Resolved once, here, so the header line and the panel can never disagree
  // about what happened to this invite.
  const outcome = result
    ? resolveInviteOutcome(
        { delivery: result.delivery, reason: result.reason },
        result.phone ? formatE164(result.phone) : null
      )
    : null

  const contactValue = contactType === "phone" ? toE164(phone) : email.trim()
  const contactValid =
    contactType === "phone" ? contactValue !== null : isValidEmail(email)

  // Debounced directory lookup. Fires only on a COMPLETE contact, cancels the
  // prior probe on every keystroke, and never blocks the form: an aborted or
  // failed probe simply leaves the legacy view in place. Skipped entirely while
  // a picker / result / reactivation panel is up — the contact is settled then.
  useEffect(() => {
    if (!contactValid || !contactValue || candidates || result || reactivation) {
      setChecking(false)
      return
    }
    const controller = new AbortController()
    const type = contactType
    const value = contactValue
    setChecking(true)
    const t = setTimeout(async () => {
      try {
        const res = await lookupInviteContact({ type, value }, controller.signal)
        if (!controller.signal.aborted) {
          setLookup(res)
          setChecking(false)
        }
      } catch {
        // AbortError (superseded keystroke) or any failure: keep the legacy
        // view. A lookup is advisory and must never strand the owner.
        if (!controller.signal.aborted) setChecking(false)
      }
    }, 400)
    return () => {
      controller.abort()
      clearTimeout(t)
    }
    // Re-probe whenever the resolved contact changes; the panel flags gate it.
  }, [contactType, contactValue, contactValid, candidates, result, reactivation])

  // The lookup view drives the name field and the submit label. Until a probe
  // resolves, fall back to the legacy view so the form is fully usable and
  // never jumps — exactly the pre-TI-3 behaviour.
  const view: LookupView = resolveLookupView(lookup ?? { match: "legacy" })
  const nameSatisfied = !view.nameRequired || name.trim().length > 0

  const submit = async (opts?: { chosenUserId?: number; reactivate?: boolean }) => {
    if (!contactValid || !contactValue) return
    // On `multiple` the owner disambiguates in the pre-invoked picker before any
    // request goes out — no 409 round-trip. A chosen id means they already did.
    if (view.kind === "multiple" && view.candidates && !opts?.chosenUserId) {
      setCandidates(view.candidates)
      return
    }
    // Only carry the owner-entered name when the field is actually shown (new /
    // legacy). A resolved existing user already has an identity server-side.
    const displayName = view.showNameField ? name.trim() || undefined : undefined
    setLoading(true)
    setError("")
    try {
      const created = await createInvite({
        role,
        contact: { type: contactType, value: contactValue },
        name: displayName,
        display_name: displayName,
        chosen_user_id: opts?.chosenUserId,
        reactivate: opts?.reactivate,
        venue_id: venueId ? Number(venueId) : null,
      })
      setCandidates(null)
      setReactivation(null)
      setResult({
        delivery: created.delivery,
        reason: created.delivery_reason ?? null,
        link: created.invite_link,
        phone: contactType === "phone" ? contactValue : null,
      })
    } catch (err) {
      if (err instanceof MultipleMatchesError) {
        setCandidates(err.candidates)
      } else if (err instanceof ReactivationRequiredError) {
        // TI-F2: the contact is a removed member. Ask before reactivating —
        // preserve any sibling pick so the confirm re-submits the same person.
        setReactivation({ maskedName: err.masked_name, chosenUserId: opts?.chosenUserId })
      } else if (err instanceof EmailFailedError) {
        // The invite EXISTS — only the email failed. Land on the result panel
        // with the link rather than an error that implies nothing happened.
        setCandidates(null)
        setResult({ delivery: "email_failed", reason: null, link: err.invite_link, phone: null })
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
            {result ? "Invite created" : reactivation ? "Re-invite this person?" : candidates ? "Which one?" : "Invite team member"}
          </DialogTitle>
          <DialogDescription>
            {outcome
              ? outcome.description
              : reactivation
                ? "They were removed from your team before."
                : candidates
                  ? "More than one account uses that contact."
                  : "They'll get a link to join your team. You send it."}
          </DialogDescription>
        </DialogHeader>

        {MockScenarioPicker && <MockScenarioPicker />}

        {result && outcome ? (
          <ResultPanel
            result={result}
            outcome={outcome}
            businessName={businessName}
            onDone={() => handleOpenChange(false)}
          />
        ) : reactivation ? (
          <ReactivationPanel
            maskedName={reactivation.maskedName}
            loading={loading}
            onBack={() => setReactivation(null)}
            onConfirm={() => submit({ chosenUserId: reactivation.chosenUserId, reactivate: true })}
          />
        ) : candidates ? (
          <CandidatePicker
            candidates={candidates}
            contactValue={contactType === "phone" ? formatUsPhone(phone) : email.trim()}
            loading={loading}
            onBack={() => setCandidates(null)}
            onChoose={(id) => submit({ chosenUserId: id })}
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

            {/* Directory-lookup status. `checking` shows while a probe is in
                flight; a resolved non-legacy view shows the masked verdict. The
                legacy view has no banner, so this whole block vanishes and the
                form is byte-identical to pre-TI-3. */}
            {contactValid && checking ? (
              <div className="flex items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
                <span>Checking if they’re already on Bizzy…</span>
              </div>
            ) : contactValid && view.banner ? (
              <LookupBanner tone={view.banner.tone} text={view.banner.text} />
            ) : null}

            {view.showNameField && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-name">
                  Their name{" "}
                  <span className="font-normal text-neutral-400">
                    {view.nameRequired ? "" : "(optional)"}
                  </span>
                </Label>
                <Input
                  id="invite-name"
                  autoComplete="off"
                  placeholder={
                    view.nameRequired
                      ? "So their row isn’t blank until they join"
                      : "So you can tell invites apart"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

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
              <Button type="submit" disabled={loading || !contactValid || !nameSatisfied}>
                <UserPlus /> {loading ? "Creating…" : view.submitLabel}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * The inline directory-lookup status line under the contact field. Compact by
 * design — it is a live hint while the owner types, not a result panel. Copy and
 * tone are decided in lib/team-invite/lookup.ts; this only paints them.
 */
function LookupBanner({ tone, text }: { tone: "success" | "info" | "warning"; text: string }) {
  const chrome = {
    success: {
      icon: <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-500" />,
      className: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40 text-green-800 dark:text-green-300",
    },
    info: {
      icon: <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-500" />,
      className: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300",
    },
    warning: {
      icon: <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />,
      className: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
    },
  }[tone]

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] ${chrome.className}`}>
      {chrome.icon}
      <span>{text}</span>
    </div>
  )
}

/**
 * TI-F2 confirm: the contact resolves to a member the business previously
 * removed. Bizzy will NOT silently reactivate them — the owner says so
 * explicitly. Masked name if the server sent one, generic sentence otherwise.
 */
function ReactivationPanel({
  maskedName, loading, onBack, onConfirm,
}: {
  maskedName?: string
  loading: boolean
  onBack: () => void
  onConfirm: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900 dark:bg-amber-950/40">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
            {maskedName ? `${maskedName} was removed from your team.` : "This person was removed from your team."}
          </p>
          <p className="mt-0.5 text-[13px] text-amber-800 dark:text-amber-400/90">
            Re-inviting them restores their access once they accept. Only they can accept.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button type="button" onClick={onConfirm} disabled={loading}>
          {loading ? "Re-inviting…" : "Re-invite them"}
        </Button>
      </DialogFooter>
    </div>
  )
}

/** Tone → chrome. Copy and affordances come from resolveInviteOutcome. */
const TONE_CHROME = {
  success: {
    icon: <CheckCircle2 className="size-5 shrink-0 text-green-600 dark:text-green-500" />,
    className: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40",
  },
  info: {
    icon: <Info className="size-5 shrink-0 text-blue-600 dark:text-blue-500" />,
    className: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
  },
  warning: {
    icon: <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-500" />,
    className: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  },
} as const

/**
 * The honest outcome panel. Every arm states what actually happened — a texted
 * invite says so and names the number, an emailed one says so, a duplicate says
 * the earlier text still stands, and a failed send says it failed. There is no
 * arm that reports a send Bizzy did not make, and none that hides one it did.
 *
 * All of that lives in lib/team-invite/delivery.ts; this renders the verdict.
 */
function ResultPanel({
  result, outcome, businessName, onDone,
}: {
  result: Result
  outcome: InviteOutcome
  businessName: string
  onDone: () => void
}) {
  const chrome = TONE_CHROME[outcome.tone]

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${chrome.className}`}>
        {chrome.icon}
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{outcome.title}</p>
          <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">{outcome.body}</p>
        </div>
      </div>

      <InviteLinkActions
        link={result.link}
        businessName={businessName}
        phone={result.phone}
        showManualText={outcome.showManualText}
      />

      <DialogFooter>
        <Button type="button" onClick={onDone}>Done</Button>
      </DialogFooter>
    </div>
  )
}
