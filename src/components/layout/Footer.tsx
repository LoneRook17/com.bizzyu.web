import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS, APP_STORE_URL, INSTAGRAM_URL, TIKTOK_URL, CONTACT_EMAIL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Image
              src="/images/bizzy-logo.png"
              alt="Bizzy"
              width={100}
              height={44}
              className="h-10 w-auto mb-4 brightness-200"
            />
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Connecting students to the best local deals, events, and spots
              around campus.
            </p>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <svg width="120" height="40" viewBox="0 0 120 40" className="opacity-70 hover:opacity-100 transition-opacity">
                <rect width="120" height="40" rx="8" fill="#fff" fillOpacity="0.15" />
                <text x="60" y="17" fill="#fff" fontSize="8" fontFamily="system-ui" textAnchor="middle">Download on the</text>
                <text x="60" y="30" fill="#fff" fontSize="12" fontWeight="600" fontFamily="system-ui" textAnchor="middle">App Store</text>
              </svg>
            </a>
          </div>

          {/* Pages */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Pages</h4>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Connect</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors text-sm"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href={TIKTOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors text-sm"
                >
                  TikTok
                </a>
              </li>
              <li>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors text-sm"
                >
                  App Store
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-gray-400 hover:text-primary transition-colors text-sm"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>

          {/* Campuses */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Live On Campus</h4>
            <ul className="space-y-2">
              {["FGCU", "USF", "UGA", "ASU"].map((school) => (
                <li key={school}>
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {school}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Bizzy Deals LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
