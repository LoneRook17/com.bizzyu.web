import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import type { Campus } from "./campus";

const MODEL = "claude-opus-4-8";

/**
 * The ISO week, as a cache key ("2026-W29").
 *
 * The summary is keyed on this so it regenerates once a week and not once per
 * render. Keying on the data itself would look tempting, but the deals payload
 * is not stable: the API's picked_Deals bucket is `inRandomOrder()->limit(12)`,
 * so the same school returns a different set on every call and a content hash
 * would change constantly, regenerating on nearly every request.
 */
function weekKey(now: Date): string {
  // ISO-8601 week: Thursday of the current week decides the year.
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Seven days out, "YYYY-MM-DD". */
function weekEnd(now: Date): string {
  const d = new Date(now.getTime() + 7 * 86400000);
  return d.toISOString().slice(0, 10);
}

const SYSTEM = `You write one short paragraph for a university's page on Bizzy, a campus app where students claim local deals and buy event tickets.

You are writing for students at that school. Not for businesses, not for investors.

RULES, in order of importance:

1. Use ONLY the data in the user message. Every business, deal, price, and event
   you mention must appear there. You are describing real offers that real
   businesses have to honour at the counter, so an invented or misremembered one
   costs someone money and trust. If the data is thin, write less.
2. Never use an em dash or an en dash. Use a comma, a full stop, or a colon.
3. 2 to 4 sentences. One paragraph. No headings, no lists, no emoji.
4. Sound like a person who goes there, not like marketing. No "nestled", no
   "vibrant", no "look no further", no "dive in", no exclamation marks.
5. Lead with the single most interesting concrete thing, usually a specific deal
   or a named event this week. Not a summary of the page.
6. Do not invent a claim frequency ("every Tuesday"), a time, or an address
   unless it is in the data.
7. Do not repeat the school name more than once. The reader knows where they are.
8. Do not tell the reader to download the app. The page already does that.`;

/**
 * What the model gets. Note what is NOT here: `category`.
 *
 * The API's deal_category is unreliable, and demonstrably so on live rows: at
 * UGA a free game of bowling is categorised "Food" and a breakfast bagel is
 * "Night Out". Handing that to the model invites a confidently wrong sentence
 * about a real business. The offer text is accurate, so let it speak.
 */
interface SummaryPayload {
  school: string;
  dealCount: number;
  businessCount: number;
  venueCount: number;
  deals: { business: string; offer: string; savesDollars: number }[];
  events: { name: string; venue: string | null; when: string; priceFrom: number | null }[];
}

function buildPayload(campus: Campus, until: string): SummaryPayload {
  // Only offer deals that outlive the week this prose is live for. A deal named
  // on Monday that lapses Wednesday leaves the page promising something the
  // counter will refuse.
  const durable = campus.deals.filter((d) => !d.expiresOn || d.expiresOn >= until);

  return {
    school: campus.name,
    dealCount: campus.deals.length,
    businessCount: new Set(campus.deals.map((d) => d.business)).size,
    venueCount: campus.venues.length,
    // Best savings first: gives the model the strongest concrete hook up top.
    deals: [...durable]
      .sort((a, b) => (Number(b.savings) || 0) - (Number(a.savings) || 0))
      .slice(0, 12)
      .map((d) => ({
        business: d.business,
        offer: d.title,
        savesDollars: Number(d.savings) || 0,
      })),
    events: campus.events.slice(0, 6).map((e) => ({
      name: e.name,
      venue: e.venue,
      when: e.startsAt,
      priceFrom: e.price,
    })),
  };
}

async function callClaude(payload: SummaryPayload): Promise<string | null> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    // Deliberately short output; the ceiling only needs to cover a paragraph
    // plus whatever adaptive thinking decides to spend.
    max_tokens: 4000,
    system: SYSTEM,
    thinking: { type: "adaptive" },
    output_config: {
      // Structured output rather than a "no preamble" instruction: assistant
      // prefill is gone on this model family, and this is the supported way to
      // guarantee the response is the paragraph and nothing else.
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: { paragraph: { type: "string" } },
          required: ["paragraph"],
          additionalProperties: false,
        },
      },
      effort: "low",
    },
    messages: [{ role: "user", content: JSON.stringify(payload, null, 2) }],
  });

  if (response.stop_reason === "refusal") {
    console.warn("[weekly] model declined", response.stop_details);
    return null;
  }

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;

  try {
    const parsed = JSON.parse(text.text) as { paragraph?: unknown };
    const paragraph = typeof parsed.paragraph === "string" ? parsed.paragraph.trim() : "";
    if (!paragraph) return null;
    // Belt and braces on the one rule with a mechanical check. A dash that slips
    // through is a house-style break, not a reason to drop the paragraph.
    return paragraph.replace(/\s*[—–]\s*/g, ", ");
  } catch {
    return null;
  }
}

/**
 * This week's paragraph for a campus, written by Claude from that campus's real
 * deals and events.
 *
 * Cached per school per ISO week, so the model runs about 9 times a week rather
 * than once per render, and the page's own 30-minute ISR keeps the deal cards
 * underneath fresh in between.
 *
 * Returns null on any failure, including a missing API key, which is the local
 * case: the section then renders nothing and the page is unaffected.
 */
export async function fetchWeeklySummary(campus: Campus): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (campus.deals.length === 0 && campus.events.length === 0) return null;

  const now = new Date();
  const key = weekKey(now);
  const payload = buildPayload(campus, weekEnd(now));

  const cached = unstable_cache(
    async () => {
      try {
        return await callClaude(payload);
      } catch (err) {
        console.warn(`[weekly] generation failed for ${campus.slug}`, err);
        return null;
      }
    },
    // The week is IN the key, which is what makes this weekly. Without it the
    // entry would live for revalidate seconds and regenerate forever after.
    ["campus-weekly", campus.slug, key],
    { revalidate: 60 * 60 * 24 * 8, tags: ["campus-weekly"] },
  );

  return cached();
}
