import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyTurnstile, getClientIp } from "@/lib/verifyTurnstile";
import { parseContact } from "@/lib/public-forms/validate";
import { buildContactEmail } from "@/lib/public-forms/emails";

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

/**
 * Public contact form → Contact@ inbox.
 *
 * Audit F30: input is validated (shape, email, length caps; unknown keys
 * dropped) and every field is HTML-escaped in lib/public-forms before it is
 * handed to Resend. Turnstile + honeypot run first, exactly as before.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const check = await verifyTurnstile(body.turnstileToken, body.website_url, getClientIp(request));
    if (!check.ok) {
      return NextResponse.json({ error: "Verification failed" }, { status: 422 });
    }

    const parsed = parseContact(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const { error: emailError } = await getResend().emails.send({
      from: "Bizzy <support@no-reply.bizzyu.com>",
      to: ["Contact@BizzyU.com"],
      ...buildContactEmail(parsed.data),
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "sent" }, { status: 201 });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
