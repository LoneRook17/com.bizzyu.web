import { Resend } from "resend";
import { createRateLimiter } from "@/lib/ratelimit";
import { fetchBusinessSession, fetchBusinessVenue } from "@/lib/business/server-session";
import { handleAdminNotify } from "@/lib/admin-notify/handler";

export const runtime = "nodejs";

/**
 * "A business just created a deal / event" email to the admins.
 *
 * Audit F29: this used to be a public, unauthenticated, unlimited endpoint
 * that trusted `business` / `createdBy` / `university` from the body. It now
 * requires the dashboard's own business session (biz_token cookie, verified
 * against GET /business/auth/me), takes the business + creator from that
 * session, resolves the venue by id from the caller's own venue list, drops
 * identity-looking keys from `details`, and rate limits per IP and per
 * business. The whole flow lives in lib/admin-notify/handler.ts so it is unit
 * tested with a fake session and a captured send; this file only wires the
 * real dependencies.
 *
 * Rate limits are per serverless instance (see lib/ratelimit.ts); a shared
 * store (Upstash / Vercel WAF) is the prod-grade follow-up.
 */

const ADMIN_RECIPIENTS = [
  "cooper.aiello@gmail.com",
  "evanmillionis@gmail.com",
  "admin@bizzy.university",
];

// A real business creates a handful of deals/events a day. Thirty per IP and
// ten per business inside ten minutes is a script.
const ipLimit = createRateLimiter({ burstWindowMs: 10 * 60 * 1000, burstMax: 30, dailyMax: 200 });
const businessLimit = createRateLimiter({ burstWindowMs: 10 * 60 * 1000, burstMax: 10, dailyMax: 60 });

export async function POST(request: Request) {
  return handleAdminNotify(request, {
    resolveSession: fetchBusinessSession,
    lookupVenue: fetchBusinessVenue,
    ipLimit,
    businessLimit,
    sendEmail: async ({ subject, html }) => {
      const { error } = await new Resend(process.env.RESEND_API_KEY!).emails.send({
        from: "Bizzy <support@no-reply.bizzyu.com>",
        to: ADMIN_RECIPIENTS,
        subject,
        html,
      });
      return { error };
    },
  });
}
