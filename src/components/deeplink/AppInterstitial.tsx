"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { APP_STORE_URL } from "@/lib/constants";

type Props = {
  title: string;
  subtitle?: string;
  /** The universal-link URL the user originally tapped. Used by the "Open in App" button. */
  deepLinkUrl: string;
  /** Optional bizzy:// custom-scheme variant — preferred for the "Open in App" button when available. */
  customSchemeUrl?: string;
};

const REDIRECT_DELAY_MS = 3000;

export default function AppInterstitial({
  title,
  subtitle,
  deepLinkUrl,
  customSchemeUrl,
}: Props) {
  const cancelled = useRef(false);

  useEffect(() => {
    const cancel = () => {
      cancelled.current = true;
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") cancel();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", cancel);
    window.addEventListener("blur", cancel);

    const timer = window.setTimeout(() => {
      if (!cancelled.current && document.visibilityState === "visible") {
        window.location.href = APP_STORE_URL;
      }
    }, REDIRECT_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", cancel);
      window.removeEventListener("blur", cancel);
    };
  }, []);

  const openInApp = customSchemeUrl ?? deepLinkUrl;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A] px-6 text-white">
      <div className="flex flex-col items-center gap-6 text-center">
        <Image
          src="/images/appicon.png"
          alt="Bizzy"
          width={96}
          height={96}
          priority
          className="rounded-2xl shadow-[0_0_60px_rgba(5,235,84,0.25)]"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-white/70">
            {subtitle ?? "Opening in Bizzy…"}
          </p>
        </div>
        <div
          aria-hidden
          className="h-1 w-32 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full w-1/2 animate-[loading_1.4s_ease-in-out_infinite] rounded-full bg-[#05EB54]" />
        </div>
        <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
          <a
            href={openInApp}
            className="rounded-full bg-[#05EB54] px-6 py-3 text-center text-sm font-semibold text-black transition hover:brightness-110"
          >
            Open in App
          </a>
          <a
            href={APP_STORE_URL}
            className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Download Bizzy
          </a>
        </div>
      </div>
      <noscript>
        <meta httpEquiv="refresh" content={`3;url=${APP_STORE_URL}`} />
      </noscript>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
