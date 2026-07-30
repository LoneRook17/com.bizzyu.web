// Phone helpers for the invite flow. Deliberately small and US-shaped, matching
// what services already does at the OTP endpoints (lineSkipCheckout.ts:673-675):
// strip to digits, assume +1 for 10 digits. The server's normalized matcher (I)
// is the authority on resolution — this only gets the value into the E.164 shape
// the contract asks for, and formats it for display.

/** Digits → E.164, or null if it cannot be one. Mirrors the services rule. */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

/** Progressive (555) 123-4567 formatting for a tel input. */
export function formatUsPhone(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/**
 * E.164 → (555) 123-4567, for showing the owner which number Bizzy texted.
 *
 * NOT formatUsPhone: that one is a progressive INPUT formatter and truncates to
 * the first 10 digits, so it renders +15551234567 as "(155) 512-3456" — a
 * plausible-looking wrong number on a receipt whose whole job is to be
 * checkable. Anything it cannot parse is returned unchanged rather than
 * half-formatted.
 */
export function formatE164(e164: string): string {
  const digits = e164.replace(/\D/g, '')
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (ten.length !== 10) return e164
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
}
