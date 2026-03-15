"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FormData, BusinessInfo, DealInfo } from "@/lib/types";
import { EMPTY_FORM } from "@/lib/types";
import StepProgress from "./StepProgress";
import StepBusiness from "./StepBusiness";
import StepDeal from "./StepDeal";
import StepReview from "./StepReview";
import StepSuccess from "./StepSuccess";
import DealCardPreview from "./DealCardPreview";
import MobilePreviewSheet from "./MobilePreviewSheet";

export default function SignupFlow() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error("Submission failed");
    setSubmitted(true);
    setStep(4);
  };

  const handleReset = () => {
    setFormData(EMPTY_FORM);
    setStep(1);
    setSubmitted(false);
  };

  if (submitted) {
    return <StepSuccess onReset={handleReset} />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
      {/* Sticky preview sidebar - hidden on mobile */}
      <div className="hidden lg:block lg:w-[340px] lg:sticky lg:top-28 flex-shrink-0">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-6 border border-gray-100">
          <DealCardPreview data={formData} />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 min-w-0 w-full">
        <StepProgress currentStep={step} />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <StepDeal
                  data={formData.deal}
                  onChange={(deal: DealInfo) =>
                    setFormData((prev) => ({ ...prev, deal }))
                  }
                  mediaData={formData.media}
                  onMediaChange={(media) =>
                    setFormData((prev) => ({ ...prev, media }))
                  }
                  onNext={() => setStep(2)}
                  onBack={null}
                />
              )}
              {step === 2 && (
                <StepBusiness
                  data={formData.business}
                  onChange={(business: BusinessInfo) =>
                    setFormData((prev) => ({ ...prev, business }))
                  }
                  onNext={() => setStep(3)}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && (
                <StepReview
                  data={formData}
                  onBack={() => setStep(2)}
                  onSubmit={handleSubmit}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile preview bottom sheet */}
      <MobilePreviewSheet data={formData} />
    </div>
  );
}
