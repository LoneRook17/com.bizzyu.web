"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_LINKS, APP_STORE_URL, CALENDLY_DEMO_URL } from "@/lib/constants";
import GetBizzyMenu from "./GetBizzyMenu";

export default function Navbar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // At the top the bar is invisible and the hero runs behind it; once you
  // scroll it earns a frosted panel and a hairline. Otherwise it floats over
  // the page with nothing separating it from the content.
  const [scrolled, setScrolled] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Close drawer on route change
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    // Passive: this must never block scrolling. Threshold is well past 0 so a
    // trackpad twitch at the top doesn't flicker the panel on and off.
    const onScroll = () => setScrolled(window.scrollY > 24);
    // Deferred, not called inline: setState synchronously in an effect body can
    // cascade renders. rAF also means the first read happens after paint, so a
    // page restored mid-scroll still gets its panel.
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 border-b ${
          scrolled
            ? "bg-white/85 backdrop-blur-xl border-gray-200/70"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 mr-8">
            <Image
              src="/images/bizzy-logo.png"
              alt="Bizzy"
              width={100}
              height={40}
              className="h-7 md:h-8 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop nav - left aligned after logo like Stripe */}
          <div className="hidden md:flex items-center gap-7 flex-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[15px] font-medium transition-colors ${
                  pathname === link.href
                    ? "text-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden flex-1 justify-end">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="p-2 -mr-2 text-ink"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-5">
            <Link
              href="/business/login"
              className="text-[13px] font-medium text-muted hover:text-ink transition-colors"
            >
              Business Portal
            </Link>
            <GetBizzyMenu />
          </div>
        </div>
      </nav>

      {/* Mobile drawer backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 md:hidden ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 right-0 bottom-0 z-[70] w-72 bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end p-4">
          <button
            onClick={closeDrawer}
            aria-label="Close menu"
            className="p-2 -mr-2 text-ink"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Drawer nav links */}
        <div className="px-6 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeDrawer}
              className={`block py-3 text-lg font-medium transition-colors ${
                pathname === link.href
                  ? "text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Divider */}
          <div className="border-t border-gray-100 my-3" />

          <Link
            href="/business/login"
            onClick={closeDrawer}
            className="block py-3 text-lg font-medium text-muted hover:text-ink transition-colors"
          >
            Business Portal
          </Link>

          {/* The three paths spelled out, not a dropdown: a popover inside a
              drawer is two taps and a guess. Mirrors GetBizzyMenu's options. */}
          <p className="mt-4 mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-dark">
            Get Bizzy
          </p>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeDrawer}
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-ink text-base font-semibold rounded-full hover:brightness-105 transition-all"
          >
            Download the app
          </a>
          <Link
            href="/post-a-deal"
            onClick={closeDrawer}
            className="mt-2 block py-2.5 text-base font-medium text-ink"
          >
            Post a free deal
          </Link>
          <a
            href={CALENDLY_DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeDrawer}
            className="block py-2.5 text-base font-medium text-ink"
          >
            Book a venue demo
          </a>
        </div>
      </div>
    </>
  );
}
