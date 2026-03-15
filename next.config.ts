import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "bizzy-deals.com" },
      { protocol: "https", hostname: "zlog.rifat-ahmed.com" },
    ],
  },
};

export default nextConfig;
