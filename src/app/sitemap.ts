import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://bizzyu.com";

  return [
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
      url: `${baseUrl}/signup`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/events-contact`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
