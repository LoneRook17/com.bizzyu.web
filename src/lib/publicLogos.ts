export interface BizzyLogo {
  id: number;
  name: string;
  logo_url: string;
}

/**
 * Approved businesses' uploaded logos, from the Node services public endpoint.
 * Cached 5 min.
 *
 * Returns [] rather than throwing when the API is unreachable. Every caller
 * is decorative social proof, so a dead API must degrade to "render nothing",
 * never to a broken strip or a 500 on a marketing page.
 */
export async function fetchPublicLogos(limit = 30): Promise<BizzyLogo[]> {
  const apiBase = process.env.INTERNAL_API_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${apiBase}/business/auth/public-logos`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data: { logos: BizzyLogo[] } = await res.json();
    return (data.logos || []).slice(0, limit);
  } catch (err) {
    console.warn("[publicLogos] fetch failed", err);
    return [];
  }
}
