import Image from "next/image";

interface BizzyMarkProps {
  /** Tweak the inline scale relative to surrounding font size. */
  scale?: number;
  className?: string;
}

/**
 * Inline brand stamp using the exact nav-bar logo PNG. Use anywhere
 * "Bizzy" should appear as a brand callout inside a headline. Scales
 * with the surrounding font-size via em-units so it works in any
 * heading size.
 */
export default function BizzyMark({ scale = 1.05, className = "" }: BizzyMarkProps) {
  return (
    <span
      className={`inline-block align-middle ${className}`}
      style={{
        height: `${scale}em`,
        marginInline: "0.06em",
        verticalAlign: "-0.18em",
      }}
    >
      <Image
        src="/images/bizzy-logo.png"
        alt="Bizzy"
        width={300}
        height={120}
        className="h-full w-auto object-contain"
        priority
      />
    </span>
  );
}
