import { unstable_cache } from "next/cache";
import { mapLimit } from "./mapLimit";
import { fetchUniversities, type University } from "./universities";
import { fetchDealsForSchool, type Deal } from "./deals";
import { fetchVenuesForUniversity, type Venue } from "./venues";
import { fetchAllEvents, eventsForUniversity, type CampusEvent } from "./events";

export interface Campus extends University {
  deals: Deal[];
  venues: Venue[];
  events: CampusEvent[];
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

/**
 * Deals key off the handle, venues off the numeric id.
 *
 * Both throw on failure and this does NOT catch, on purpose. The publish gate
 * below counts items, so a swallowed error returning [] would read as "this
 * school has nothing" and silently unpublish a live page. The V1 API is
 * genuinely flaky (a sequential sweep of 34 schools produced 8 failures), so
 * this is a routine event, not a hypothetical.
 *
 * Rejecting means "unknown", which callers handle deliberately. It never means
 * "empty".
 */
async function hydrate(u: University, allEvents: CampusEvent[]): Promise<Campus> {
  const [deals, venues] = await Promise.all([
    fetchDealsForSchool(u.name),
    fetchVenuesForUniversity(u),
  ]);
  // Events are passed in, not fetched per school: /ui/events returns every
  // campus at once, so fetching it inside here would make the same call 34
  // times. They key off university_id rather than coming through venues, which
  // is what makes venue-less events (the White Lies tour) visible at all.
  return { ...u, deals, venues, events: eventsForUniversity(allEvents, u.id) };
}

/**
 * Every campus with enough live content to publish, richest first.
 *
 * Naperville is already gone: fetchUniversities drops the test school before
 * this ever sees it.
 */
async function fetchCampusesUncached(): Promise<Campus[]> {
  const universities = await fetchUniversities();
  if (universities.length === 0) return [];

  // One call for every campus's events. Failure costs the events sections, not
  // the pages: a school qualifies on deals and venues, so an empty list here
  // cannot unpublish anything.
  let allEvents: CampusEvent[] = [];
  try {
    allEvents = await fetchAllEvents();
  } catch (err) {
    console.warn("[campus] events fetch failed; pages render without them", err);
  }

  // Capped, not all-at-once. 34 simultaneous POSTs at the V1 Laravel box is
  // what earned a 429 and killed a deploy.
  const settled = await mapLimit(universities, 6, (u) => hydrate(u, allEvents));

  // A rejected school is unknown, not empty, so it drops out of THIS list and
  // says so. It keeps its page: [slug]/page.tsx sets dynamicParams=true, so a
  // slug missed by a flaky build still renders on demand rather than 404ing.
  const failed = settled.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.warn(
      `[campus] ${failed.length}/${universities.length} schools failed to hydrate; omitted from the list this pass`,
      (failed[0] as PromiseRejectedResult).reason,
    );
  }

  return settled
    .filter((r): r is PromiseFulfilledResult<Campus> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter(isPublishable)
    .sort((a, b) => itemCount(b) - itemCount(a));
}

/**
 * Cached, and this is the important one.
 *
 * [slug]/page.tsx calls this a third time per page just to list sibling
 * campuses, on top of generateStaticParams and the sitemap. Uncached, a build
 * with 9 campus pages ran the 34-school fan-out ~11 times: ~620 requests at
 * bizzy-deals.com in seconds, up to ~1,860 once fetchJSONRetry retried the
 * 429s it caused. The API rate-limited us and the prerender died, taking the
 * whole deploy with it.
 *
 * Cached, the fan-out runs once per revalidate window no matter how many pages
 * ask.
 */
export const fetchCampuses = unstable_cache(
  fetchCampusesUncached,
  ["campuses"],
  { revalidate: 1800 },
);

/**
 * One campus by slug, or null.
 *
 * Null covers three cases that all mean the same thing to a visitor: no such
 * school, the test school, or a real school that hasn't earned a page yet.
 */
export async function fetchCampus(slug: string): Promise<Campus | null> {
  const universities = await fetchUniversities();

  // fetchUniversities swallows its own errors and returns []. Without this
  // guard an outage on the university-list endpoint would make every slug
  // "not found" and 404 every campus page at once. Empty means broken here,
  // never "no such school": Bizzy always has universities.
  if (universities.length === 0) {
    throw new Error("[campus] university list empty or unavailable; refusing to 404");
  }

  const match = universities.find((u) => u.slug === slug);
  if (!match) return null;

  let allEvents: CampusEvent[] = [];
  try {
    allEvents = await fetchAllEvents();
  } catch (err) {
    console.warn("[campus] events fetch failed; page renders without them", err);
  }

  const campus = await hydrate(match, allEvents);
  return isPublishable(campus) ? campus : null;
}
