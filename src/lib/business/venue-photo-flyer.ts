/**
 * Dash create/edit artwork when the host skips a custom flyer.
 *
 * Use the venue record's existing photo URL. Do not invent a Classic
 * template asset, and do not require a Classic pick.
 */

import type { ArtworkTemplate } from "./constants.ts"

export function resolvedCreateFlyerUrl(
  uploaded: string | null | undefined,
  venuePhoto: string | null | undefined,
): string {
  const own = String(uploaded ?? "").trim()
  if (own) return own
  return String(venuePhoto ?? "").trim()
}

/**
 * Templates are edit-only and optional. Classic is never implied.
 * A venue photo (or uploaded flyer) wins, so no template goes on the wire.
 */
export function artworkTemplateForSave(opts: {
  uploadedFlyer: string | null | undefined
  venuePhoto: string | null | undefined
  explicitTemplate?: ArtworkTemplate | null
  isEditing: boolean
}): ArtworkTemplate | null {
  if (resolvedCreateFlyerUrl(opts.uploadedFlyer, opts.venuePhoto)) return null
  if (!opts.isEditing) return null
  const picked = opts.explicitTemplate
  if (!picked || picked === "classic") return null
  return picked
}
