import { fetchJSONRetry } from "./fetchRetry";

const API_BASE = "https://services.bizzy-deals.com";

interface RawEvent {
  event_id: number;
  name: string | null;
  venue_name: string | null;
  flyer_image_url: string | null;
  start_date_time: string | null;
  university_id: number | null;
  university_name: string | null;
  status: string | null;
  type: string | null;
  is_21_plus: number | null;
  lowest_price: string | number | null;
}

export interface CampusEvent {
  id: number;
  name: string;
  /** As the venue typed it. Often "VENUE ANNOUNCED SOON" on tour dates. */
  venue: string | null;
  /** "2026-08-21 21:00:00". NOT ISO-8601, so never hand it straight to Date(). */
  startsAt: string;
  flyer: string | null;
  /** Cheapest ticket, or null for free/RSVP nights. */
  price: number | null;
  is21Plus: boolean;
  universityId: number;
}

/**
 * Every upcoming event Bizzy has, across every campus, in one call.
 *
 * Reads GET /ui/events, which V2 mounts WITHOUT authenticateJWT (unlike the
 * /events mount of the same router), so it is public by design.
 *
 * This replaces reading events off the venues endpoint, which could only ever
 * return each venue's ONE next event, and only for venues in the "popular"
 * list. Events with no venue were invisible entirely: the White Lies Party
 * tour runs at ~27 campuses with venue_name "VENUE ANNOUNCED SOON" and no
 * venue_id, so every one of those campus pages showed no events while holding
 * a real ticketed event with a flyer.
 *
 * The endpoint already filters to published and future, and applies the app's
 * own recurring-event visibility window, so respect what it returns rather than
 * re-deriving "upcoming" here. Status is still checked defensively.
 */
export async function fetchAllEvents(): Promise<CampusEvent[]> {
  const rows = await fetchJSONRetry<unknown>(`${API_BASE}/ui/events`, {
    next: { revalidate: 900 },
  });
  if (!Array.isArray(rows)) return [];

  return (rows as RawEvent[])
    .filter((e) => e?.event_id && e?.name && e.status === "published")
    .filter((e) => e.university_id != null && !isTestUniversityId(e.university_id))
    .map((e) => ({
      id: e.event_id,
      name: e.name as string,
      venue: e.venue_name || null,
      startsAt: e.start_date_time || "",
      flyer: e.flyer_image_url || null,
      price: e.lowest_price != null ? Number(e.lowest_price) : null,
      is21Plus: e.is_21_plus === 1,
      universityId: e.university_id as number,
    }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * The test university, filtered here as well as in universities.ts.
 *
 * Belt and braces on purpose: this endpoint returns events keyed by
 * university_id without going through the university list, so the exclusion
 * there does not cover it. Naperville currently has 2 published future events
 * that would otherwise be one bad join away from a real page.
 */
const TEST_UNIVERSITY_IDS = new Set([91]);
const isTestUniversityId = (id: number) => TEST_UNIVERSITY_IDS.has(id);

/** This campus's events, soonest first. */
export function eventsForUniversity(events: CampusEvent[], universityId: number): CampusEvent[] {
  return events.filter((e) => e.universityId === universityId);
}
