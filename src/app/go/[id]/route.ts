import { NextResponse } from "next/server";

/**
 * bizzyu.com/go/:id — outbound link for a National Deal on the website.
 *
 * Asks Laravel core's anonymous redirect (GET /api/national_deals/:id/go) for
 * the destination and forwards the browser there. The public feed never
 * carries a deal's URL, so this is the one place the website learns it, and
 * it learns it as a Location header rather than data it could render.
 *
 * Anything other than a redirect (missing deal, no link yet, core down) lands
 * the visitor back on /deals with a flag, never on an error page.
 */

const CORE_API = "https://bizzy-deals.com/api";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const fallback = new URL(`/deals?missing=${encodeURIComponent(id)}`, "https://bizzyu.com");

  if (!/^\d{1,10}$/.test(id)) return NextResponse.redirect(fallback, 302);

  try {
    const res = await fetch(`${CORE_API}/national_deals/${id}/go`, {
      redirect: "manual",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const location = res.headers.get("location");
    if ((res.status === 302 || res.status === 301 || res.status === 307) && location && /^https?:\/\//i.test(location)) {
      const out = NextResponse.redirect(location, 302);
      out.headers.set("Cache-Control", "no-store, max-age=0");
      out.headers.set("X-Robots-Tag", "noindex, nofollow");
      return out;
    }
    console.warn("[go] no redirect from core", id, res.status);
  } catch (err) {
    console.warn("[go] core unreachable", id, err);
  }
  return NextResponse.redirect(fallback, 302);
}
