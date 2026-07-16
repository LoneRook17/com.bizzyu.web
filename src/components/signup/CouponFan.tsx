import Image from "next/image";
import type { Deal } from "@/lib/deals";

/**
 * A few real coupons from the book, pinned at angles, with one empty slot
 * waiting for the visitor's deal.
 *
 * The whole pitch of this page is "get featured in the book", so the book is
 * shown rather than described, using deals that are actually live (lib/deals).
 * The dashed slot is the ask, rendered in the same language as the thing it
 * would become.
 *
 * Renders nothing if the deals API is unreachable: a coupon book with no
 * coupons argues against us.
 */
export default function CouponFan({ deals }: { deals: Deal[] }) {
  const shown = deals.slice(0, 3);
  if (shown.length === 0) return null;

  // Hand-pinned, not machine-placed. Each card gets its own tilt and offset.
  const tilt = ["-rotate-3", "rotate-2", "-rotate-1"];
  const nudge = ["translate-x-0", "translate-x-6", "translate-x-2"];

  return (
    <div className="relative flex flex-col items-center gap-3 select-none">
      {shown.map((deal, i) => (
        <div
          key={deal.id}
          // Cards stack vertically, so on a phone all four cost ~790px: a full
          // screen of decoration between a business owner and the form. One
          // real coupon plus the empty slot makes the same point. The rest
          // return at sm.
          className={`${i > 0 ? "hidden sm:block" : ""} ${tilt[i % 3]} ${nudge[i % 3]} w-[200px] sm:w-[220px] rounded-2xl bg-white border border-gray-200 shadow-xl shadow-black/5 overflow-hidden transition-transform duration-300 hover:rotate-0 hover:scale-[1.03]`}
        >
          <div className="relative aspect-[16/10] bg-gray-100">
            <Image
              src={deal.image}
              alt=""
              fill
              sizes="220px"
              className="object-cover"
            />
            {deal.savings > 0 && (
              <span className="absolute top-2 right-2 bg-primary text-ink text-[10px] font-bold rounded-full px-2 py-0.5 shadow">
                Save ${deal.savings}
              </span>
            )}
          </div>
          <div className="px-3 py-2.5">
            <p className="text-[13px] font-bold text-ink leading-snug line-clamp-2">{deal.title}</p>
            <p className="text-[11px] text-muted mt-0.5 truncate">{deal.business}</p>
          </div>
        </div>
      ))}

      {/* The ask, in the same shape as the answer. */}
      <div className="rotate-2 -translate-x-4 w-[200px] sm:w-[220px] rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 px-4 py-4 sm:py-6 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary flex items-center justify-center mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#030303" strokeWidth="3" strokeLinecap="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <p className="text-sm font-bold text-ink">Your deal here</p>
        <p className="text-[11px] text-muted mt-0.5">Free to list</p>
      </div>
    </div>
  );
}
