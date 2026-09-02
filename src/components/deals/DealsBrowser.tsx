"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { track } from "@/lib/analytics";
import type { NationalDeal } from "@/lib/brands/nationalDeals";

/**
 * The browse surface for /deals. Filtering is instant and animated: cards
 * slide into their new grid positions rather than popping, and the ones that
 * leave fade as they shrink. Everything moves on transform and opacity only,
 * 220ms, one easing curve, and nothing moves at all under reduced motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

interface Props {
  deals: NationalDeal[];
  categories: string[];
  /** id from ?missing=, when /go could not find a destination */
  missingId?: string;
}

export default function DealsBrowser({ deals, categories, missingId }: Props) {
  const [category, setCategory] = useState<string>("All");
  const [queryRaw, setQuery] = useState("");
  const query = useDeferredValue(queryRaw);
  const reduced = useReducedMotion();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((d) => {
      if (category !== "All" && d.category !== category) return false;
      if (!q) return true;
      return `${d.brand} ${d.title} ${d.description} ${d.category}`.toLowerCase().includes(q);
    });
  }, [deals, category, query]);

  const missing = missingId ? deals.find((d) => String(d.id) === missingId) : undefined;

  return (
    <LayoutGroup>
      {missingId && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          {missing
            ? `The ${missing.brand} link is not available right now. Try again in a little while.`
            : "That deal is no longer listed. Here is everything that is live."}
        </div>
      )}

      {/* Filter bar: sticky under the site nav, scrolls sideways on phones. */}
      <div className="sticky top-16 z-30 -mx-6 px-6 py-3 bg-white/85 backdrop-blur-xl border-b border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={queryRaw}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands"
              aria-label="Search deals"
              className="w-full h-10 pl-10 pr-4 rounded-full border border-gray-200 bg-white text-[15px] text-ink placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-[box-shadow,border-color]"
            />
          </div>
          <div className="hidden sm:block text-sm text-muted tabular-nums whitespace-nowrap">
            {visible.length} {visible.length === 1 ? "offer" : "offers"}
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Categories">
          {["All", ...categories].map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(c)}
                className={`relative flex-shrink-0 h-9 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  active ? "text-white" : "text-ink/70 hover:text-ink hover:bg-gray-100"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={reduced ? undefined : "chip"}
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ duration: 0.28, ease: EASE }}
                    aria-hidden
                  />
                )}
                <span className="relative">{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      <motion.ul layout={!reduced} className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((d) => (
            <motion.li
              key={d.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
              transition={{ duration: 0.24, ease: EASE }}
              className="min-w-0"
            >
              <DealCard deal={d} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {visible.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-lg font-semibold text-ink">Nothing matches that.</p>
          <p className="text-muted mt-1">Try another brand name, or clear the category.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
            className="mt-5 inline-flex items-center px-5 py-2.5 rounded-full border-2 border-primary/40 text-primary-dark font-semibold hover:border-primary hover:bg-primary/5 transition-colors"
          >
            Show everything
          </button>
        </div>
      )}
    </LayoutGroup>
  );
}

function DealCard({ deal }: { deal: NationalDeal }) {
  return (
    <a
      href={`/go/${deal.id}`}
      target="_blank"
      rel="noopener nofollow sponsored"
      onClick={() => track("national_deal_web_click", { deal_id: deal.id, brand: deal.brand, category: deal.category })}
      className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_12px_32px_-12px_rgba(3,3,3,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white ring-1 ring-gray-200 flex-shrink-0">
          <Image src={deal.imageUrl} alt="" width={48} height={48} className="w-full h-full object-cover" unoptimized />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink leading-snug line-clamp-2">{deal.brand}</p>
          <p className="text-xs text-muted mt-0.5 truncate">{deal.category}</p>
        </div>
        {/* Only a label short enough to read whole. A clipped "Student bun..."
            says less than nothing; the title below already carries the offer. */}
        {deal.offerLabel && deal.offerLabel.length <= 12 && (
          <span className="flex-shrink-0 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-bold text-primary-dark whitespace-nowrap">
            {deal.offerLabel}
          </span>
        )}
      </div>

      <p className="mt-4 text-[15px] font-semibold text-ink leading-snug">{deal.title}</p>
      {deal.description && deal.description !== deal.title && (
        <p className="mt-1.5 text-sm text-muted leading-relaxed line-clamp-2">{deal.description}</p>
      )}

      <div className="mt-auto pt-5 flex items-center justify-between text-sm">
        {deal.verified ? (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <svg className="w-3.5 h-3.5 text-primary-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Verified on their site
          </span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 font-semibold text-ink">
          Get deal
          <svg className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </a>
  );
}
