"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
  /**
   * Surface this sits on. "dark" is for ink sections (/events is dark end to
   * end); the default keeps the three light pages untouched.
   *
   * The "+" swaps primary-dark -> primary between tones on purpose: #0A8038 is
   * the green that clears 4.5:1 on WHITE, and it is near-invisible on ink,
   * where the brand #05EB54 reads at 12.78:1.
   */
  tone?: "light" | "dark";
}

const TONES = {
  light: {
    card: "border border-gray-200 bg-white",
    question: "text-ink",
    plus: "text-primary-dark",
    answer: "text-muted",
  },
  dark: {
    card: "border border-white/10 bg-white/[0.04]",
    question: "text-white",
    plus: "text-primary",
    answer: "text-white/60",
  },
} as const;

export default function FAQ({ items, tone = "light" }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const t = TONES[tone];

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {items.map((item, index) => (
        <div key={index} className={`rounded-2xl overflow-hidden ${t.card}`}>
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between px-6 py-5 text-left"
          >
            <span className={`text-lg font-semibold pr-4 ${t.question}`}>
              {item.question}
            </span>
            <motion.span
              animate={{ rotate: openIndex === index ? 45 : 0 }}
              transition={{ duration: 0.2 }}
              className={`text-2xl flex-shrink-0 leading-none ${t.plus}`}
            >
              +
            </motion.span>
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <p className={`px-6 pb-5 leading-relaxed ${t.answer}`}>
                  {item.answer}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
