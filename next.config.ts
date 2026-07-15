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
        // /signup was the deal-submission form until it was pointed at account
        // signup. It now goes back to the form, at its new home.
        // NOTE: the old rule was permanent (308), which browsers cache more or
        // less forever. Anyone who hit /signup while that was live will keep
        // landing on /business/signup from their own cache no matter what this
        // says, which is why the form lives at a fresh path instead of /signup.
        // Temporary (307) here so this is never cached against us again.
        source: "/signup",
        destination: "/post-a-deal",
        permanent: false,
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
    // Laravel API host. Used by Premium 2.0 phone-OTP auth + universities list.
    // Dev EC2: http://3.80.143.224  |  Prod: https://bizzy-deals.com
    const laravelApiUrl =
      process.env.LARAVEL_API_URL || "http://127.0.0.1:8001";
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${apiUrl}/:path*`,
      },
      {
        source: "/api/laravel/:path*",
        destination: `${laravelApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
