"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface PhoneMockupProps {
  src: string;
  alt: string;
  className?: string;
}

export default function PhoneMockup({ src, alt, className = "" }: PhoneMockupProps) {
  return (
    <div className={`relative ${className}`}>
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative mx-auto w-[280px] md:w-[320px]"
      >
        {/* Phone frame */}
        <div className="relative rounded-[3rem] border-[8px] border-ink bg-ink shadow-2xl overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-ink rounded-b-2xl z-10" />
          {/* Screen */}
          <div className="relative aspect-[9/19.5] bg-white overflow-hidden">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover object-top"
              priority
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
