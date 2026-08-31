import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyTurnstile, getClientIp } from "@/lib/verifyTurnstile";
import { CATALOG_API_GAP_NOTE, isValidRequestSchoolPayload } from "@/lib/request-school";

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

/**
 * Email hook for request-a-school. Does not write the university catalog.
 * See CATALOG_API_GAP_NOTE in lib/request-school.ts.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const check = await verifyTurnstile(body.turnstileToken, body.website_url, getClientIp(request));
    if (!check.ok) {
      return NextResponse.json({ error: "Verification failed" }, { status: 422 });
    }

    const parsed = isValidRequestSchoolPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : "student";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const submittedAt = new Date().toLocaleString();

    const { error: emailError } = await getResend().emails.send({
      from: "Bizzy <support@no-reply.bizzyu.com>",
      to: ["Contact@BizzyU.com"],
      subject: `School request: ${parsed.school}`,
      replyTo: parsed.email,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #05EB54, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Request a school</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">School</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(parsed.school)}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Name</td><td style="padding: 6px 0;">${escapeHtml(parsed.name)}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(parsed.email)}">${escapeHtml(parsed.email)}</a></td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Role</td><td style="padding: 6px 0;">${escapeHtml(role)}</td></tr>
            </table>
            ${notes ? `<p style="color: #374151; white-space: pre-wrap; margin: 16px 0 0;">${escapeHtml(notes)}</p>` : ""}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 13px; margin: 0;">
              ${escapeHtml(CATALOG_API_GAP_NOTE)} Submitted: ${submittedAt}
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
    }

    return NextResponse.json({ status: "sent" }, { status: 201 });
  } catch (error) {
    console.error("Request-school error:", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
