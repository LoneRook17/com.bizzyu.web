import { unstable_cache } from "next/cache";

/**
 * The live National Deals feed, the same one the app's National Deals tab
 * renders. GET /national_deals on Laravel core is anonymous (auth is optional
 * on the feed only), so this is a read of public data.
 *
 * Used on /brands purely as proof: "these brands are already on Bizzy". Every
 * caller must degrade to nothing when the feed is down; a marketing page never
 * 500s over social proof.
 */

const API_URL = "https://bizzy-deals.com/api/national_deals";

export interface NationalDeal {
  id: number;
  brand: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  offerLabel: string;
  verified: boolean;
  /** "YYYY-MM-DD" of the last verification sweep, or "" */
  lastVerifiedAt: string;
}

interface RawNationalDeal {
  id: number;
  brand: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  image_url: string | null;
  offer_label: string | null;
  verified_on_official_site: boolean | number | string | null;
  last_verified_at: string | null;
}

/* Household names first, so the shelf and the strip read instantly. Anything
   not listed here follows in feed order. Matched on a prefix so "Amazon Prime
   Student" and "Amazon Music Unlimited Student" both rank under "Amazon". */
const PREFERRED = [
  "DoorDash",
  "Spotify",
  "Amazon Prime",
  "ChatGPT",
  "Nike",
  "Hulu",
  "Apple",
  "YouTube",
  "Adidas",
  "HBO Max",
  "Uber",
  "Walmart",
  "Microsoft",
  "Adobe",
  "Peacock",
  "Notion",
  "Samsung",
  "Grubhub",
  "Canva",
  "GitHub",
  "Paramount",
  "Under Armour",
  "Urban Outfitters",
  "American Eagle",
  "The North Face",
  "Headspace",
  "Figma",
  "T-Mobile",
];

/* Internal test rows: anything not served from the national-deals bucket, or
   named like a fixture. The feed has carried "COOPER SPOTIFY" with a stand-in
   logo; that must never reach a brand partnerships manager's screen. */
function isTestRow(d: RawNationalDeal): boolean {
  const brand = (d.brand ?? "").trim();
  const img = d.image_url ?? "";
  return (
    !brand ||
    !img ||
    !/\/national-deals\/\d+\//.test(img) ||
    /cooper|test|zorby|placeholder|offer label/i.test(`${brand} ${d.offer_label ?? ""}`)
  );
}

function truthy(v: RawNationalDeal["verified_on_official_site"]): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return false;
}

function rank(brand: string): number {
  const i = PREFERRED.findIndex((p) => brand.toLowerCase().startsWith(p.toLowerCase()));
  return i === -1 ? PREFERRED.length : i;
}

async function fetchRaw(): Promise<NationalDeal[]> {
  const res = await fetch(API_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`national_deals ${res.status}`);
  const json = (await res.json()) as { data?: { deals?: RawNationalDeal[] } };
  const deals = json.data?.deals ?? [];

  const out: NationalDeal[] = [];
  for (const d of deals) {
    if (isTestRow(d)) continue;
    out.push({
      id: d.id,
      brand: (d.brand ?? "").trim(),
      title: (d.title ?? "").trim(),
      description: (d.description ?? "").trim(),
      category: (d.category ?? "").trim(),
      imageUrl: d.image_url ?? "",
      offerLabel: (d.offer_label ?? "").trim(),
      verified: truthy(d.verified_on_official_site),
      lastVerifiedAt: (d.last_verified_at ?? "").slice(0, 10),
    });
  }
  // Stable: household names first, then the feed's own order.
  return out
    .map((d, i) => ({ d, i }))
    .sort((a, b) => rank(a.d.brand) - rank(b.d.brand) || a.i - b.i)
    .map((x) => x.d);
}

const cached = unstable_cache(fetchRaw, ["national-deals-feed"], { revalidate: 1800 });

/** Every live deal, sorted, test rows removed. [] when the feed is unreachable. */
export async function fetchAllNationalDeals(): Promise<NationalDeal[]> {
  try {
    return await cached();
  } catch (err) {
    console.warn("[brands] national_deals fetch failed", err);
    return [];
  }
}

/**
 * One row per logo, for brand proof (the /brands hero shelf and strip).
 * Amazon Prime and Amazon Music share a mark, and a strip is a set of brands,
 * not a catalogue of plans.
 */
export async function fetchNationalDeals(): Promise<NationalDeal[]> {
  const all = await fetchAllNationalDeals();
  const seen = new Set<string>();
  return all.filter((d) => {
    const key = d.imageUrl.split("/").pop() ?? "";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Distinct categories in feed order of first appearance. */
export function categoriesOf(deals: NationalDeal[]): string[] {
  const out: string[] = [];
  for (const d of deals) if (d.category && !out.includes(d.category)) out.push(d.category);
  return out.sort((a, b) => a.localeCompare(b));
}
