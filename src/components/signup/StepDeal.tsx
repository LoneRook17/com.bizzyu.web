"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { DealInfo, MediaInfo } from "@/lib/types";
import { REDEMPTION_OPTIONS } from "@/lib/types";

interface StepDealProps {
  data: DealInfo;
  onChange: (data: DealInfo) => void;
  mediaData: MediaInfo;
  onMediaChange: (data: MediaInfo) => void;
  onNext: () => void;
  onBack: (() => void) | null;
}

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm";

export default function StepDeal({
  data,
  onChange,
  mediaData,
  onMediaChange,
  onNext,
  onBack,
}: StepDealProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInfo, setShowInfo] = useState(false);

  const update = (field: keyof DealInfo, value: string) =>
    onChange({ ...data, [field]: value });

  const selectedOption = REDEMPTION_OPTIONS.find(
    (o) => o.value === data.redemptionFrequency
  );

  const canContinue =
    data.title.trim() &&
    data.description.trim() &&
    data.estimatedSavings.trim() &&
    data.redemptionFrequency &&
    (data.redemptionFrequency !== "limited_supply" ||
      data.limitedSupplyCount.trim());

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-ink mb-1">Deal Details</h2>
        <p className="text-muted text-sm">
          Describe the deal you want to offer students.
        </p>
      </div>

      {/* Exclusivity reminder */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
        <p className="text-sm text-ink font-medium">
          Your offer must be exclusive to Bizzy users and not available to the
          general public elsewhere.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Deal Title <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => update("title", e.target.value)}
          className={inputClass}
          placeholder="e.g. BOGO Espresso Martinis (21+)"
        />
        <p className="text-xs text-muted mt-1">Keep it clear and compelling. Students should only be able to access this deal through Bizzy.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Deal Description <span className="text-primary">*</span>
        </label>
        <textarea
          value={data.description}
          onChange={(e) => update("description", e.target.value)}
          className={`${inputClass} resize-none`}
          rows={3}
          placeholder="e.g. Buy one espresso martini, get one free. Must be 21+. Show this deal at checkout."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Estimated Savings <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            value={data.estimatedSavings}
            onChange={(e) => update("estimatedSavings", e.target.value)}
            className={inputClass}
            placeholder="e.g. $8"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="text-sm font-medium text-ink">
              Redemption Frequency <span className="text-primary">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className="w-4.5 h-4.5 rounded-full bg-gray-200 text-muted text-xs font-bold flex items-center justify-center hover:bg-gray-300 transition-colors cursor-pointer leading-none"
              aria-label="What is redemption frequency?"
            >
              ?
            </button>
          </div>
          <select
            value={data.redemptionFrequency}
            onChange={(e) => update("redemptionFrequency", e.target.value)}
            className={inputClass}
          >
            <option value="">How often can students claim?</option>
            {REDEMPTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info tooltip */}
      {showInfo && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-muted space-y-1.5">
          {selectedOption ? (
            <p>{selectedOption.info}</p>
          ) : (
            REDEMPTION_OPTIONS.map((opt) => (
              <p key={opt.value}>
                <span className="font-semibold text-ink">
                  {opt.label}:
                </span>{" "}
                {opt.info}
              </p>
            ))
          )}
        </div>
      )}

      {/* Limited supply count */}
      {data.redemptionFrequency === "limited_supply" && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Total Claims Available <span className="text-primary">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={data.limitedSupplyCount}
            onChange={(e) => update("limitedSupplyCount", e.target.value)}
            className={inputClass}
            placeholder="e.g. 100"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={data.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            End Date
          </label>
          <input
            type="date"
            value={data.endDate}
            onChange={(e) => update("endDate", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Deal Image (optional) */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Deal Image <span className="text-muted font-normal">(optional)</span>
        </label>
        <p className="text-xs text-muted mb-2">
          Recommended: 1600×1000px landscape (16:10). You can always send one later.
        </p>
        {mediaData.dealImageUrl ? (
          <div className="relative">
            <div className="relative aspect-[16/10] max-w-[280px] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              <Image src={mediaData.dealImageUrl} alt="Deal" fill className="object-cover" />
            </div>
            <button
              type="button"
              onClick={() => onMediaChange({ ...mediaData, dealImageUrl: "" })}
              className="absolute top-1.5 left-[252px] w-6 h-6 bg-ink/70 text-white rounded-full flex items-center justify-center hover:bg-ink transition-colors cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-sm text-muted">Upload image</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") {
                onMediaChange({ ...mediaData, dealImageUrl: reader.result });
              }
            };
            reader.readAsDataURL(file);
          }}
          className="hidden"
        />
      </div>

      <div className="flex gap-3 mt-2">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 py-3.5 border border-gray-200 text-ink font-semibold rounded-full hover:bg-gray-50 transition-all cursor-pointer"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!canContinue}
          className={`${onBack ? "flex-1" : "w-full"} py-3.5 bg-primary text-white font-semibold rounded-full hover:brightness-110 transition-all shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
