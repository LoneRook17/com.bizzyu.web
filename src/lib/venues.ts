import { fetchUniversities, type University } from "./universities";

interface RawVenue {
  venue_id: number;
  venue_name: string | null;
  venue_address: string | null;
  venue_photo_url: string | null;
  business_image_url: string | null;
  event_id: number | null;
  event_name: string | null;
  start_date_time: string | null;
  cover_price: string | number | null;
  flyer_image_url: string | null;
  upcoming_event_count: number | null;
  active_line_skip_count: number | null;
  is_pinned: number | null;
}

export interface Venue {
  id: number;
  name: string;
  /** The school this venue sits next to, e.g. "UF". */
  campus: string;
  /** e.g. "University of Florida". */
  campusFullName: string;
  /** e.g. "university-of-florida". */
  campusSlug: string;
  /** Photo of the room. 21 of 23 live venues have one; only 8 have a logo,
      which is why this page leans on photos. */
  photo: string | null;
  logo: string | null;
  upcomingEvents: number;
  lineSkips: number;
  /** The venue's next published event, already joined by the API. */
  nextEvent: {
    id: number;
    name: string;
    startsAt: string;
    coverPrice: number | null;
    flyer: string | null;
  } | null;
}

const API_BASE = "https://services.bizzy-deals.com";

/**
 * Every venue Bizzy has live, across every campus, with its next event.
 *
 * Reads GET /ui/venues/popular, which the V2 router mounts explicitly as
 * public ("// Public: popular venues (no auth)"). It takes one university_id
 * at a time, so this fans out across the university list and flattens.
 *
 * Returns [] rather than throwing: this feeds marketing sections, and a dead
 * API must degrade to "render nothing", never to a 500 on a public page.
 */
/** Venues for one campus. Naperville can't reach here: fetchUniversities drops it. */
export async function fetchVenuesForUniversity(u: University): Promise<Venue[]> {
  try {
    const res = await fetch(`${API_BASE}/ui/venues/popular?university_id=${u.id}`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const rows: unknown = await res.json();
    if (!Array.isArray(rows)) return [];

    return (rows as RawVenue[])
      .filter((v) => v?.venue_id && v?.venue_name)
      .map((v): Venue => ({
        id: v.venue_id,
        name: v.venue_name as string,
        campus: u.name,
        campusFullName: u.fullName,
        campusSlug: u.slug,
        photo: v.venue_photo_url || null,
        logo: v.business_image_url || null,
        upcomingEvents: Number(v.upcoming_event_count) || 0,
        lineSkips: Number(v.active_line_skip_count) || 0,
        nextEvent:
          v.event_id && v.event_name
            ? {
                id: v.event_id,
                name: v.event_name,
                startsAt: v.start_date_time || "",
                coverPrice: v.cover_price != null ? Number(v.cover_price) : null,
                flyer: v.flyer_image_url || null,
              }
            : null,
      }));
  } catch {
    return [];
  }
}

export async function fetchVenues(): Promise<Venue[]> {
  let universities: University[] = [];
  try {
    universities = await fetchUniversities();
  } catch {
    return [];
  }

  const results = await Promise.allSettled(universities.map(fetchVenuesForUniversity));

  const venues = results
    .filter((r): r is PromiseFulfilledResult<Venue[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Pinned first, then the rooms actually running something.
  return venues.sort((a, b) => b.upcomingEvents - a.upcomingEvents);
}

/** Every venue that has a photo. The carousel is photo-led, so this is what it renders. */
export function venuesWithPhotos(venues: Venue[]): Venue[] {
  return venues.filter((v) => v.photo);
}

/** Real upcoming events, newest first, deduped by event id. */
export function upcomingEvents(venues: Venue[]) {
  const seen = new Set<number>();
  return venues
    .filter((v) => v.nextEvent && !seen.has(v.nextEvent.id) && seen.add(v.nextEvent.id))
    .map((v) => ({ ...v.nextEvent!, venue: v.name, campus: v.campus, venuePhoto: v.photo }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
