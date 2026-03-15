"use client";

import { CONTACT_EMAIL } from "@/lib/constants";

interface StepSuccessProps {
  onReset: () => void;
}

export default function StepSuccess({ onReset }: StepSuccessProps) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold text-ink mb-3">
        Submission Received!
      </h2>

      <p className="text-muted text-lg leading-relaxed max-w-md mx-auto mb-8">
        The Bizzy team will review your deal and follow up soon. Once approved, your deal will go live for students to discover.
      </p>

      <div className="bg-primary-light rounded-2xl p-6 max-w-sm mx-auto mb-8">
        <h3 className="font-bold text-ink mb-2">What happens next?</h3>
        <ol className="text-sm text-muted text-left space-y-2">
          <li className="flex gap-2">
            <span className="text-primary font-bold">1.</span>
            We review your submission
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">2.</span>
            We may reach out with questions
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">3.</span>
            Your deal goes live on Bizzy
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">4.</span>
            Students start claiming!
          </li>
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onReset}
          className="px-8 py-3.5 bg-primary text-white font-semibold rounded-full hover:brightness-110 transition-all shadow-lg shadow-primary/25 cursor-pointer"
        >
          Submit Another Deal
        </button>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="px-8 py-3.5 border border-gray-200 text-ink font-semibold rounded-full hover:bg-gray-50 transition-all inline-flex items-center justify-center"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
