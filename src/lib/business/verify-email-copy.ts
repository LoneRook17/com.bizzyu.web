// Success copy for the shared /business/verify-email landing page (aliased at
// /verify-email), which since HF-1 serves TWO token flows through one endpoint.
//
// Why this exists: POST /business/auth/verify-email now answers with a `kind`
// discriminator ("verification" | "email_change"). Before HF-2 the page ignored
// it and always rendered the signup copy, so an owner who confirmed an EMAIL
// CHANGE was told their account was "pending admin approval" — functionally
// correct (the change committed) but wrong on its face for an already-approved
// business.
//
// Dependency-free .ts so it runs under the repo's `node --test` convention.

export type VerifyEmailKind = "verification" | "email_change"

export interface VerifyEmailSuccessCopy {
  kind: VerifyEmailKind
  title: string
  subtitle: string
  alertTone: "warning" | "success"
  /** Rendered as a bold lead line above the body; null renders no lead line. */
  alertHeading: string | null
  alertBody: string
  ctaLabel: string
}

/**
 * Normalizes the `kind` field off a verify-email response.
 *
 * LEGACY CONTRACT: any response without a recognized `kind` — including every
 * response produced by services builds predating HF-1 — resolves to
 * "verification", which renders today's copy unchanged. That default is the
 * whole reason this page can ship ahead of, or behind, the services deploy.
 */
export function parseVerifyEmailKind(response: unknown): VerifyEmailKind {
  if (response && typeof response === "object") {
    const kind = (response as { kind?: unknown }).kind
    if (kind === "email_change") return "email_change"
  }
  return "verification"
}

/**
 * The "verification" arm is byte-identical to the pre-HF-2 page. Do not reword
 * it — signup verification is a live, high-traffic flow (211/259 businesses
 * verified through it) and this hotfix has no mandate to touch its copy.
 */
export function verifyEmailSuccessCopy(kind: VerifyEmailKind): VerifyEmailSuccessCopy {
  if (kind === "email_change") {
    return {
      kind: "email_change",
      title: "Email updated",
      subtitle: "Your login email has been changed.",
      alertTone: "success",
      alertHeading: null,
      alertBody: "Your email has been updated. Use it next time you sign in.",
      ctaLabel: "Go to Login",
    }
  }

  return {
    kind: "verification",
    title: "Email verified!",
    subtitle: "Your email address has been confirmed.",
    alertTone: "warning",
    alertHeading: "Your account is pending approval",
    alertBody:
      "You can explore your dashboard and build your first deal right away. It will go live once the Bizzy team approves your account. You'll get an email when that happens.",
    ctaLabel: "Go to Login",
  }
}
