/**
 * Formatting for the API's wall-clock timestamps.
 *
 * "2026-08-14 21:00:00" is what /ui/venues/venue/:id returns. It is NOT
 * ISO-8601 and it carries no offset: it is the time on the clock behind the
 * bar. So it is formatted by pulling the fields straight out of the string,
 * never by handing it to `new Date()`.
 *
 * That is deliberate, not fussiness. `new Date("2026-08-14T21:00:00")` is
 * parsed in the RUNTIME's zone, which is UTC on Vercel and the reader's zone in
 * the browser, so the same string renders as two different times on the server
 * and the client. Doing the arithmetic on the string makes the output identical
 * everywhere, which is both correct for the venue and safe for hydration.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WallClock {
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
}

export function parseWallClock(raw: string | null | undefined): WallClock | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
    hh: Number(match[4] ?? 0),
    mm: Number(match[5] ?? 0),
  };
}

/** "2026-08-14 21:00:00" -> "Fri, Aug 14". */
export function formatDay(raw: string | null | undefined): string {
  const t = parseWallClock(raw);
  if (!t) return "";
  // Date.UTC purely to get the weekday. No zone can shift a UTC-constructed
  // date read back with getUTCDay, so this stays deterministic.
  const weekday = WEEKDAYS[new Date(Date.UTC(t.y, t.m - 1, t.d)).getUTCDay()];
  return `${weekday}, ${MONTHS[t.m - 1]} ${t.d}`;
}

/** "2026-08-14 21:00:00" -> "9:00 PM". */
export function formatTime(raw: string | null | undefined): string {
  const t = parseWallClock(raw);
  if (!t) return "";
  const ampm = t.hh >= 12 ? "PM" : "AM";
  const h12 = t.hh % 12 || 12;
  return `${h12}:${String(t.mm).padStart(2, "0")} ${ampm}`;
}

/** "21:00:00" -> "9:00 PM". Line skips carry date and time in separate fields. */
export function formatClock(raw: string | null | undefined): string {
  if (!raw) return "";
  const [h, m] = raw.split(":");
  const hh = Number(h);
  if (Number.isNaN(hh)) return "";
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${(m ?? "00").padStart(2, "0")} ${ampm}`;
}

/** Schema.org wants ISO-ish. Local time with no offset is valid and honest. */
export function toSchemaDate(raw: string | null | undefined): string | undefined {
  const t = parseWallClock(raw);
  if (!t) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.y}-${p(t.m)}-${p(t.d)}T${p(t.hh)}:${p(t.mm)}:00`;
}

/** "$20", "$12.50", or "" for nothing priced. Never invents a zero. */
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

/**
 * "19800 Village Center Dr Suite 235B, Fort Myers, FL 33913" split into the
 * PostalAddress fields Google reads. Returns null when the tail is not a
 * recognisable state, and the caller then emits the raw string instead of
 * guessing at a structure that is not there.
 */
export function postalAddress(address: string | null | undefined) {
  if (!address) return null;
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^(usa|united states)$/i.test(p));
  if (parts.length < 3) return null;

  const last = parts[parts.length - 1];
  const state = last.match(/^([A-Za-z]{2})(?:\s+(\d{5})(?:-\d{4})?)?$/);
  if (!state) return null;

  return {
    "@type": "PostalAddress" as const,
    streetAddress: parts.slice(0, -2).join(", "),
    addressLocality: parts[parts.length - 2],
    addressRegion: state[1].toUpperCase(),
    ...(state[2] ? { postalCode: state[2] } : {}),
    addressCountry: "US",
  };
}
