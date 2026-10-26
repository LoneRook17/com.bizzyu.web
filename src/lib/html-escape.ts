/**
 * HTML-escape untrusted text before it is interpolated into an email body.
 *
 * One implementation for every Resend route (audit F30). The public forms
 * (contact, events-contact, submissions) used to interpolate raw input, so a
 * visitor could put markup into the notification the team opens in a mail
 * client. Escaping the five significant characters makes any string inert.
 *
 * Dependency-free so it runs under `node --test`.
 */
export function escapeHtml(value: string | number | boolean | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
