"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";

const CALENDLY_URL = "https://calendly.com/partnerships-bizzyu/bizzy-bar-intro";

export default function Navbar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl">
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
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-2 bg-primary text-white text-sm font-semibold rounded-full hover:brightness-110 transition-all"
            >
              Book a Call
            </a>
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

          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeDrawer}
            className="mt-3 inline-flex items-center justify-center px-6 py-3 bg-primary text-white text-base font-semibold rounded-full hover:brightness-110 transition-all"
          >
            Book a Call
          </a>
        </div>
      </div>
    </>
  );
}
