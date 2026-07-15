"use client";

import Image from "next/image";
import type { FormData } from "@/lib/types";
import { REDEMPTION_OPTIONS } from "@/lib/types";

interface DealCardPreviewProps {
  data: FormData;
}

export default function DealCardPreview({ data }: DealCardPreviewProps) {
  const { business, deal, media } = data;
  const hasImage = !!media.dealImageUrl;
  const hasLogo = !!media.logoUrl;
  const freqLabel =
    REDEMPTION_OPTIONS.find((o) => o.value === deal.redemptionFrequency)
      ?.label || "Claim Once Per Day";

  return (
    <div className="w-full max-w-[320px] mx-auto">
      {/* Card */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {hasLogo ? (
              <Image
                src={media.logoUrl}
                alt="Logo"
                width={28}
                height={28}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold">B</span>
              </div>
            )}
            <span className="text-xs text-muted font-medium">
              {freqLabel}
            </span>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ccc"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </div>

        {/* Deal image */}
        <div className="relative aspect-[16/10] bg-gray-100 mx-3 rounded-xl overflow-hidden">
          {hasImage ? (
            <Image
              src={media.dealImageUrl}
              alt="Deal"
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-xs mt-2">Deal Image</span>
            </div>
          )}
          {/* Savings badge */}
          {deal.estimatedSavings && (
            <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
              Save {deal.estimatedSavings}
            </div>
          )}
        </div>

        {/* Deal info */}
        <div className="px-4 py-3">
          <h3 className="font-bold text-ink text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
            {deal.title || "Your Deal Title"}
          </h3>
          <p className="text-muted text-xs mt-1 truncate">
            {business.businessName || "Business Name"}
            {business.campus ? ` - ${business.campus}` : ""}
          </p>
        </div>
      </div>

      {/* Label */}
      <p className="text-center text-xs text-muted mt-3">
        This is how your <span className="font-semibold text-ink">Bizzy-exclusive</span> deal will appear to students
      </p>
    </div>
  );
}
