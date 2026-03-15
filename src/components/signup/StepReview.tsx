"use client";

import { useState } from "react";
import type { FormData } from "@/lib/types";
import { REDEMPTION_OPTIONS } from "@/lib/types";
import DealCardPreview from "./DealCardPreview";

interface StepReviewProps {
  data: FormData;
  onBack: () => void;
  onSubmit: () => Promise<void>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-ink text-sm font-medium text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

export default function StepReview({
  data,
  onBack,
  onSubmit,
}: StepReviewProps) {
  const [exclusive, setExclusive] = useState(false);
  const [honor, setHonor] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedOption = REDEMPTION_OPTIONS.find(
    (o) => o.value === data.deal.redemptionFrequency
  );
  const freqLabel = selectedOption
    ? data.deal.redemptionFrequency === "limited_supply"
      ? `${selectedOption.label} (${data.deal.limitedSupplyCount})`
      : selectedOption.label
    : "";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink mb-1">Review & Submit</h2>
        <p className="text-muted text-sm">
          Double-check everything looks good. You can go back to edit any step.
        </p>
      </div>

      {/* Live preview */}
      <div className="bg-gray-50 rounded-2xl p-6 flex justify-center">
        <DealCardPreview data={data} />
      </div>

      {/* Business info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-ink mb-3">Business Information</h3>
        <InfoRow label="Business" value={data.business.businessName} />
        <InfoRow label="Contact" value={data.business.contactName} />
        <InfoRow label="Email" value={data.business.email} />
        <InfoRow label="Phone" value={data.business.phone} />
        <InfoRow label="Address" value={data.business.address} />
        <InfoRow label="Campus" value={data.business.campus} />
      </div>

      {/* Deal info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-ink mb-3">Deal Details</h3>
        <InfoRow label="Title" value={data.deal.title} />
        <InfoRow label="Description" value={data.deal.description} />
        <InfoRow label="Est. Savings" value={data.deal.estimatedSavings} />
        <InfoRow label="Redemption" value={freqLabel} />
        <InfoRow label="Start Date" value={data.deal.startDate} />
        <InfoRow label="End Date" value={data.deal.endDate} />
      </div>

      {/* Exclusivity reminder */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
        <p className="text-sm text-ink font-bold">
          Reminder: All Bizzy deals must be exclusive to Bizzy users only.
        </p>
        <p className="text-xs text-muted mt-1">
          Deals that are publicly available elsewhere will not be approved.
        </p>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={exclusive}
            onChange={(e) => setExclusive(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-primary cursor-pointer"
          />
          <span className="text-sm text-ink">
            I confirm this deal is <strong>exclusive to Bizzy users</strong> and
            is not publicly available elsewhere.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={honor}
            onChange={(e) => setHonor(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-primary cursor-pointer"
          />
          <span className="text-sm text-ink">
            I agree to honor this deal as submitted when Bizzy students present
            it at my business.
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleSubmit}
          disabled={!exclusive || !honor || submitting}
          className="w-full py-4 bg-gradient-to-r from-primary to-emerald-500 text-white font-bold text-lg rounded-full hover:brightness-110 transition-all shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
        >
          {submitting ? "Submitting..." : "Submit for Review"}
        </button>
        <button
          onClick={onBack}
          disabled={submitting}
          className="w-full py-3 text-muted font-medium text-sm hover:text-ink transition-colors cursor-pointer disabled:opacity-40"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
