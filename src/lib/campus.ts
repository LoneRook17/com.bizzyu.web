import { fetchUniversities, type University } from "./universities";
import { fetchDealsForSchool, type Deal } from "./deals";
import { fetchVenuesForUniversity, upcomingEvents, type Venue } from "./venues";

export interface Campus extends University {
  deals: Deal[];
  venues: Venue[];
  events: ReturnType<typeof upcomingEvents>;
}

/**
 * How much a school needs before it gets a page.
 *
 * A survey of all 35 live universities found 22 with zero deals and zero
 * venues, and several more with exactly one of either. A page built from one
 * venue is a page with nothing on it, and 30 of those pointing at 30
 * school-name queries is what Google calls a doorway.
 *
 * So the page list follows the data instead of the campus list. At the time of
 * writing this clears 5 schools (UF, FGCU, MSU, LSU, UGA). A school appears on
 * its own the day it gets enough, and disappears if its deals lapse, with no
 * deploy either way.
 */
const MIN_ITEMS = 3;

const itemCount = (c: Campus) => c.deals.length + c.venues.length;

/** True once a school has enough real content to be worth a page. */
export const isPublishable = (c: Campus) => itemCount(c) >= MIN_ITEMS;

async function hydrate(u: University): Promise<Campus> {
  // Deals key off the handle, venues off the numeric id. Both already degrade
  // to [] internally, so one dead endpoint costs a section, not the page.
  const [deals, venues] = await Promise.all([
    fetchDealsForSchool(u.name),
    fetchVenuesForUniversity(u),
  ]);
  return { ...u, deals, venues, events: upcomingEvents(venues) };
}

/**
 * Every campus with enough live content to publish, richest first.
 *
 * Naperville is already gone: fetchUniversities drops the test school before
 * this ever sees it.
 */
export async function fetchCampuses(): Promise<Campus[]> {
  const universities = await fetchUniversities();
  if (universities.length === 0) return [];

  const settled = await Promise.allSettled(universities.map(hydrate));
  return settled
    .filter((r): r is PromiseFulfilledResult<Campus> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter(isPublishable)
    .sort((a, b) => itemCount(b) - itemCount(a));
}

/**
 * One campus by slug, or null.
 *
 * Null covers three cases that all mean the same thing to a visitor: no such
 * school, the test school, or a real school that hasn't earned a page yet.
 */
export async function fetchCampus(slug: string): Promise<Campus | null> {
  const universities = await fetchUniversities();
  const match = universities.find((u) => u.slug === slug);
  if (!match) return null;

  const campus = await hydrate(match);
  return isPublishable(campus) ? campus : null;
}
