import Image from "next/image";
import { fetchPublicLogos } from "@/lib/publicLogos";

interface BizzyVenuesMarqueeProps {
  /** Override the marquee eyebrow label. */
  label?: string;
  /** Seconds for one full loop. Lower is faster. */
  durationSec?: number;
  /** Light or dark theme controls fade overlay color. */
  theme?: "light" | "dark";
  /** Max logos to render (caps the visual after API returns up to 60). */
  limit?: number;
}

/**
 * Server-rendered marquee of every approved business's uploaded logo.
 * Pulled from the Node services public endpoint. Cached 5 min.
 *
 * Returns null silently if the API is unreachable or returns no logos -
 * we never want to show a broken "Brands on Bizzy" strip.
 */
export default async function BizzyVenuesMarquee({
  label = "On Bizzy",
  durationSec = 14,
  theme = "light",
  limit = 30,
}: BizzyVenuesMarqueeProps) {
  const logos = await fetchPublicLogos(limit);

  if (logos.length === 0) return null;

  // Duplicate for seamless loop. 4 copies because marquee animation
  // translates -25% so we need 4x content width to hide the seam.
  const repeated = [...logos, ...logos, ...logos, ...logos];

  const fadeFrom = theme === "dark" ? "from-ink" : "from-white";
  const fadeFromR = theme === "dark" ? "from-ink" : "from-white";
  const labelColor = theme === "dark" ? "text-white/40" : "text-gray-400";

  return (
    <section
      className={`py-12 md:py-14 overflow-hidden ${theme === "dark" ? "bg-ink" : "bg-white border-t border-gray-100"}`}
    >
      <p
        className={`text-center text-[11px] font-semibold uppercase tracking-[0.22em] mb-8 ${labelColor}`}
      >
        {label}
      </p>
      <div className="relative">
        <div
          className={`absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r ${fadeFrom} to-transparent z-10 pointer-events-none`}
        />
        <div
          className={`absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l ${fadeFromR} to-transparent z-10 pointer-events-none`}
        />
        <div
          className="flex animate-marquee items-center"
          style={{ animationDuration: `${durationSec}s` }}
        >
          {repeated.map((logo, i) => (
            <div
              key={`${logo.id}-${i}`}
              className="flex-shrink-0 mx-10 md:mx-14 flex items-center justify-center h-16 md:h-20"
              title={logo.name}
            >
              <Image
                src={logo.logo_url}
                alt={logo.name}
                width={240}
                height={80}
                className={`max-h-16 md:max-h-20 w-auto object-contain ${
                  theme === "dark"
                    ? "brightness-0 invert opacity-70 hover:opacity-100"
                    : "opacity-60 hover:opacity-100"
                } transition-opacity duration-300`}
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
