import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampusPageView from "@/components/campus/CampusPageView";
import ComingSoonCampus from "@/components/campus/ComingSoonCampus";
import VenueSeoPage from "@/components/venue/VenueSeoPage";
import { fetchCampus } from "@/lib/campus";
import { fetchUniversityBySlug } from "@/lib/universities";
import { fetchVenuePage } from "@/lib/venuePages";
import { comingSoonTitle, COMING_SOON_BLURB } from "@/lib/request-school";
import { og } from "@/lib/og";

/**
 * The one top-level dynamic segment, serving two kinds of page.
 *
 *   /university-of-florida   a campus, built from that campus's live rows
 *   /backroads-brewhouse     a venue, built from that bar's live rows
 *
 * Campus is tried first and wins any tie, so no existing campus URL can change
 * meaning: venue slugs that would collide with a campus slug (or with a static
 * route like /events) are suffixed at directory-build time and never reach here.
 *
 * Nothing else moved. /venue/:id is untouched and still the app's universal
 * link target; /event/:id still redirects to checkout exactly as it did.
 *
 * Deliberately NOT one page per university. A survey of all 35 live schools
 * found 22 with zero deals and zero venues, so the page list follows the data
 * (see lib/campus.ts). Everything on both page types is a real row from the app,
 * which is what makes 5 of these worth having and 35 of them a doorway farm.
 *
 * Revalidates every 30 min, so "this week's deals" is true without a deploy and
 * without generating a word of prose.
 */
export const revalidate = 1800;

// TRUE, not false. The V1 API is flaky, so generateStaticParams' output varies
// build to build: one bad pass and a real campus vanishes from the list. With
// dynamicParams=false that vanished slug becomes a hard 404 on a page that was
// live an hour ago.
//
// Letting it render on demand costs nothing, because both resolvers apply the
// same content gate at request time: a school with no data, a made-up slug, and
// the test university all still return null and 404 below, and a venue that
// went inactive or whose business lost approval 404s with it. The gate is the
// guard, not this flag.
export const dynamicParams = true;

export async function generateStaticParams() {
  // Deliberately prebuild NOTHING at build time — these pages render on demand
  // instead (dynamicParams=true above + the revalidate=1800 ISR window), so the
  // first request in each 30-min window does a cached SSR and the rest serve
  // from cache.
  //
  // Why not prebuild the publishable list here: prerendering N campus pages ran
  // fetchCampus() once PER page, and Vercel's prerender workers don't share the
  // unstable_cache across processes, so each worker re-fanned-out ~34 POSTs to
  // the prod home_deals API and tripped its rate limit. A single 429 (or an
  // empty university list) makes fetchCampus throw mid-prerender and takes the
  // whole export — and the deploy — down with it (observed 3/3, incl. after a
  // rate-limit cooldown, 2026-07-17). Rendering on demand removes the build-time
  // API dependency entirely: a transient outage now costs a single live request
  // (self-healing on the next one), never a cached 404 and never a failed build.
  // Adding venues here would multiply that fan-out, not replace it.
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const campus = await fetchCampus(slug);
  if (campus) {
    const businesses = new Set(campus.deals.map((d) => d.business)).size;
    // Counts come from the same rows the page renders, so the snippet can never
    // promise more than the page delivers.
    const parts = [
      businesses > 0 && `${businesses} local ${businesses === 1 ? "spot" : "spots"}`,
      campus.venues.length > 0 && `${campus.venues.length} ${campus.venues.length === 1 ? "bar" : "bars"}`,
      campus.events.length > 0 && `${campus.events.length} upcoming ${campus.events.length === 1 ? "night" : "nights"}`,
    ].filter(Boolean);

    // No "| Bizzy" suffix: the root layout's title.template already appends it,
    // and adding it here renders "... | Bizzy | Bizzy".
    const title = `Student Deals at ${campus.fullName}`;
    const description = `Live student discounts near ${campus.fullName}${
      parts.length ? `: ${parts.join(", ")}` : ""
    }. Claim them free in the Bizzy app.`;

    return {
      title,
      description,
      alternates: { canonical: `https://bizzyu.com/${campus.slug}` },
      // Through og(), not a bare openGraph object: Next replaces rather than
      // merges, so a hand-rolled block here silently ships a card with no image.
      // The suffix is explicit because title.template does not apply to og:title.
      ...og({ title: `${title} | Bizzy`, description }),
    };
  }

  const venue = await fetchVenuePage(slug);
  if (!venue) {
    const unpublished = await fetchUniversityBySlug(slug);
    if (unpublished) {
      const title = comingSoonTitle(unpublished.fullName);
      const description = COMING_SOON_BLURB;
      return {
        title,
        description,
        robots: { index: false, follow: true },
        ...og({ title: `${title} | Bizzy`, description }),
      };
    }
    return {};
  }

  // Written for the query, not for the brand. Nobody searches "Bizzy Kollege
  // Klub"; they search "kollege klub cover" and "kollege klub tickets tonight",
  // so the venue name leads and the modifiers follow it. No "| Bizzy" here
  // either: title.template appends it.
  const title = `${venue.venue.name} Tickets, Cover & Events${
    venue.city ? ` in ${venue.city}` : ""
  }`;

  // Built from counts of the rows the page renders, so the snippet is always
  // true on the day it is crawled.
  const bits = [
    venue.events.length > 0 &&
      `${venue.events.length} upcoming ${venue.events.length === 1 ? "night" : "nights"}`,
    venue.line_skips.length > 0 &&
      `${venue.line_skips.length} line ${venue.line_skips.length === 1 ? "skip" : "skips"}`,
    venue.deals.length > 0 &&
      `${venue.deals.length} student ${venue.deals.length === 1 ? "deal" : "deals"}`,
  ].filter(Boolean);
  const description = bits.length
    ? `${venue.venue.name}: ${bits.join(", ")} on Bizzy. Buy before you get there and walk in.`
    : `${venue.venue.name} on Bizzy. Tickets, cover and line skips near ${venue.entry.campusFullName}.`;

  return {
    title,
    description,
    // The permanent, readable URL is the canonical one. It never redirects to an
    // id, which is the whole point of this route existing.
    alternates: { canonical: `https://bizzyu.com/${venue.entry.slug}` },
    // A page too thin to be worth a result still RENDERS (the URL works, the
    // links work, a human sees a real page) but is not offered to Google until
    // it has something to say. follow stays true so the links out of it, to the
    // campus hub and to the other bars, still carry.
    ...(venue.indexable ? {} : { robots: { index: false, follow: true } }),
    ...og({
      title: `${title} | Bizzy`,
      description,
      ...(venue.venue.venuePhotoUrl
        ? { image: venue.venue.venuePhotoUrl, imageAlt: venue.venue.name }
        : {}),
    }),
  };
}

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const campus = await fetchCampus(slug);
  if (campus) return <CampusPageView campus={campus} />;

  const venue = await fetchVenuePage(slug);
  if (venue) return <VenueSeoPage page={venue} />;

  const unpublished = await fetchUniversityBySlug(slug);
  if (unpublished) return <ComingSoonCampus university={unpublished} />;

  notFound();
}
