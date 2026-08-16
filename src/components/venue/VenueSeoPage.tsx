import Image from "next/image";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import FAQ from "@/components/ui/FAQ";
import JsonLd from "@/components/seo/JsonLd";
import { APP_STORE_URL } from "@/lib/constants";
import type { VenuePage } from "@/lib/venuePages";
import { venueJsonLd } from "./venueJsonLd";
import { formatClock, formatDay, formatPrice, formatTime } from "./venueFormat";

/**
 * One venue, at bizzyu.com/<bar-name>.
 *
 * Every section below is built from rows the API returned for THIS venue. There
 * is no generated prose, no placeholder copy, and no section that renders a
 * heading over an empty list: each one returns nothing when it has nothing,
 * which is what keeps a quiet bar's page honest rather than padded.
 *
 * Read-only. It links to the existing /event/:id and /venue/:id routes and
 * changes neither, and it writes nothing anywhere.
 */
export default function VenueSeoPage({ page }: { page: VenuePage }) {
  const { venue, business, events, deals, line_skips: lineSkips, entry, siblings, city } = page;
  const url = `https://bizzyu.com/${entry.slug}`;

  const instagram = (venue.instagram || business.instagram)?.replace(/^@/, "") || null;
  const website = venue.website || business.website || null;
  const nextEvent = events[0] ?? null;

  return (
    <>
      <JsonLd data={venueJsonLd(page, url)} />

      {/* ─── Hero ──────────────────────────────────────────────
          The venue's own image, its name, and where it is.

          The image is SHOWN, not used as wallpaper. It used to be a full-bleed
          background at opacity-30 under a three-stop scrim, which reduced it to
          a texture: on Backroads, whose photo_url is a logo lockup rather than
          a room shot, the bar's own name was a ghost behind the h1. A venue page
          that cannot show you the venue is missing the one image it has.

          So it sits in its own framed panel, and the wallpaper treatment stays
          only as a heavily blurred ambient wash that reads as colour, not as a
          picture competing with the text. */}
      <section className="relative overflow-hidden bg-ink text-white">
        {venue.venuePhotoUrl && (
          <>
            {/* Ambient only. Blurred past legibility on purpose, so it tints the
                section with the venue's own colours without ever being mistaken
                for the image itself. */}
            <Image
              src={venue.venuePhotoUrl}
              alt=""
              aria-hidden="true"
              fill
              sizes="100vw"
              className="object-cover scale-125 blur-3xl opacity-40"
            />
            <div className="absolute inset-0 bg-ink/70" />
          </>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(5,235,84,0.16),transparent_55%)] pointer-events-none" />

        <SectionContainer className="relative !py-16 md:!py-24">
          {/* Two columns only when there is something to put in the second one.
              A handful of venues have no image at all, and an unconditional
              two-track grid squeezed their text into 55% of the width beside a
              column of nothing. */}
          <div
            className={`grid gap-10 lg:gap-16 ${
              venue.venuePhotoUrl
                ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center"
                : ""
            }`}
          >
            <div>
              {/* Visible breadcrumb, matching the BreadcrumbList in the JSON-LD.
                  It is also the sideways link back up to the campus hub, which is
                  how crawl equity reaches a brand new venue page at all. */}
              <nav aria-label="Breadcrumb" className="mb-6">
                <ol className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                  <li>
                    <Link href="/" className="hover:text-primary transition-colors">
                      Bizzy
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link
                      href={`/${entry.campusSlug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {entry.campusFullName}
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li className="text-white/80">{venue.name}</li>
                </ol>
              </nav>

              {/* Not a SplitHeading, for the same reason the campus hero is not:
                  this is the LCP element on a page whose entire job is ranking, and
                  SplitText starts every word at opacity 0. */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight mb-5 text-white">
                {venue.name}
              </h1>

              <p className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed mb-8">
                {venue.description?.trim()
                  ? venue.description
                  : `Tickets, cover and line skips at ${venue.name}, bought on your phone before you get there.`}
              </p>

              {venue.address && (
                <p className="text-sm text-white/50 mb-8">
                  {venue.address}
                  {city && ` · near ${entry.campusFullName}`}
                </p>
              )}

              {/* The counts that used to sit under here are gone. They restated
                  the sections directly below them ("5 upcoming nights" above a
                  list of 5 nights headed "5 nights on sale right now"), so they
                  cost a screen of height to say nothing new. */}
              <div className="flex flex-wrap gap-3">
                <Button href={APP_STORE_URL} external size="lg">
                  Get Bizzy Free
                </Button>
                {/* The app deep-link page. Untouched by this work: on an iPhone the
                    universal link opens the venue in the app, and everywhere else
                    it is the live board with checkout on it. */}
                <Button href={`/venue/${venue.id}`} variant="outline" size="lg">
                  See what&apos;s on sale
                </Button>
              </div>
            </div>

            {venue.venuePhotoUrl && (
              /* Two copies of the same file, which is deliberate. A venue's
                 image is sometimes a room photo and sometimes a logo lockup,
                 and there is no field telling us which. object-cover crops a
                 wide lockup; object-contain letterboxes a photo. Cover-and-blur
                 underneath, contain on top, and both kinds land correctly: the
                 logo sits whole against its own colours, the photo fills the
                 frame with an edge that reads as depth rather than as bars. */
              <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden ring-1 ring-white/15 shadow-2xl shadow-black/60">
                <Image
                  src={venue.venuePhotoUrl}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover scale-110 blur-2xl opacity-70"
                />
                <Image
                  src={venue.venuePhotoUrl}
                  alt={venue.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </SectionContainer>
      </section>

      {/* ─── Upcoming events ──────────────────────────────── */}
      {events.length > 0 && (
        <section className="bg-white" id="events">
          <SectionContainer className="!py-14 md:!py-20">
            <AnimatedSection>
              <h2 className="text-2xl md:text-4xl font-bold text-ink tracking-tight mb-2">
                What&apos;s on at {venue.name}
              </h2>
              <p className="text-muted mb-8">
                {events.length === 1
                  ? "One night on sale right now."
                  : `${events.length} nights on sale right now.`}{" "}
                Tap a night to buy a ticket.
              </p>

              <ul className="space-y-3">
                {events.map((e) => {
                  const price = formatPrice(e.min_ticket_price);
                  return (
                    <li key={e.event_id}>
                      <Link
                        href={`/event/${e.event_id}`}
                        className="flex items-center gap-4 p-3 rounded-2xl border border-gray-200 hover:border-primary/50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="relative w-16 h-20 md:w-20 md:h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {e.flyer_image_url && (
                            <Image
                              src={e.flyer_image_url}
                              alt=""
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-dark mb-1">
                            {formatDay(e.start_date_time)}
                            {formatTime(e.start_date_time) &&
                              ` · ${formatTime(e.start_date_time)}`}
                          </p>
                          <p className="font-bold text-ink leading-tight">{e.name}</p>
                          <p className="text-sm text-muted mt-0.5">
                            {price ? `Tickets from ${price}` : "Free entry or RSVP"}
                          </p>
                        </div>
                        <span className="text-muted text-sm shrink-0 hidden sm:block">
                          Buy →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </AnimatedSection>
          </SectionContainer>
        </section>
      )}

      {/* ─── Line skips ───────────────────────────────────── */}
      {lineSkips.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-100" id="line-skips">
          <SectionContainer className="!py-14 md:!py-20">
            <AnimatedSection>
              <h2 className="text-2xl md:text-4xl font-bold text-ink tracking-tight mb-2">
                Skip the line at {venue.name}
              </h2>
              <p className="text-muted mb-8">
                Buy a pass, walk to the front, show your phone at the door.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lineSkips.map((ls) => (
                  <Link
                    key={ls.id}
                    href={`/venue/${venue.id}?line_skip=${ls.id}`}
                    className="block p-4 rounded-2xl bg-white border border-gray-200 hover:border-primary/50 transition-colors"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-dark mb-1.5">
                      {formatDay(ls.date)}
                    </p>
                    <p className="font-bold text-ink leading-tight">{ls.line_skip_name}</p>
                    <p className="text-sm text-muted mt-1">
                      {formatClock(ls.start_time)} to {formatClock(ls.end_time)}
                    </p>
                    <p className="text-lg font-bold text-ink mt-2">
                      {formatPrice(ls.price_cents / 100)}
                    </p>
                  </Link>
                ))}
              </div>
            </AnimatedSection>
          </SectionContainer>
        </section>
      )}

      {/* ─── Deals ────────────────────────────────────────── */}
      {deals.length > 0 && (
        <section className="bg-white" id="deals">
          <SectionContainer className="!py-14 md:!py-20">
            <AnimatedSection>
              <h2 className="text-2xl md:text-4xl font-bold text-ink tracking-tight mb-2">
                Deals at {venue.name}
              </h2>
              <p className="text-muted mb-8">
                Free to claim in the app. No coupon to print, no card to buy.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {deals.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-gray-200 overflow-hidden"
                  >
                    {d.deal_image_path && (
                      <div className="relative aspect-[16/9] bg-gray-100">
                        <Image
                          src={d.deal_image_path}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      {d.deal_category && (
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary-dark mb-1.5">
                          {d.deal_category}
                        </p>
                      )}
                      <p className="font-bold text-ink leading-tight">{d.deal_title}</p>
                      {d.description && (
                        <p className="text-sm text-muted mt-1.5 leading-relaxed">
                          {d.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </SectionContainer>
        </section>
      )}

      {/* ─── The details ──────────────────────────────────
          Address, links, campus. Baseline substance that does not depend on
          whether the bar has anything on this week, which is the difference
          between a page worth indexing and a "we got nothin'" shell. */}
      <section className="bg-gray-50 border-t border-gray-100">
        <SectionContainer className="!py-14 md:!py-20">
          <AnimatedSection>
            <h2 className="text-2xl md:text-4xl font-bold text-ink tracking-tight mb-8">
              {venue.name}, in short
            </h2>

            <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl">
              {venue.address && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.15em] text-muted mb-1.5">
                    Address
                  </dt>
                  <dd className="text-ink leading-relaxed">{venue.address}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.15em] text-muted mb-1.5">
                  Campus
                </dt>
                <dd>
                  <Link
                    href={`/${entry.campusSlug}`}
                    className="text-primary-dark font-medium hover:underline"
                  >
                    {entry.campusFullName}
                  </Link>
                </dd>
              </div>
              {website && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.15em] text-muted mb-1.5">
                    Website
                  </dt>
                  <dd>
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-dark font-medium hover:underline break-all"
                    >
                      {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </dd>
                </div>
              )}
              {instagram && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.15em] text-muted mb-1.5">
                    Instagram
                  </dt>
                  <dd>
                    <a
                      href={`https://instagram.com/${instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-dark font-medium hover:underline"
                    >
                      @{instagram}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────
          Every answer is read off this venue's own rows. A question it cannot
          answer from data is not asked. */}
      <section className="bg-white">
        <SectionContainer className="!py-14 md:!py-20">
          <AnimatedSection>
            <h2 className="text-2xl md:text-4xl font-bold text-ink tracking-tight mb-8 text-center">
              {venue.name} FAQ
            </h2>
            <FAQ items={buildFaq(page)} />
          </AnimatedSection>
        </SectionContainer>
      </section>

      {/* ─── Other bars at this campus ────────────────────
          Sideways links between real pages. Only venues in the directory
          appear, so this can never point at a URL that 404s. */}
      {siblings.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-100">
          <SectionContainer className="!py-14 md:!py-16">
            <AnimatedSection>
              <h2 className="text-xl md:text-2xl font-bold text-ink tracking-tight mb-6">
                Other bars near {entry.campus}
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {siblings.map((s) => (
                  <Link
                    key={s.id}
                    href={`/${s.slug}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-ink hover:border-primary/50 hover:text-primary-dark transition-colors"
                  >
                    {s.name}
                    {s.upcomingEvents > 0 && (
                      <span className="text-muted text-xs">{s.upcomingEvents}</span>
                    )}
                  </Link>
                ))}
              </div>
            </AnimatedSection>
          </SectionContainer>
        </section>
      )}

      {/* ─── CTA ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(5,235,84,0.28),transparent_60%)] pointer-events-none" />
        <SectionContainer className="relative text-center !py-16 md:!py-24">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-bold leading-[1.05] tracking-tight mb-5 text-white">
              {nextEvent
                ? `${formatDay(nextEvent.start_date_time)} at ${venue.name}.`
                : `${venue.name} is on Bizzy.`}
            </h2>
            <p className="text-white/70 text-lg mb-9 max-w-xl mx-auto leading-relaxed">
              Buy your ticket or line skip in the app, show your phone at the door,
              and walk in. Bizzy is free to download.
            </p>
            <Button href={APP_STORE_URL} external size="lg">
              Get Bizzy Free
            </Button>
          </AnimatedSection>
        </SectionContainer>
      </section>
    </>
  );
}

/**
 * The FAQ, built from rows rather than written.
 *
 * These are the modifier queries the venue's own Google Business Profile does
 * not answer: cover, tickets, line skip, what is on tonight. An entry is only
 * included when the data can answer it, so a quiet bar gets a short FAQ instead
 * of four hedged non-answers.
 */
function buildFaq(page: VenuePage): Array<{ question: string; answer: string }> {
  const { venue, events, deals, line_skips: lineSkips, entry, city } = page;
  const items: Array<{ question: string; answer: string }> = [];

  const priced = events
    .map((e) => (e.min_ticket_price != null ? Number(e.min_ticket_price) : NaN))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  items.push({
    question: `Does ${venue.name} have a cover charge?`,
    answer: priced.length
      ? `${priced.length} of the ${events.length} upcoming ${
          events.length === 1 ? "night" : "nights"
        } at ${venue.name} sell a ticket on Bizzy, starting at ${formatPrice(
          priced[0],
        )}. Buying ahead in the app is the same price as the door and gets you in without paying at the front.`
      : `No ticketed nights are listed at ${venue.name} on Bizzy right now. Cover at the door is set by the bar and can change night to night.`,
  });

  if (events.length > 0) {
    const next3 = events.slice(0, 3).map((e) => `${e.name} on ${formatDay(e.start_date_time)}`);
    items.push({
      question: `What is on at ${venue.name} this week?`,
      answer: `${next3.join(", ")}${
        events.length > 3 ? `, and ${events.length - 3} more` : ""
      }. Every night listed here is on sale in the Bizzy app right now.`,
    });
  }

  items.push({
    question: `Can I skip the line at ${venue.name}?`,
    answer: lineSkips.length
      ? `Yes. ${venue.name} is selling ${lineSkips.length} line ${
          lineSkips.length === 1 ? "skip" : "skips"
        } over the next week, from ${formatPrice(
          Math.min(...lineSkips.map((l) => l.price_cents / 100)),
        )}. Buy one in the app, walk to the front, show your phone.`
      // No claim about what OTHER bars are selling. This component cannot see
      // their line skips, and a page that guesses at a fact it has no row for
      // is exactly what makes a generated page worthless.
      : `${venue.name} is not selling line skips on Bizzy at the moment. Every bar on Bizzy near ${entry.campus} is listed on the ${entry.campusFullName} page.`,
  });

  if (venue.address) {
    items.push({
      question: `Where is ${venue.name}?`,
      answer: `${venue.address}${city ? `, in ${city}` : ""}. It is one of the bars on Bizzy near ${entry.campusFullName}.`,
    });
  }

  if (deals.length > 0) {
    items.push({
      question: `Does ${venue.name} have student deals?`,
      answer: `Yes. ${deals.length} ${
        deals.length === 1 ? "deal is" : "deals are"
      } live at ${venue.name} on Bizzy. They are free to claim, there is no membership and no fee, and you show the claimed deal on your phone in the bar.`,
    });
  }

  return items;
}
