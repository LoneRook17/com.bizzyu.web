import type { MetadataRoute } from "next";
import { fetchCampuses } from "@/lib/campus";
import { indexableVenues } from "@/lib/venuePages";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://bizzyu.com";

  // Only campuses that cleared the content bar. Listing a school with nothing
  // on it is the difference between a sitemap and a doorway farm, and it is
  // also how the test university would have reached Google.
  let campuses: MetadataRoute.Sitemap = [];
  try {
    campuses = (await fetchCampuses()).map((c) => ({
      url: `${baseUrl}/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // A dead API must not take the sitemap down with it.
  }

  // Same rule, one level down: a venue is listed only once it has an address,
  // something describing the room, and at least one live night, deal or line
  // skip. A bar that goes quiet drops out on the next revalidate and comes back
  // when it has something on, with no deploy either way. The thin ones still
  // have working pages; they are just not offered to Google yet.
  //
  // Daily, not weekly: a venue page turns over faster than a campus page,
  // because its whole body is this week's events.
  let venues: MetadataRoute.Sitemap = [];
  try {
    venues = (await indexableVenues()).map((v) => ({
      url: `${baseUrl}/${v.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // Same rule as above: a dead API costs the venue entries, not the sitemap.
  }

  return [
    ...campuses,
    ...venues,
    {
      url: baseUrl,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/businesses`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/post-a-deal`,
      lastModified: new Date("2026-06-02"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date("2026-04-19"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
