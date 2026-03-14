"use client";

interface MarqueeProps {
  items: string[];
  speed?: number;
}

export default function Marquee({ items, speed = 30 }: MarqueeProps) {
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10" />
      <div
        className="flex gap-8 animate-marquee whitespace-nowrap"
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 rounded-full border border-gray-200 text-sm font-medium text-ink"
          >
            <div className="w-2 h-2 rounded-full bg-primary" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
