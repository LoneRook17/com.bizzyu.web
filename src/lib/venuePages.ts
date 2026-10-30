import { unstable_cache } from "next/cache";
import { fetchUniversities } from "./universities";
import { fetchVenues, type Venue } from "./venues";

const API_BASE = "https://services.bizzy-deals.com";

/**
 * One public page per venue, at the bare slug: bizzyu.com/backroads-brewhouse.
 *
 * This is the SEO surface. It is NOT /venue/:id, which stays exactly as it is:
 * that page is the app's universal-link target (Smart App Banner, share sheet,
 * ?line_skip= highlight) and nothing here touches it, its API, or any event.
 * Everything below is read-only against endpoints the site already calls.
 */

/**
 * "Backroads Brewhouse" -> "backroads-brewhouse".
 *
 * Apostrophes are dropped rather than hyphenated, so "Bogie's" is
 * "bogies" and not "bogie-s" — a bar's name is typed without the
 * apostrophe far more often than with it.
 */
export function venueSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Top-level paths a venue slug may never take.
 *
 * Next resolves static segments before the dynamic one, so a venue named
 * "Events" would silently render the marketing page instead of itself and be
 * unreachable forever. Suffixing it is the difference between a wrong page and
 * a working one. Campus slugs get added to this set at build time (below) for
 * the same reason: the dispatcher checks campus first.
 *
 * ADD TO THIS LIST when a new top-level route lands. It is every directory in
 * src/app (minus [slug]) plus the two file routes and the /p rewrite, and the
 * cost of forgetting is a venue page that silently never renders.
 */
const RESERVED_SLUGS = new Set([
  "about", "accept-invite", "account", "admin", "api", "brands", "business", "businesses",
  "deals", "go",
  "checkin", "checkout", "contact", "deal", "event", "events", "lineskip", "ls",
  "post-a-deal", "premium", "privacy", "promote", "promoter", "robots",
  "setup-password", "sitemap", "sms-opt-in-proof", "street-interviews",
  "students", "support-chat", "team-invite", "terms", "venue", "verify-email",
  "p", "_next",
]);

export interface VenueDirectoryEntry {
  id: number;
  /** URL segment, e.g. "backroads-brewhouse". */
  slug: string;
  name: string;
  /** Short campus handle, e.g. "FGCU". */
  campus: string;
  campusFullName: string;
  campusSlug: string;
  photo: string | null;
  upcomingEvents: number;
  lineSkips: number;
}

/**
 * Every live venue, with a stable slug assigned.
 *
 * Slugs are assigned by ascending venue id, so the same bar keeps the same URL
 * as new venues appear. Two bars with the same name (a "Library" exists at more
 * than one school) resolve by campus handle, then by id, and only the loser
 * moves — the incumbent's URL never changes underneath it.
 *
 * Built on fetchVenues(), which the /events page already runs in production, so
 * this adds no new API surface. It swallows failures and returns [], which is
 * correct here: an empty directory costs the sitemap and a 404 on a page that
 * self-heals next request. It can never publish something wrong.
 */
async function fetchVenueDirectoryUncached(): Promise<VenueDirectoryEntry[]> {
  const [venues, universities] = await Promise.all([
    fetchVenues(),
    fetchUniversities().catch(() => []),
  ]);

  const taken = new Set(RESERVED_SLUGS);
  for (const u of universities) taken.add(u.slug);

  const byId = [...venues].sort((a, b) => a.id - b.id);
  const out: VenueDirectoryEntry[] = [];

  for (const v of byId) {
    const base = venueSlug(v.name);
    if (!base) continue; // a name of only punctuation has no URL

    let slug = base;
    if (taken.has(slug)) slug = `${base}-${venueSlug(v.campus)}`;
    if (taken.has(slug)) slug = `${base}-${v.id}`;
    taken.add(slug);

    out.push({
      id: v.id,
      slug,
      name: v.name,
      campus: v.campus,
      campusFullName: v.campusFullName,
      campusSlug: v.campusSlug,
      photo: v.photo,
      upcomingEvents: v.upcomingEvents,
      lineSkips: v.lineSkips,
    });
  }

  return out;
}

/**
 * Cached for the same reason fetchCampuses is: the directory is a fan-out over
 * every university, and the dispatcher, generateMetadata and the sitemap all
 * ask for it. Uncached, one page render is ~34 requests repeated three times.
 */
export const fetchVenueDirectory = unstable_cache(
  fetchVenueDirectoryUncached,
  ["venue-directory"],
  { revalidate: 1800 },
);

// Shape of GET /ui/venues/venue/:venueId (com.bizzyu.services
// src/routes/venues.ts). The venue object is camelCase; everything else is
// snake_case. Reading the wrong case silently undefines the field rather than
// erroring, which is how the venue share card once fell back to the Bizzy logo.
export interface VenueDetail {
  venue: {
    id: number;
    name: string;
    address: string;
    description: string | null;
    venuePhotoUrl: string | null;
    website: string | null;
    instagram: string | null;
  };
  business: {
    business_id: number;
    name: string;
    logo_image_url: string | null;
    instagram: string | null;
    website: string | null;
  };
  events: Array<{
    event_id: number;
    name: string;
    start_date_time: string;
    end_date_time: string;
    venue_name: string;
    flyer_image_url: string | null;
    min_ticket_price: number | string | null;
  }>;
  deals: Array<{
    id: number;
    deal_title: string;
    description: string | null;
    deal_image_path: string | null;
    deal_category: string;
    deal_type: string;
  }>;
  line_skips: Array<{
    id: number;
    date: string;
    start_time: string;
    end_time: string;
    price_cents: number;
    line_skip_name: string;
    line_skip_description: string | null;
  }>;
}

/**
 * One venue's full detail, or null.
 *
 * Plain fetch with a revalidate window rather than cache:"no-store" (which is
 * what /venue/:id uses, correctly — that page polls). This one is a static
 * marketing page, so it wants the data cache.
 *
 * The endpoint 404s an inactive venue and an unapproved business alike, so null
 * here already means "must not be publicly reachable".
 */
async function fetchVenueDetail(id: number): Promise<VenueDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/ui/venues/venue/${id}`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    return (await res.json()) as VenueDetail;
  } catch (err) {
    console.warn(`[venuePages] detail fetch failed for venue ${id}`, err);
    return null;
  }
}

export interface VenuePage extends VenueDetail {
  entry: VenueDirectoryEntry;
  /** Other bars at the same campus, for the sideways links. */
  siblings: VenueDirectoryEntry[];
  /** City for the title tag, e.g. "Fort Myers, FL". Empty when unparseable. */
  city: string;
  /** False when the page is too thin to deserve indexing. See below. */
  indexable: boolean;
}

/**
 * "19800 Village Center Dr Suite 235B, Fort Myers, FL 33913" -> "Fort Myers, FL".
 *
 * Taken from the venue's own address rather than the campus's, because a bar
 * two towns over from the school ranks for its own town. Returns "" rather than
 * a guess when the address does not end in a recognisable state, and the title
 * then simply omits the city.
 */
export function cityFromAddress(address: string | null | undefined): string {
  if (!address) return "";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^(usa|united states)$/i.test(p));
  if (parts.length < 2) return "";

  const last = parts[parts.length - 1];
  const state = last.match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
  if (!state) return "";

  const city = parts[parts.length - 2];
  if (!city || /\d/.test(city)) return "";
  return `${city}, ${state[1].toUpperCase()}`;
}

/**
 * The bar a page must clear before Google is invited to it.
 *
 * This is the rule that decides whether this whole thing works. Google's
 * helpful-content system demotes mass-generated near-duplicates, and a venue
 * page with a name and nothing else is exactly that — it is the "We got nothin'"
 * page that makes a competitor's venue tier worthless. So a thin venue still
 * RENDERS (the URL works, the app links work, a human sees a real page) but
 * ships noindex and stays out of the sitemap until it has something to say.
 *
 * Substance means: a real address, something describing the room (a written
 * description or a photo), and at least one live row a reader came for.
 */
function isIndexable(d: VenueDetail): boolean {
  const rows = d.events.length + d.deals.length + d.line_skips.length;
  const describesTheRoom = Boolean(d.venue.description?.trim() || d.venue.venuePhotoUrl);
  return Boolean(d.venue.address?.trim()) && describesTheRoom && rows >= 1;
}

/**
 * Everything one venue page needs, by slug, or null when there is no such bar.
 *
 * Null is a 404 in the dispatcher. It covers a made-up slug, a venue that went
 * inactive, and a business whose approval lapsed — all of which should stop
 * being reachable, and none of which should render an empty shell.
 */
export async function fetchVenuePage(slug: string): Promise<VenuePage | null> {
  const directory = await fetchVenueDirectory();
  const entry = directory.find((v) => v.slug === slug);
  if (!entry) return null;

  const detail = await fetchVenueDetail(entry.id);
  if (!detail?.venue) return null;

  return {
    ...detail,
    entry,
    siblings: directory.filter(
      (v) => v.campusSlug === entry.campusSlug && v.id !== entry.id,
    ),
    city: cityFromAddress(detail.venue.address),
    indexable: isIndexable(detail),
  };
}

/**
 * Slug for one venue id, for linking down from the campus pages.
 *
 * Returns null when the venue is not in the directory, so the caller renders
 * the card unlinked rather than a link into a 404.
 */
export async function venueSlugById(id: number): Promise<string | null> {
  const directory = await fetchVenueDirectory();
  return directory.find((v) => v.id === id)?.slug ?? null;
}

/** The venues fit to be listed in the sitemap: in the directory AND indexable. */
export async function indexableVenues(): Promise<VenueDirectoryEntry[]> {
  const directory = await fetchVenueDirectory();
  const checked = await Promise.all(
    directory.map(async (entry) => {
      const detail = await fetchVenueDetail(entry.id);
      return detail && isIndexable(detail) ? entry : null;
    }),
  );
  return checked.filter((e): e is VenueDirectoryEntry => e !== null);
}

export type { Venue };
