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
import TurnstileWidget from "@/components/ui/TurnstileWidget";

interface SignupFlowProps {
  /** Live campuses from the university API, fetched server-side by the page. */
  universities?: { name: string; fullName: string }[];
}

export default function SignupFlow({ universities }: SignupFlowProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  // /api/submissions rejects with 422 unless both of these are supplied, and
  // only fails open when TURNSTILE_SECRET_KEY is unset (it is set in prod).
  // Without them every submission dies silently and the deal never reaches us.
  const [turnstileToken, setTurnstileToken] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = async () => {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, turnstileToken, website_url: honeypot }),
    });
    if (!res.ok) throw new Error("Submission failed");
    setSubmitted(true);
    setStep(4);
  };

  const handleReset = () => {
    setFormData(EMPTY_FORM);
    setStep(1);
    setSubmitted(false);
    setTurnstileToken("");
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
                  universities={universities}
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
                  verification={
                    <>
                      {/* Honeypot: off-screen rather than display:none, so bots
                          that skip hidden fields still fill it. Real people
                          never see or tab to it. */}
                      <input
                        type="text"
                        name="website_url"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="absolute -left-[9999px] w-px h-px opacity-0"
                      />
                      <TurnstileWidget
                        onVerify={setTurnstileToken}
                        onExpire={() => setTurnstileToken("")}
                      />
                    </>
                  }
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
