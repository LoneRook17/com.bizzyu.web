"use client";

import type { BusinessInfo } from "@/lib/types";

interface StepBusinessProps {
  data: BusinessInfo;
  onChange: (data: BusinessInfo) => void;
  onNext: () => void;
  onBack?: () => void;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm";

export default function StepBusiness({
  data,
  onChange,
  onNext,
  onBack,
}: StepBusinessProps) {
  const update = (field: keyof BusinessInfo, value: string) =>
    onChange({ ...data, [field]: value });

  const canContinue =
    data.businessName.trim() &&
    data.contactName.trim() &&
    data.email.trim() &&
    data.phone.trim() &&
    data.address.trim();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-ink mb-1">Business Information</h2>
        <p className="text-muted text-sm">Tell us about your business.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Business Name" required>
          <input
            type="text"
            value={data.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            className={inputClass}
            placeholder="e.g. Pezzo Pizza & Bar"
          />
        </Field>

        <Field label="Contact Name" required>
          <input
            type="text"
            value={data.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            className={inputClass}
            placeholder="Your name"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Field label="Email" required>
            <input
              type="email"
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClass}
              placeholder="you@business.com"
            />
          </Field>
          <p className="text-xs text-muted mt-1">This is where your monthly deal report will be sent.</p>
        </div>

        <Field label="Phone" required>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
            placeholder="(555) 123-4567"
          />
        </Field>
      </div>

      <Field label="Business Address" required>
        <input
          type="text"
          value={data.address}
          onChange={(e) => update("address", e.target.value)}
          className={inputClass}
          placeholder="123 Main St, Fort Myers, FL"
        />
      </Field>

      <Field label="Campus / School">
        <input
          type="text"
          value={data.campus}
          onChange={(e) => update("campus", e.target.value)}
          className={inputClass}
          placeholder="e.g. University of Georgia"
        />
      </Field>

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
