import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "bizzy-deals.com" },
      { protocol: "https", hostname: "zlog.rifat-ahmed.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
        ],
      },
    ];
  },
  async redirects() {
    // /event/:id forwards to the Laravel event checkout. Destination is
    // per-deploy so the dev Vercel project (com-bizzyu-web-l2gp) can point
    // at the dev Laravel EC2 (3.80.143.224) while the prod project
    // (com-bizzyu-web) points at bizzy-deals.com. Set
    // CHECKOUT_REDIRECT_BASE in each Vercel project's environment vars.
    const checkoutBase =
      process.env.CHECKOUT_REDIRECT_BASE || "https://bizzy-deals.com";
    return [
      {
        source: "/signup",
        destination: "/business/signup",
        permanent: true,
      },
      {
        source: "/events-contact",
        destination: "/events",
        permanent: true,
      },
      {
        source: "/event/:id(\\d+)",
        destination: `${checkoutBase}/checkout/:id`,
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const apiUrl =
      process.env.INTERNAL_API_URL || "http://localhost:3000";
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
