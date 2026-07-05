import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The support bot's knowledge pack is read from disk at runtime — make sure
  // the markdown files ship inside the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/api/support-chat": ["./support-kb/*.md"],
  },
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
