"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_LINKS, APP_STORE_URL } from "@/lib/constants";

const MOBILE_LINKS = [
  { label: "Students", href: "/" },
  { label: "Businesses", href: "/businesses" },
  { label: "Portal", href: "/business/login" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
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

        {/* Mobile nav - inline links */}
        <div className="flex md:hidden items-center gap-4 flex-1 justify-end mr-0">
          {MOBILE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs font-medium transition-colors ${
                pathname === link.href
                  ? "text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
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
            href="https://calendly.com/partnerships-bizzyu/bizzy-bar-intro"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-5 py-2 bg-primary text-white text-sm font-semibold rounded-full hover:brightness-110 transition-all"
          >
            Book a Call
          </a>
        </div>
      </div>
    </nav>
  );
}
