"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DealCardPreview from "./DealCardPreview";
import type { FormData } from "@/lib/types";

interface MobilePreviewSheetProps {
  data: FormData;
}

export default function MobilePreviewSheet({ data }: MobilePreviewSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-primary to-emerald-500 text-white w-14 h-14 rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:brightness-110 transition-all cursor-pointer"
        aria-label="Preview deal"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </button>

      {/* Bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-6 pt-4 pb-8 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <p className="text-center text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                Deal Preview
              </p>
              <DealCardPreview data={data} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
