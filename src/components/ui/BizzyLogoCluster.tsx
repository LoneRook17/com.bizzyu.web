import Image from "next/image";
import { fetchPublicLogos } from "@/lib/publicLogos";

interface BizzyLogoClusterProps {
  /** Sentence shown beside the cluster. */
  children: React.ReactNode;
  /** How many logos to overlap. Beyond ~5 the cluster reads as clutter. */
  count?: number;
  className?: string;
}

/**
 * Overlapping cluster of real approved-business logos + a line of social proof.
 *
 * Deliberately logos, not headshots: these are businesses that actually signed
 * up, so the proof is verifiable. Stock faces here would imply endorsements
 * from people who never gave one.
 *
 * The sentence renders even when the logo API is down. It's a standalone
 * claim, so the hero row never collapses to nothing.
 */
export default async function BizzyLogoCluster({
  children,
  count = 5,
  className = "",
}: BizzyLogoClusterProps) {
  const logos = await fetchPublicLogos(count);

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {logos.length > 0 && (
        <ul className="flex -space-x-2.5" aria-label="Businesses already on Bizzy">
          {logos.map((logo) => (
            <li key={logo.id}>
              <Image
                src={logo.logo_url}
                alt={logo.name}
                width={80}
                height={80}
                unoptimized
                className="w-9 h-9 rounded-full object-contain bg-white ring-2 ring-white shadow-sm"
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted leading-snug">{children}</p>
    </div>
  );
}
