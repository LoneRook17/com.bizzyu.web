// /post-a-deal posts images as data URLs inside JSON. Vercel's function body
// limit is 4.5MB. Base64 is about 4/3 of the file, so a photo over ~3.3MB
// never reaches the route (413) and the form only sees a failed request.
// Shrink on the client first: longest edge 1600px, JPEG quality 0.8.

export const MAX_IMAGE_EDGE_PX = 1600
export const JPEG_QUALITY = 0.8
/** One image, as a data URL. Two of these plus the form stay under 4.5MB. */
export const MAX_DATA_URL_CHARS = 1_500_000

export const IMAGE_STILL_TOO_LARGE =
  "That photo is still too large to send. Please choose a smaller image."

export const IMAGE_UNREADABLE =
  "We couldn't read that image. Try a JPEG or PNG."

export function fittedSize(
  width: number,
  height: number,
  maxEdge = MAX_IMAGE_EDGE_PX,
): { width: number; height: number } {
  const w = Math.round(width)
  const h = Math.round(height)
  if (w <= 0 || h <= 0) return { width: 1, height: 1 }
  const edge = Math.max(w, h)
  if (edge <= maxEdge) return { width: w, height: h }
  const scale = maxEdge / edge
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

export function dataUrlWithinLimit(dataUrl: string, maxChars = MAX_DATA_URL_CHARS): boolean {
  return dataUrl.length > 0 && dataUrl.length <= maxChars
}

export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(IMAGE_UNREADABLE)
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(IMAGE_UNREADABLE)
  }

  try {
    const { width, height } = fittedSize(bitmap.width, bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error(IMAGE_UNREADABLE)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY)
    if (!dataUrl.startsWith("data:image/jpeg") || !dataUrlWithinLimit(dataUrl)) {
      throw new Error(IMAGE_STILL_TOO_LARGE)
    }
    return dataUrl
  } finally {
    bitmap.close()
  }
}
