"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_LINKS, APP_STORE_URL } from "@/lib/constants";

const MOBILE_LINKS = [
  { label: "Students", href: "/students" },
  { label: "Businesses", href: "/businesses" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/images/bizzy-logo.png"
            alt="Bizzy"
            width={100}
            height={40}
            className="h-7 md:h-8 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-base font-semibold transition-colors ${
                pathname === link.href
                  ? "text-primary"
                  : "text-muted hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile nav - inline links */}
        <div className="flex md:hidden items-center gap-4">
          {MOBILE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs font-semibold transition-colors ${
                pathname === link.href
                  ? "text-primary"
                  : "text-muted hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center px-5 py-2.5 bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] text-white text-sm font-semibold rounded-full hover:brightness-110 transition-all shadow-lg shadow-primary/25"
        >
          Download App
        </a>
      </div>
    </nav>
  );
}
