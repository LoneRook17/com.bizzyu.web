import type { Metadata } from "next";

/**
 * The share card. Real students, in a real bar, holding the app.
 *
 * Replaces a 1MB logo-on-green with "Live College For Less!" baked in, which was
 * a fourth tagline competing with the hero, and was 1920x1080 with black bars in
 * the file while the metadata declared 1200x630. This is the actual spec ratio,
 * from a real photo, at a sixth of the weight.
 *
 * It works for every audience the site has, which is why it is the default: a
 * student sees what using it looks like, and a bar owner sees customers in a bar
 * using it. The three phones carry the logo, so the card brands itself without
 * an overlay.
 */
const DEFAULT_IMAGE = "/images/og-students.jpg";
const DEFAULT_ALT =
  "Four students at a bar near campus holding up phones showing a claimed Bizzy deal.";

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
