"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Deal {
  id: number;
  title: string;
  business: string;
  school: string;
  savings: number;
  image: string;
  category: string;
  tag: string;
}

export default function TrendingDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trending-deals")
      .then((res) => res.json())
      .then((data) => {
        setDeals(data.deals ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[280px] h-[180px] bg-gray-100 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (deals.length === 0) return null;

  // Double the deals for seamless loop
  const doubled = [...deals, ...deals];

  return (
    <div className="overflow-hidden">
      <div
        className="flex gap-5 animate-marquee-half"
        style={{ animationDuration: "20s" }}
      >
        {doubled.map((deal, i) => (
          <div
            key={`${deal.id}-${i}`}
            className="flex-shrink-0 w-[300px] bg-white rounded-2xl border border-gray-100 overflow-hidden hover:-translate-y-1 transition-transform duration-300 shadow-sm"
          >
            <div className="relative h-[140px] w-full">
              <Image
                src={deal.image}
                alt={deal.title}
                fill
                className="object-cover"
                sizes="300px"
              />
              <div className="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
                Save ${deal.savings}
              </div>
              <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                {deal.school}
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm font-bold text-ink leading-tight line-clamp-2 mb-1">
                {deal.title}
              </p>
              <p className="text-xs text-muted truncate">{deal.business}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
