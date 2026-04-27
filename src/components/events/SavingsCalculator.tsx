"use client";

import { useState, useMemo } from "react";

const formatCurrency = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

type TangibleItem = {
  name: string;
  cost: number;
  emoji: string;
  note: string;
};

const TANGIBLE_ITEMS: TangibleItem[] = [
  {
    name: "A new sound system",
    cost: 12000,
    emoji: "🔊",
    note: "Mid-range commercial PA",
  },
  {
    name: "A weekly DJ all year",
    cost: 16000,
    emoji: "🎧",
    note: "52 nights × $300",
  },
  {
    name: "A year of campus marketing",
    cost: 25000,
    emoji: "📣",
    note: "Real reach into your market",
  },
  {
    name: "A patio buildout",
    cost: 50000,
    emoji: "🌴",
    note: "Add seats. Add summer revenue.",
  },
  {
    name: "A full-time bartender",
    cost: 65000,
    emoji: "🥃",
    note: "Salary + benefits, all year",
  },
];

export default function SavingsCalculator() {
  const [volume, setVolume] = useState<string>("20000");
  const [feePct, setFeePct] = useState<string>("20");

  const { monthlySavings, annualSavings } = useMemo(() => {
    const v = Math.max(0, Number(volume) || 0);
    const f = Math.max(0, Math.min(100, Number(feePct) || 0));
    const monthly = (v * f) / 100;
    return {
      monthlySavings: monthly,
      annualSavings: monthly * 12,
    };
  }, [volume, feePct]);

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-10 shadow-sm">
      <h3 className="text-2xl md:text-3xl font-bold text-ink mb-2">
        Estimate your savings
      </h3>
      <p className="text-muted mb-8">
        Plug in your numbers. We&apos;ll walk through the actual economics on a
        demo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <label className="block">
          <span className="block text-sm font-semibold text-ink mb-2">
            Monthly ticket / cover volume
          </span>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-lg">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={500}
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full pl-9 pr-4 py-3 text-lg text-ink rounded-xl border border-gray-200 focus:border-primary focus:outline-none transition-colors"
              placeholder="20,000"
            />
          </div>
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-ink mb-2">
            Current platform fee
          </span>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={1}
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
              className="w-full pl-4 pr-9 py-3 text-lg text-ink rounded-xl border border-gray-200 focus:border-primary focus:outline-none transition-colors"
              placeholder="20"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-lg">
              %
            </span>
          </div>
        </label>
      </div>

      <div className="bg-gradient-to-br from-primary-light to-white rounded-2xl p-6 md:p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
              Monthly savings
            </p>
            <p className="text-4xl md:text-5xl font-bold text-ink">
              {formatCurrency(monthlySavings)}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
              Annual savings
            </p>
            <p className="text-4xl md:text-5xl font-bold text-primary">
              {formatCurrency(annualSavings)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
          What that could pay for
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {TANGIBLE_ITEMS.map((item) => {
            const pct = Math.min(
              100,
              annualSavings > 0 ? (annualSavings / item.cost) * 100 : 0,
            );
            const covered = annualSavings >= item.cost;
            return (
              <div
                key={item.name}
                className={`relative rounded-2xl p-4 border transition-all ${
                  covered
                    ? "bg-primary-light/60 border-primary/30"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="text-2xl mb-2">{item.emoji}</div>
                <p
                  className={`text-sm font-bold mb-1 leading-tight ${
                    covered ? "text-ink" : "text-ink/80"
                  }`}
                >
                  {item.name}
                </p>
                <p className="text-xs text-muted mb-3 leading-snug">
                  {formatCurrency(item.cost)}
                </p>
                {covered ? (
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Covered
                  </div>
                ) : (
                  <>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-muted">
                      {Math.round(pct)}% there
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Estimates only. Actual economics depend on your current provider,
        payment processing, and event setup. We&apos;ll walk through your real
        numbers on a demo.
      </p>
    </div>
  );
}
