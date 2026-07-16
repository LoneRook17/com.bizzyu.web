"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { APP_STORE_URL, CALENDLY_DEMO_URL } from "@/lib/constants";

/**
 * One CTA that routes each audience to its own path.
 *
 * The navbar used to show "Book a Call" everywhere, which is a *bar demo* —
 * pushed at students and restaurant owners alike, on every page. Bizzy has
 * three audiences with almost nothing in common operationally, so the single
 * CTA now asks which one you are instead of guessing wrong twice out of three.
 */

const OPTIONS = [
  {
    href: APP_STORE_URL,
    external: true,
    title: "Download the app",
    detail: "Deals, events and line skips near you",
    icon: "phone",
  },
  {
    href: "/post-a-deal",
    external: false,
    title: "Post a free deal",
    detail: "Restaurants, cafés and retail",
    icon: "tag",
  },
  {
    href: CALENDLY_DEMO_URL,
    external: true,
    title: "Book a venue demo",
    detail: "Bars, venues and promoters",
    icon: "ticket",
  },
] as const;

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "phone")
    return (
      <svg {...common}>
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path d="M11 18h2" />
      </svg>
    );
  if (name === "tag")
    return (
      <svg {...common}>
        <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
        <circle cx="7" cy="7" r="1.4" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v14" />
    </svg>
  );
}

export default function GetBizzyMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    // Pointer, not click: closes on scroll-tap and right-click too.
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        // Ink on green: white on #05EB54 is 1.61:1 and fails AA at any size.
        className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary text-ink text-sm font-semibold rounded-full hover:brightness-105 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Get Bizzy
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-[270px] rounded-2xl bg-white border border-gray-200 shadow-2xl shadow-black/10 p-1.5 z-50"
        >
          {OPTIONS.map((o) =>
            o.external ? (
              <a
                key={o.title}
                role="menuitem"
                href={o.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => close()}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
              >
                <span className="mt-0.5 w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                  <Icon name={o.icon} className="w-4 h-4 text-primary-dark" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink leading-snug">{o.title}</span>
                  <span className="block text-xs text-muted mt-0.5 leading-snug">{o.detail}</span>
                </span>
              </a>
            ) : (
              <Link
                key={o.title}
                role="menuitem"
                href={o.href}
                onClick={() => close()}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
              >
                <span className="mt-0.5 w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                  <Icon name={o.icon} className="w-4 h-4 text-primary-dark" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink leading-snug">{o.title}</span>
                  <span className="block text-xs text-muted mt-0.5 leading-snug">{o.detail}</span>
                </span>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
