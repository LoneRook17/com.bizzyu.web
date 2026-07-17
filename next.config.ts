import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the team-invite mock switch to a literal at build time. Next only
  // inlines a NEXT_PUBLIC_ var it can see a value for — left unset it stays a
  // runtime lookup, the compare never folds to false, and the dev mock and its
  // scenario pickers get bundled into the production build. Defaulting it here
  // means the compare always folds and the mock is dropped unless someone opts
  // in explicitly. (Same trap K2 hit and fixed for the line-skip PI mock.)
  env: {
    NEXT_PUBLIC_TEAM_INVITE_MOCK: process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK || "0",
  },
  // The support bot's knowledge pack is read from disk at runtime — make sure
  // the markdown files ship inside the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/api/support-chat": ["./support-kb/*.md", "./business-kb/*.md"],
  },
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
    // at the dev Laravel EC2 while the prod project (com-bizzyu-web) points
    // at bizzy-deals.com. CHECKOUT_REDIRECT_BASE_URL is the canonical var and
    // MUST come first here — it's the same var the page components read, so a
    // single value governs every redirect path (build-time and runtime).
    // CHECKOUT_REDIRECT_BASE is kept only as a legacy fallback.
    const checkoutBase =
      process.env.CHECKOUT_REDIRECT_BASE_URL ||
      process.env.CHECKOUT_REDIRECT_BASE ||
      "https://bizzy-deals.com";
    return [
      {
        // /discounts and /post-a-deal both sold restaurants on posting a deal.
        // /post-a-deal won (it has the form), and its FAQ, founder note and
        // logo marquee were ported over, so nothing here is lost.
        //
        // Permanent (308) deliberately, unlike /signup below: this is a real,
        // final merge, so Google should pass /discounts' link equity to the
        // survivor rather than treat it as a temporary detour. The tradeoff is
        // that browsers cache 308s more or less forever, which is exactly why
        // the destination must be the page we intend to keep.
        source: "/discounts",
        destination: "/post-a-deal",
        permanent: true,
      },
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
      // Promoter tracking link. /p/:code is the ONE canonical promoter link,
      // served by every host. The Node API's GET /p/:code already logs the
      // click (INSERT IGNORE into tracking_link_clicks) and 302s to the
      // Laravel checkout with ?ref=:code. Reverse-proxy to it so click logging
      // AND the redirect target (Node's CHECKOUT_BASE_URL) stay a single source
      // of truth — nothing about them is duplicated here. Next forwards the
      // browser's real User-Agent to Node (so the logged row is non-Dart) and
      // passes Node's 302 straight through to the browser. This is ONLY the
      // browser / no-app fallback: /p/* is AASA-claimed, so an iPhone with the
      // app opens the app via the universal link before this route is fetched.
      {
        source: "/p/:code",
        destination: `${apiUrl}/p/:code`,
      },
      {
        source: "/api/laravel/:path*",
        destination: `${laravelApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
