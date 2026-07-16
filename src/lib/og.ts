import type { Metadata } from "next";

/**
 * The share card: the Bizzy logo lockup on brand green.
 *
 * Rebuilt rather than restored. The original og-default.png was 1920x1080 with
 * black letterbox bars baked into the file, while the metadata declared
 * 1200x630 — so platforms were told one aspect ratio and handed another, and
 * the bars shipped as part of the picture. This is the same artwork at the
 * real 1.91:1 spec: bars cropped off, the card scaled to full height, and the
 * 71px remainder filled with the green sampled from the art itself, so it runs
 * edge to edge. 292KB against the original 1MB.
 *
 * PNG, not JPEG: flat colour behind hard-edged type is exactly where JPEG rings.
 */
const LOGO_CARD = {
  url: "/images/og-logo.png",
  alt: "Bizzy",
} as const;

const DEFAULT_IMAGE = LOGO_CARD.url;
const DEFAULT_ALT = LOGO_CARD.alt;

interface OgInput {
  /** Card headline. Exactly as written; no suffix is added. */
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
}

/**
 * A complete openGraph + twitter block for a page.
 *
 * Exists because Next merges metadata SHALLOWLY. A page that sets
 * `openGraph: { title, description }` REPLACES the root layout's openGraph
 * object outright rather than merging into it, silently dropping images,
 * siteName, type and locale.
 *
 * That is not a hypothetical. /events, /post-a-deal, /about, /businesses and
 * every campus page shipped with NO og:image, because each one declared its own
 * openGraph block and inherited nothing. The link sent to a bar owner had no
 * picture on it at all. The homepage kept its image only because it declared no
 * openGraph and fell all the way back to the root, which is also why its card
 * still carried the pre-rewrite title.
 *
 * Build every card through here and the defaults cannot go missing again.
 */
export function og({
  title,
  description,
  image = DEFAULT_IMAGE,
  imageAlt = DEFAULT_ALT,
}: OgInput): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Bizzy",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
