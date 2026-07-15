"use client";

const STEPS = [
  { num: 1, label: "Deal" },
  { num: 2, label: "Business" },
  { num: 3, label: "Review" },
];

interface StepProgressProps {
  currentStep: number;
}

export default function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-2">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentStep === step.num
                ? "bg-primary text-white shadow-sm shadow-primary/20"
                : currentStep > step.num
                  ? "bg-primary/10 text-primary"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            {currentStep > step.num ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span>{step.num}</span>
            )}
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
