import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS, APP_STORE_URL, INSTAGRAM_URL, TIKTOK_URL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-dark text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Image
              src="/images/bizzy-logo.png"
              alt="Bizzy"
              width={100}
              height={44}
              className="h-10 w-auto mb-4 brightness-200"
            />
            <p className="text-gray-400 max-w-sm leading-relaxed">
              Connecting students to the best local deals, events, and spots
              around campus while helping nearby businesses reach the college
              crowd.
            </p>
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
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Bizzy. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
