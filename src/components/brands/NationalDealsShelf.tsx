import Image from "next/image";
import type { NationalDeal } from "@/lib/brands/nationalDeals";

/**
 * The National Deals tab the way a student sees it, with real rows from the
 * live feed and one open slot for the brand reading this page. Renders the
 * generic version when the feed is empty, so the hero never loses its
 * right-hand column to an API blip.
 */
export default function NationalDealsShelf({ deals }: { deals: NationalDeal[] }) {
  const rows = deals.slice(0, 4);

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 bg-gradient-to-tr from-primary/25 via-primary/5 to-transparent rounded-[2.5rem] blur-2xl pointer-events-none" />
      <div className="relative rounded-[2rem] bg-ink text-white p-4 sm:p-5 shadow-2xl shadow-black/30 ring-1 ring-white/10">
        <div className="flex items-center justify-between mb-3.5 px-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">National Deals</p>
          <p className="text-[11px] text-white/40">Every campus</p>
        </div>

        <ul className="space-y-2">
          {rows.length > 0
            ? rows.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-white/[0.06] border border-white/10"
                >
                  <div className="w-11 h-11 rounded-xl bg-white overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                    <Image
                      src={d.imageUrl}
                      alt={d.brand}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white leading-snug truncate">{d.brand}</p>
                    <p className="text-xs text-white/55 leading-snug mt-0.5 truncate">{d.title}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 bg-white/10 text-white/70 whitespace-nowrap flex-shrink-0">
                    {d.offerLabel.length <= 12 ? d.offerLabel : "Student"}
                  </span>
                </li>
              ))
            : GENERIC.map((r) => (
                <li
                  key={r.name}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-white/[0.06] border border-white/10"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex-shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white leading-snug">{r.name}</p>
                    <p className="text-xs text-white/55 leading-snug mt-0.5">{r.perk}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 bg-white/10 text-white/70">
                    Student
                  </span>
                </li>
              ))}

          {/* The open slot. Brand green, ink text: the one row that is not
              a real deal yet is also the only one that glows. */}
          <li className="flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-primary text-ink shadow-lg shadow-primary/30">
            <div
              className="w-11 h-11 rounded-xl border-2 border-dashed border-ink/30 flex items-center justify-center flex-shrink-0"
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug">Your brand</p>
              <p className="text-xs text-ink/70 leading-snug mt-0.5">Your student offer, here</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 bg-ink text-primary whitespace-nowrap">
              Open slot
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

const GENERIC = [
  { name: "Music streaming", perk: "Student plan" },
  { name: "Food delivery", perk: "Student pricing" },
  { name: "Study tools", perk: "Free months for students" },
  { name: "Fashion", perk: "Student discount" },
];
