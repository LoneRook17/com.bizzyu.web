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
  /** URL segment, e.g. "florida-gulf-coast". */
  slug: string;
}

/**
 * Naperville is the internal test university. Its venue and its "Yellow" event
 * are fixtures, and they were already reaching the live events page and the
 * app's campus picker.
 *
 * Filtered here, in the one call every caller goes through, rather than at each
 * call site: a per-page filter is one someone forgets to add. Matched on id AND
 * handle AND full name so a rename or a reseed with a new id still can't leak
 * it.
 */
const TEST_UNIVERSITY_IDS = new Set([91]);
const TEST_UNIVERSITY_NAME = /^(nap|naperville)$/i;

function isTestUniversity(u: RawUniversity): boolean {
  return (
    TEST_UNIVERSITY_IDS.has(u.id) ||
    TEST_UNIVERSITY_NAME.test((u.name ?? "").trim()) ||
    TEST_UNIVERSITY_NAME.test((u.full_name ?? "").trim())
  );
}

/**
 * "Florida Gulf Coast University" -> "florida-gulf-coast".
 *
 * Only a leading "The" and a trailing "University" come off. "University of X"
 * keeps its prefix, because "/university-of-florida" is what a student
 * searches and "/florida" is a state.
 */
export function campusSlug(fullName: string): string {
  return fullName
    .trim()
    .replace(/^the\s+/i, "")
    .replace(/\s+university$/i, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
      .filter((u) => u?.name && !isTestUniversity(u))
      .map((u) => {
        const fullName = u.full_name?.trim() || u.name;
        return { id: u.id, name: u.name, fullName, slug: campusSlug(fullName) };
      });
  } catch (err) {
    console.warn("[universities] fetch failed", err);
    return [];
  }
}
