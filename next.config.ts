import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin both dev-mock switches to a literal at build time. Next only inlines a
  // NEXT_PUBLIC_ var it can see a value for — left unset it stays a runtime
  // lookup, the `MOCK_ENABLED` compare never folds to false, and the dev mock
  // plus its scenario picker get bundled into the production build (verified:
  // they did). Defaulting each here means the compare always folds and the mock
  // is dropped unless someone opts in explicitly. Both keys are required — one
  // guards the line-skip PI checkout mock, the other the team-invite mock.
  env: {
    NEXT_PUBLIC_LINESKIP_PI_MOCK: process.env.NEXT_PUBLIC_LINESKIP_PI_MOCK || "0",
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
    // /event/:id is owned by src/app/event/[id]/page.tsx so a host-ended
    // Weekly Cover night can fail closed before any Laravel bounce. Live
    // nights still 302 to CHECKOUT_REDIRECT_BASE_URL from that page.
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
      // Team-invite accept page moved to the unclaimed /team-invite. Forward the
      // two older entry points to it, preserving ?token= (Next passes through
      // any query the destination doesn't itself specify). Temporary (307): an
      // invite link is transient, so we never want a browser caching this detour
      // the way it would a 308. These mirror src/middleware.ts (which handles
      // /business/accept-invite) and src/app/accept-invite/page.tsx — config +
      // page + middleware are intentional twins so the token survives no matter
      // which layer catches the request first. The vercel.json redirects block
      // carries a platform-level third copy.
      {
        source: "/accept-invite",
        destination: "/team-invite",
        permanent: false,
      },
      {
        source: "/business/accept-invite",
        destination: "/team-invite",
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
