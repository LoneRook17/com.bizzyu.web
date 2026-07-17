import type { Metadata } from "next";

/**
 * The share card: the Bizzy logo on brand green.
 *
 * Source is Cooper's own logo export, cropped 16:9 -> 1.91:1 (36px off the top
 * and bottom; the logo is centred, so nothing is touched). Full bleed already,
 * so no padding is invented.
 *
 * It replaces og-default.png, which was broken in a way that only showed up
 * when measured: 1920x1080 with black letterbox bars baked into the image while
 * the metadata declared 1200x630, so platforms were told one aspect ratio and
 * handed another, and the bars shipped as part of the picture. That file also
 * carried a "Live College For Less!" tagline, a fourth line competing with the
 * hero. This is the plain mark. 52KB against 1MB.
 */
const LOGO_CARD = {
  url: "/images/og-logo.jpg",
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
