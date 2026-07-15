const API_URL = "https://bizzy-deals.com/api/university-list";

interface RawUniversity {
  id: number;
  name: string;
  full_name: string | null;
}

export interface University {
  id: number;
  /** Short handle, e.g. "MSU". */
  name: string;
  /** Proper name, e.g. "Michigan State University". Falls back to the handle. */
  fullName: string;
}

/**
 * Live campus list from the V1 Laravel API. Read-only and public.
 *
 * Fetched rather than hardcoded so the strip can never claim a campus we do
 * not actually serve, and so new schools appear without a deploy.
 *
 * Names only, never marks: university logos are licensed trademarks (most of
 * these schools enforce through Learfield/CLC), and a logo on a commercial
 * page reads as sponsorship. Naming a campus we genuinely operate on is a
 * statement of fact; borrowing its crest is not ours to make.
 *
 * Returns [] on failure so callers render nothing rather than a broken strip.
 */
export async function fetchUniversities(): Promise<University[]> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows: RawUniversity[] = json.data ?? [];
    return rows
      .filter((u) => u?.name)
      .map((u) => ({
        id: u.id,
        name: u.name,
        fullName: u.full_name?.trim() || u.name,
      }));
  } catch (err) {
    console.warn("[universities] fetch failed", err);
    return [];
  }
}
