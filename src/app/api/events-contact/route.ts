import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyTurnstile, getClientIp } from "@/lib/verifyTurnstile";
import { parseEventsContact } from "@/lib/public-forms/validate";
import { buildEventsContactEmail } from "@/lib/public-forms/emails";

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

/**
 * Public events-partnership inquiry → Partnerships inbox.
 *
 * Audit F30: see lib/public-forms — validated, capped, unknown keys dropped,
 * every field HTML-escaped. Turnstile + honeypot unchanged.
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

    const parsed = parseEventsContact(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const { error: emailError } = await getResend().emails.send({
      from: "Bizzy <support@no-reply.bizzyu.com>",
      to: ["Partnerships@BizzyU.com", "EvanMilionis@gmail.com"],
      ...buildEventsContactEmail(parsed.data),
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
    console.error("Events contact error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
