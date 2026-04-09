import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "bizzy-deals.com" },
      { protocol: "https", hostname: "zlog.rifat-ahmed.com" },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
