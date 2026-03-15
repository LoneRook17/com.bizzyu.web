import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS, APP_STORE_URL, INSTAGRAM_URL, TIKTOK_URL, CONTACT_EMAIL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
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
                <g transform="translate(10, 7) scale(0.05)">
                  <path fill="#fff" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-62.1 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                </g>
                <text x="68" y="17" fill="#fff" fontSize="8" fontFamily="system-ui" textAnchor="middle">Download on the</text>
                <text x="68" y="30" fill="#fff" fontSize="12" fontWeight="600" fontFamily="system-ui" textAnchor="middle">App Store</text>
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

        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Bizzy Deals LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
