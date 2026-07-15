"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Deal } from "@/lib/deals";

/**
 * Interactive "digital coupon book": the business-facing demo of the student
 * experience. An owner reading /discounts flips through the book their deal
 * would live in, then taps through a redemption: tap → verifying → verified.
 *
 * The deals are REAL and live, fetched from the same public endpoint the
 * student app reads (see lib/deals.ts). Earlier this component ran on invented
 * placeholder businesses; it doesn't need to, so it shouldn't.
 *
 * Styled dark to mirror the real iOS card (/images/bizzy-card-deal.png), whose
 * layout this follows: photo, Save badge, offer, business.
 *
 * One deliberate deviation from the app: it letters the green button in white
 * (1.61:1, a WCAG failure). Here the button is inked (12.78:1).
 */

type Status = "idle" | "verifying" | "redeemed";

/** Notches read as bites out of the card, so they're painted the colour of
    whatever sits BEHIND it, hence the caller-supplied class. */
function TicketPerforation({ notchClassName }: { notchClassName: string }) {
  return (
    <div className="relative h-0" aria-hidden>
      <div className={`absolute -left-3 -top-3 w-6 h-6 rounded-full ${notchClassName}`} />
      <div className={`absolute -right-3 -top-3 w-6 h-6 rounded-full ${notchClassName}`} />
      <div className="border-t-2 border-dashed border-white/15 mx-3" />
    </div>
  );
}

function initials(name: string) {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default function CouponBook({
  deals,
  notchClassName = "bg-white",
}: {
  deals: Deal[];
  notchClassName?: string;
}) {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [stamp, setStamp] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const go = useCallback(
    (next: number) => {
      clearTimers();
      setStatus("idle");
      setIndex((next + deals.length) % deals.length);
    },
    [clearTimers, deals.length],
  );

  const redeem = useCallback(() => {
    if (status !== "idle") return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStatus("verifying");
    timers.current.push(
      setTimeout(
        () => {
          // Client-only, set on tap, never during render, so no hydration mismatch.
          setStamp(new Date().toLocaleTimeString("en-US", { hour12: true }));
          setStatus("redeemed");
        },
        reduced ? 0 : 850,
      ),
    );
  }, [status]);

  // Live data: the API can return nothing, and a broken frame is worse than none.
  if (deals.length === 0) return null;

  const deal = deals[index];

  return (
    <div className="w-full max-w-sm mx-auto">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted mb-4">
        Real deals, live on Bizzy now
      </p>

      <div className="relative rounded-[2rem] bg-ink border border-white/10 shadow-2xl shadow-black/25 overflow-hidden">
        <div className="p-5">
          {/* photo + Save badge, mirroring the app's card */}
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/5">
            <Image
              src={deal.image}
              alt=""
              fill
              sizes="(max-width: 640px) 280px, 320px"
              className="object-cover"
            />
            {deal.savings > 0 && (
              <span className="absolute top-3 right-3 bg-primary text-ink text-xs font-bold rounded-full px-3 py-1.5 shadow-lg">
                Save ${deal.savings}
              </span>
            )}
          </div>

          <h3 className="mt-4 text-lg font-bold text-white leading-snug line-clamp-2">{deal.title}</h3>

          <div className="mt-3 flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full bg-primary text-ink flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              aria-hidden
            >
              {initials(deal.business)}
            </div>
            <p className="text-sm text-white/60 truncate">{deal.business}</p>
            <span className="ml-auto flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {deal.school}
            </span>
          </div>

          {/* Bizzy's own cadence label, straight from the API. */}
          {deal.type && (
            <p className="mt-3 inline-block rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/45">
              {deal.type}
            </p>
          )}
        </div>

        <TicketPerforation notchClassName={notchClassName} />

        <div className="p-5 pt-7">
          {status === "redeemed" ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-bold text-primary">Verified Active Deal</p>
              </div>
              <p className="text-xs text-white/40 mt-1">{stamp}</p>
              <p className="text-sm text-white/70 leading-relaxed mt-3">
                Now it locks on this student&apos;s phone for the window you set, then Bizzy pings
                them when it unlocks.
              </p>
              <button
                type="button"
                onClick={() => go(index)}
                className="mt-2 px-3 py-2 text-xs font-semibold text-primary underline underline-offset-2 hover:no-underline rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Run it again
              </button>
            </div>
          ) : (
            <>
              <p className="text-center text-xs text-white/40 mb-3">Show this screen to staff first</p>
              <button
                type="button"
                onClick={redeem}
                disabled={status === "verifying"}
                className="w-full rounded-full bg-primary text-ink font-bold uppercase tracking-wide py-4 px-4 hover:brightness-105 active:scale-[0.99] transition disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {status === "verifying" ? "Verifying…" : "Staff member tap here"}
              </button>
              <p className="text-center text-[11px] text-white/30 mt-3 leading-relaxed">
                Limit one per check. Cannot be combined with other offers.
              </p>
            </>
          )}

          <p className="sr-only" role="status" aria-live="polite">
            {status === "redeemed"
              ? `${deal.title} at ${deal.business} redeemed and verified.`
              : status === "verifying"
                ? "Verifying"
                : ""}
          </p>
        </div>
      </div>

      {/* flip through the book */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous deal"
          className="w-9 h-9 rounded-full border border-gray-200 bg-white text-ink flex items-center justify-center hover:border-gray-400 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex">
          {/* p-2 pads each dot to a 24x24 hit area (WCAG 2.5.8); the dot stays small. */}
          {deals.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show deal ${i + 1} of ${deals.length}: ${d.business}`}
              aria-current={i === index}
              className="p-2 group rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            >
              <span
                className={`block h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-primary-dark" : "w-2 bg-gray-300 group-hover:bg-gray-400"
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next deal"
          className="w-9 h-9 rounded-full border border-gray-200 bg-white text-ink flex items-center justify-center hover:border-gray-400 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
