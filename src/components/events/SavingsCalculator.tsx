"use client";

import { useState, useMemo } from "react";

const formatCurrency = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

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

      <div className="bg-gradient-to-br from-primary-light to-white rounded-2xl p-6 md:p-8 mb-6">
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

      <p className="text-xs text-muted leading-relaxed">
        Estimates only. Actual economics depend on your current provider,
        payment processing, and event setup. We&apos;ll walk through your real
        numbers on a demo.
      </p>
    </div>
  );
}
