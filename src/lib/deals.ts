import { fetchRetry } from "./fetchRetry";

const SCHOOLS = ["FGCU", "UGA", "ASU", "USF", "Southern"];
const API_URL = "https://bizzy-deals.com/api/home_deals";

interface RawDeal {
  id: number;
  deal_title: string;
  description: string;
  deal_category: string;
  deal_type: string;
  tag_name: string;
  university_name: string;
  business_name: string;
  display_name: string;
  total_saving: number;
  deal_image_path: string;
  is_active: number;
  /** "YYYY-MM-DD". Must be checked here; see DEAL_BUCKETS. */
  expired_date: string | null;
}

/**
 * Every list `home_deals` returns. The endpoint is the app's home SCREEN, not a
 * deals index, so it answers with one bucket per shelf rather than one catalog.
 *
 * Reading only top10_Deals (as this did) reads the wrong thing entirely:
 * top10_Deals is a leaderboard, built by joining claim_deals and counting
 * claims in the last 7 days, limit 10. It measures student activity, not
 * inventory. Prod bore that out exactly: UGA had 6 claims last week across 4
 * deals and showed 4, while holding 45 live ones. ASU and OSU had 0 claims and
 * showed nothing at all, while holding 47 and 42.
 *
 * Unioned and deduped, these recover 86-100% of what the database says is live
 * per school. The shortfall is real: things/bogo/drink/food are tag matches, and
 * picked_Deals is a random 12, so a deal with no matching tag can be missed.
 * Closing that needs an API that can list a school's deals, which does not
 * exist yet.
 */
const DEAL_BUCKETS = [
  "limited_time",
  "new_deals",
  "picked_Deals",
  "top10_Deals",
  "things_Deals",
  "bogo_deals",
  "drink_deals",
  "food_deals",
] as const;

export interface Deal {
  id: number;
  title: string;
  business: string;
  school: string;
  savings: number;
  image: string;
  category: string;
  tag: string;
  /** Bizzy's own cadence label: "Weekly Wins", "Daily", "Monthly Specials".
      Real data; do NOT read it as the enforced claim frequency (the API's
      `uses` field is empty on every deal, so that isn't exposed here). */
  type: string;
}

const toDeal = (d: RawDeal): Deal => ({
  id: d.id,
  title: d.description || d.deal_title,
  business: d.display_name || d.business_name,
  school: d.university_name,
  savings: d.total_saving,
  image: d.deal_image_path,
  category: d.deal_category,
  tag: d.tag_name,
  type: d.deal_type,
});

/**
 * Live deals for one school, by its handle ("FGCU", "UGA").
 *
 * Unions every bucket in DEAL_BUCKETS and dedupes by id, because no single
 * bucket is the school's catalog. See DEAL_BUCKETS for why reading top10_Deals
 * alone under-reported UGA as 4 deals when it has 45.
 *
 * Expiry is filtered HERE because the API does not do it consistently: the four
 * tag buckets (things/bogo/drink/food) filter is_active but never compare
 * expired_date, unlike the other four. Nothing expired is leaking today (prod
 * currently has zero rows that are active AND expired), but that is luck, not a
 * guarantee, and a stale offer on a marketing page is a promise a real business
 * has to honour or refuse at the counter.
 *
 * THROWS on failure rather than returning []. This API is intermittently flaky,
 * and campus.ts decides whether a school gets a page based on how much it has:
 * if a blip returned [] here, that gate would read it as "this school has
 * nothing" and silently unpublish a real page. An empty array from this
 * function now means the school genuinely has no deals.
 */
export async function fetchDealsForSchool(school: string): Promise<Deal[]> {
  const res = await fetchRetry(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ university: school }),
    next: { revalidate: 300 },
  });
  const json = await res.json();
  const data = json.data ?? {};

  // Date-only string compare: expired_date is "YYYY-MM-DD", which sorts
  // lexicographically, so this avoids parsing it into a Date and inheriting a
  // timezone the API never specified.
  const today = new Date().toISOString().slice(0, 10);

  const byId = new Map<number, Deal>();
  for (const bucket of DEAL_BUCKETS) {
    const rows = data[bucket];
    if (!Array.isArray(rows)) continue;
    for (const d of rows as RawDeal[]) {
      if (!d?.id || d.is_active !== 1) continue;
      if (d.expired_date && d.expired_date < today) continue;
      if (!byId.has(d.id)) byId.set(d.id, toDeal(d));
    }
  }
  return [...byId.values()];
}

/**
 * Live deals across SCHOOLS, mixed together.
 *
 * NOT ranked by popularity, despite the name and the /api/trending-deals route
 * that wraps it. It used to read top10_Deals, which really is a claims
 * leaderboard, so "trending" was once true; it now unions every bucket, so this
 * is a sample of what is live. The name is kept because the route is a public
 * URL, but do not build ranking on it.
 */
export async function fetchTrendingDeals(): Promise<Deal[]> {
  // allSettled, and fetchDealsForSchool now throws: a school that blips just
  // drops out of the mix here. This strip is decorative, so a partial list is
  // fine, unlike the campus gate which must not misread a blip as "no deals".
  const results = await Promise.allSettled(SCHOOLS.map(fetchDealsForSchool));

  const allDeals = results
    .filter((r): r is PromiseFulfilledResult<Deal[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Shuffle so schools are mixed rather than clumped by request order.
  for (let i = allDeals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allDeals[i], allDeals[j]] = [allDeals[j], allDeals[i]];
  }

  return allDeals;
}
