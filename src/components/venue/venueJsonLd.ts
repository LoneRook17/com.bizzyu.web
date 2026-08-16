import type { VenuePage } from "@/lib/venuePages";
import { postalAddress, toSchemaDate } from "./venueFormat";

/**
 * Structured data for one venue page: BreadcrumbList + BarOrPub + one Event per
 * upcoming night, each with its own Offer.
 *
 * This is the part that produces the date-and-price rich result in Google, and
 * it is the part nightlife ticketing sites almost universally skip. Every field
 * below is a row from the API. Nothing here describes anything the page does
 * not also render, because structured data that outruns the page is the exact
 * thing manual actions are for.
 */
export function venueJsonLd(page: VenuePage, url: string) {
  const { venue, business, events, line_skips: lineSkips, entry } = page;
  const venueId = `${url}#venue`;
  const address = postalAddress(venue.address);
  const sameAs = [
    venue.website || business.website,
    venue.instagram || business.instagram
      ? `https://instagram.com/${(venue.instagram || business.instagram)!.replace(/^@/, "")}`
      : null,
  ].filter((s): s is string => Boolean(s));

  const barOrPub: Record<string, unknown> = {
    "@type": "BarOrPub",
    "@id": venueId,
    name: venue.name,
    url,
    ...(venue.description ? { description: venue.description } : {}),
    ...(venue.venuePhotoUrl ? { image: venue.venuePhotoUrl } : {}),
    ...(address ? { address } : venue.address ? { address: venue.address } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    // Line skips are a real, priced product at this bar, so they belong on the
    // venue rather than on any one event: they are sold per night, not per show.
    ...(lineSkips.length
      ? {
          makesOffer: lineSkips.map((ls) => ({
            "@type": "Offer",
            name: ls.line_skip_name,
            price: (ls.price_cents / 100).toFixed(2),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            validFrom: ls.date,
            url,
          })),
        }
      : {}),
  };

  const eventNodes = events.map((e) => {
    const price = e.min_ticket_price != null ? Number(e.min_ticket_price) : null;
    return {
      "@type": "Event",
      name: e.name,
      startDate: toSchemaDate(e.start_date_time),
      ...(toSchemaDate(e.end_date_time) ? { endDate: toSchemaDate(e.end_date_time) } : {}),
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      ...(e.flyer_image_url ? { image: e.flyer_image_url } : {}),
      location: { "@id": venueId },
      organizer: { "@type": "Organization", name: business.name || venue.name },
      url: `https://bizzyu.com/event/${e.event_id}`,
      // Offers only where a ticket is actually priced. min_ticket_price is null
      // for a free or RSVP night, and a fabricated "$0" offer would be a
      // structured-data claim the page cannot back up.
      ...(price != null && Number.isFinite(price)
        ? {
            offers: {
              "@type": "Offer",
              price: price.toFixed(2),
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: `https://bizzyu.com/event/${e.event_id}`,
            },
          }
        : {}),
    };
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Bizzy", item: "https://bizzyu.com" },
          {
            "@type": "ListItem",
            position: 2,
            name: entry.campusFullName,
            item: `https://bizzyu.com/${entry.campusSlug}`,
          },
          { "@type": "ListItem", position: 3, name: venue.name, item: url },
        ],
      },
      barOrPub,
      ...eventNodes,
    ],
  };
}
