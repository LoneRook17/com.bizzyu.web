"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { acceptInvite, sendInviteCode, validateInvite } from "@/lib/team-invite/client"
import { isValidEmail } from "@/lib/team-invite/phone"
import type { InviteValidation } from "@/lib/team-invite/types"
import { clearBizSession } from "@/lib/business/cookies"
import { getApiBaseUrl } from "@/lib/api-url"
import { ROLE_LABELS } from "@/lib/business/constants"
import { Button } from "@/components/business/v2/ui/button"
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthFooterLink,
  AuthPasswordField,
  AuthSpinner,
  AuthSubmit,
} from "@/components/business/v2/auth/auth-shell"

// Dev-only scenario switch. The inline literal compare is what folds at build
// time and drops the import — see lib/team-invite/client.ts for why this is not
// routed through an imported constant.
const MockScenarioPicker =
  process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === "1"
    ? dynamic(() => import("@/components/team-invite/MockAcceptScenarioPicker"), { ssr: false })
    : null

export default function TeamInviteClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [validation, setValidation] = useState<InviteValidation | null>(null)
  const [loadError, setLoadError] = useState("")
  // Seeded from the token rather than flipped in the effect: with no token
  // there is nothing to wait for, and there is no spinner to stop.
  const [loading, setLoading] = useState(!!token)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    validateInvite(token)
      .then((v) => { if (!cancelled) setValidation(v) })
      .catch(() => { if (!cancelled) setLoadError("We couldn't check this invite. Refresh to try again.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <AuthCard title="Checking your invite…" subtitle="One moment.">
        {MockScenarioPicker && <MockScenarioPicker />}
        <div className="flex justify-center py-4"><AuthSpinner /></div>
      </AuthCard>
    )
  }

  // A missing token and a token the server rejected get the SAME copy on
  // purpose: a stranger poking at this page learns nothing about whether a
  // token is real.
  if (!token || loadError || !validation || validation.state === "invalid") {
    return (
      <Terminal
        title="This invite link isn't valid"
        body={loadError || "The link may be incomplete or it may have been replaced by a newer one. Ask whoever invited you to send a fresh link."}
      >
        {MockScenarioPicker && <MockScenarioPicker />}
      </Terminal>
    )
  }

  return <InviteStates token={token} validation={validation} />
}

function InviteStates({ token, validation }: { token: string; validation: InviteValidation }) {
  const roleLabel = ROLE_LABELS[validation.role] ?? validation.role
  const picker = MockScenarioPicker ? <MockScenarioPicker /> : null

  switch (validation.state) {
    case "expired":
      return (
        <Terminal
          title="This invite has expired"
          body={`Invites to ${validation.business_name} are good for 48 hours. Ask them to send you a new link — it only takes a moment.`}
        >
          {picker}
        </Terminal>
      )
    case "revoked":
      return (
        <Terminal
          title="This invite was withdrawn"
          body={`${validation.business_name} cancelled this invite. If that's a surprise, check with them directly.`}
        >
          {picker}
        </Terminal>
      )
    case "accepted":
      return (
        <Terminal
          title="You're already on this team"
          body={`You've already accepted your invite to ${validation.business_name}. Sign in and you're in.`}
          action={
            <Button asChild size="lg" className="w-full">
              <Link href="/business/login">Go to sign in</Link>
            </Button>
          }
        >
          {picker}
        </Terminal>
      )
    case "valid":
      if (validation.session && !validation.session.matches) {
        return <WrongAccount validation={validation}>{picker}</WrongAccount>
      }
      return <AcceptFlow token={token} validation={validation} roleLabel={roleLabel}>{picker}</AcceptFlow>
  }
}

/** Signed in, but as somebody else. Never silently accept as the wrong user. */
function WrongAccount({
  validation, children,
}: {
  validation: InviteValidation
  children?: React.ReactNode
}) {
  const [busy, setBusy] = useState(false)

  const switchAccount = async () => {
    setBusy(true)
    try {
      // Server clears biz_token (httpOnly — the page cannot); clearBizSession
      // clears the readable companion cookie so the middleware doesn't bounce
      // us straight back in on a stale session.
      await fetch(`${getApiBaseUrl()}/business/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {})
      clearBizSession()
      // Full reload, not a router push: validate must re-run server-side with
      // the cookie actually gone.
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="This invite isn't for this account"
      subtitle={`${validation.business_name} invited ${validation.invited_as}.`}
    >
      {children}
      <AuthAlert tone="error" className="mb-4">
        You&apos;re signed in as <span className="font-medium">{validation.session?.email}</span>.
        Accepting from here would put the wrong account on the team.
      </AuthAlert>
      <div className="flex flex-col gap-2.5">
        <Button size="lg" className="w-full" onClick={switchAccount} disabled={busy}>
          {busy ? "Signing out…" : "Sign out and accept as the invited person"}
        </Button>
        <Button asChild size="lg" variant="secondary" className="w-full">
          <Link href="/business">Stay signed in as {validation.session?.email}</Link>
        </Button>
      </div>
      <AuthFooterLink>
        Think this is your invite? Ask them to re-send it to the contact you use here.
      </AuthFooterLink>
    </AuthCard>
  )
}

function AcceptFlow({
  token, validation, roleLabel, children,
}: {
  token: string
  validation: InviteValidation
  roleLabel: string
  children?: React.ReactNode
}) {
  const { requires_otp, credential_step, needs_email } = validation

  const [codeSent, setCodeSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const sendCode = useCallback(async () => {
    setSending(true)
    setServerError("")
    try {
      await sendInviteCode(token)
      setCodeSent(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not send the code")
    } finally {
      setSending(false)
    }
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

    if (requires_otp && code.replace(/\D/g, "").length !== 6) {
      errs.code = "Enter the 6-digit code"
    }
    if (credential_step === "create_account") {
      if (!name.trim()) errs.name = "Your name is required"
      if (!isValidEmail(email)) errs.email = "Enter a valid email"
    }
    if (credential_step === "set_password" && needs_email && !isValidEmail(email)) {
      errs.email = "Enter a valid email"
    }
    if (credential_step !== "none") {
      if (password.length < 8) errs.password = "At least 8 characters"
      else if (!/\d/.test(password)) errs.password = "Include at least 1 number"
      else if (!/[a-zA-Z]/.test(password)) errs.password = "Include at least 1 letter"
    }

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setErrors({})
    setServerError("")
    try {
      await acceptInvite({
        token,
        // The OTP goes to accept, not to a verify call first: the existing
        // verify-code endpoint consumes the code and returns no proof, so
        // verifying separately would leave accept trusting the client.
        code: requires_otp ? code : undefined,
        name: credential_step === "create_account" ? name.trim() : undefined,
        email:
          credential_step === "create_account" || (credential_step === "set_password" && needs_email)
            ? email.trim()
            : undefined,
        // NEVER sent when the account already has a password.
        password: credential_step === "none" ? undefined : password,
      })
      setDone(true)
      // Server set biz_token on accept — go straight in.
      window.location.href = "/business"
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not accept the invite")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthCard title="You're on the team" subtitle={`Taking you to ${validation.business_name}…`}>
        <div className="flex justify-center py-4"><AuthSpinner /></div>
      </AuthCard>
    )
  }

  const subtitle =
    credential_step === "create_account"
      ? `You've been invited as ${roleLabel}. Set up your login to accept.`
      : credential_step === "set_password"
        ? `You've been invited as ${roleLabel}. Create a dashboard login to accept.`
        : `You've been invited as ${roleLabel}.`

  // OTP gate first: nothing is collected until the person proves the number is
  // theirs. This is what stops a sibling on a shared number inheriting the job.
  if (requires_otp && !codeSent) {
    return (
      <AuthCard title={`Join ${validation.business_name}`} subtitle={subtitle}>
        {children}
        <p className="mb-4 text-sm text-gray-600">
          To make sure this invite reaches the right person, we&apos;ll text a code to{" "}
          <span className="font-medium text-gray-900">{validation.invited_as}</span>.
        </p>
        {serverError && <AuthAlert tone="error" className="mb-4">{serverError}</AuthAlert>}
        <Button size="lg" className="w-full" onClick={sendCode} disabled={sending}>
          {sending ? "Sending…" : "Text me a code"}
        </Button>
        <AuthFooterLink>
          Not your number?{" "}
          <span className="font-medium">Ask {validation.business_name} to re-send the invite.</span>
        </AuthFooterLink>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={`Join ${validation.business_name}`} subtitle={subtitle}>
      {children}
      <form onSubmit={submit}>
        {requires_otp && (
          <div className="mb-4">
            <label htmlFor="invite-code" className="mb-1.5 block text-sm font-medium text-gray-700">
              Code sent to {validation.invited_as}
            </label>
            <input
              id="invite-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              autoFocus
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErrors({}) }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-gray-900 outline-none placeholder:text-gray-300 focus:border-[#05EB54]"
            />
            {errors.code && <p className="mt-1.5 text-sm text-red-600">{errors.code}</p>}
            <button
              type="button"
              onClick={sendCode}
              disabled={sending}
              className="mt-2 text-sm font-medium text-[#05EB54] hover:underline disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send a new code"}
            </button>
          </div>
        )}

        {credential_step === "create_account" && (
          <AuthField
            label="Your name"
            name="name"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors({}) }}
            placeholder="Jordan Reyes"
            required
            autoComplete="name"
            error={errors.name}
          />
        )}

        {(credential_step === "create_account" || (credential_step === "set_password" && needs_email)) && (
          <AuthField
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors({}) }}
            placeholder="you@example.com"
            required
            autoComplete="email"
            error={errors.email}
          />
        )}

        {/* Rendered ONLY for create_account and set_password. An existing user
            who already has a password never sees this — accepting an invite must
            never overwrite the login they already use. */}
        {credential_step !== "none" && (
          <AuthPasswordField
            label={credential_step === "set_password" ? "Create a dashboard password" : "Password"}
            name="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors({}) }}
            placeholder="Min 8 chars, 1 number, 1 letter"
            required
            autoComplete="new-password"
            error={errors.password}
          />
        )}

        {credential_step === "set_password" && (
          <p className="-mt-2 mb-4 text-[13px] text-gray-500">
            You use Bizzy with a texted code today. The dashboard signs in with an email and
            password, so pick one now — your app login keeps working.
          </p>
        )}

        {serverError && <AuthAlert tone="error" className="mb-4">{serverError}</AuthAlert>}

        <AuthSubmit loading={submitting}>
          {credential_step === "none" ? `Accept and join ${validation.business_name}` : "Create login and join"}
        </AuthSubmit>
      </form>

      {credential_step === "none" && (
        <AuthFooterLink>
          Joining as {validation.invited_as}.
        </AuthFooterLink>
      )}
    </AuthCard>
  )
}

function Terminal({
  title, body, action, children,
}: {
  title: string
  body: string
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <AuthCard title={title} subtitle={body}>
      {children}
      {action ?? (
        <Button asChild size="lg" variant="secondary" className="w-full">
          <Link href="/business/login">Go to sign in</Link>
        </Button>
      )}
    </AuthCard>
  )
}
