"use client";

import { useRef } from "react";
import Image from "next/image";
import type { MediaInfo } from "@/lib/types";

interface StepMediaProps {
  data: MediaInfo;
  onChange: (data: MediaInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

function ImageUpload({
  label,
  hint,
  value,
  onUpload,
  onClear,
  aspect,
}: {
  label: string;
  hint: string;
  value: string;
  onUpload: (dataUrl: string) => void;
  onClear: () => void;
  aspect: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpload(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-2">{label}</label>
      <p className="text-xs text-muted mb-3">{hint}</p>

      {value ? (
        <div className="relative">
          <div className={`relative ${aspect} rounded-xl overflow-hidden bg-gray-100 border border-gray-200`}>
            <Image src={value} alt={label} fill className="object-cover" />
          </div>
          <button
            onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 bg-ink/70 text-white rounded-full flex items-center justify-center hover:bg-ink transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className={`w-full ${aspect} rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer`}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#05EB54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-sm font-medium text-muted">
            Click to upload
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}

export default function StepMedia({
  data,
  onChange,
  onNext,
  onBack,
}: StepMediaProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink mb-1">Media</h2>
        <p className="text-muted text-sm">
          Add images to make your deal stand out. Both are optional - you can
          always send them to us later.
        </p>
      </div>

      <ImageUpload
        label="Deal Image"
        hint="A photo of the deal, your food, or venue. Recommended: 16:10 landscape."
        value={data.dealImageUrl}
        onUpload={(url) => onChange({ ...data, dealImageUrl: url })}
        onClear={() => onChange({ ...data, dealImageUrl: "" })}
        aspect="aspect-[16/10]"
      />

      <ImageUpload
        label="Business Logo"
        hint="Your logo will appear on the deal card. Recommended: square."
        value={data.logoUrl}
        onUpload={(url) => onChange({ ...data, logoUrl: url })}
        onClear={() => onChange({ ...data, logoUrl: "" })}
        aspect="aspect-square max-w-[160px]"
      />

      <div className="flex gap-3 mt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 border border-gray-200 text-ink font-semibold rounded-full hover:bg-gray-50 transition-all cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3.5 bg-primary text-white font-semibold rounded-full hover:brightness-110 transition-all shadow-lg shadow-primary/25 cursor-pointer"
        >
          Continue to Review
        </button>
      </div>
    </div>
  );
}
