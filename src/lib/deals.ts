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
}

export interface Deal {
  id: number;
  title: string;
  business: string;
  school: string;
  savings: number;
  image: string;
  category: string;
  tag: string;
  /** Bizzy's own cadence label — "Weekly Wins", "Daily", "Monthly Specials".
      Real data; do NOT read it as the enforced claim frequency (the API's
      `uses` field is empty on every deal, so that isn't exposed here). */
  type: string;
}

/**
 * Live deals from the V1 Laravel API, top 10 per school.
 *
 * Read-only, public, and already how the production homepage works — this is
 * the same call `/api/trending-deals` has always made, lifted out so server
 * components can use it without fetching our own route.
 */
export async function fetchTrendingDeals(): Promise<Deal[]> {
  const results = await Promise.allSettled(
    SCHOOLS.map(async (school) => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ university: school }),
        next: { revalidate: 300 },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.top10_Deals ?? []) as RawDeal[];
    }),
  );

  const allDeals = results
    .filter((r): r is PromiseFulfilledResult<RawDeal[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((d) => d.is_active === 1);

  // Shuffle so schools are mixed rather than clumped by request order.
  for (let i = allDeals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allDeals[i], allDeals[j]] = [allDeals[j], allDeals[i]];
  }

  return allDeals.map((d) => ({
    id: d.id,
    title: d.description || d.deal_title,
    business: d.display_name || d.business_name,
    school: d.university_name,
    savings: d.total_saving,
    image: d.deal_image_path,
    category: d.deal_category,
    tag: d.tag_name,
    type: d.deal_type,
  }));
}
