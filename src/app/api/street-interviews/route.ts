import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyTurnstile, getClientIp } from "@/lib/verifyTurnstile";

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function POST(request: Request) {
  try {
    const { name, email, school, role, social, about, turnstileToken, website_url } =
      await request.json();

    const check = await verifyTurnstile(turnstileToken, website_url, getClientIp(request));
    if (!check.ok) {
      return NextResponse.json({ error: "Verification failed" }, { status: 422 });
    }

    if (!name || !email || !school || !role || !social) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const submittedAt = new Date().toLocaleString();

    const { error: emailError } = await getResend().emails.send({
      from: "Bizzy <support@no-reply.bizzyu.com>",
      to: ["Contact@BizzyU.com"],
      subject: `Street Interview Application: ${name} (${school})`,
      replyTo: email,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #05EB54, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">New Street Interview Application</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Name</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(name)}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">School</td><td style="padding: 6px 0;">${escapeHtml(school)}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Wants to</td><td style="padding: 6px 0;">${escapeHtml(role)}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Social</td><td style="padding: 6px 0;">${escapeHtml(social)}</td></tr>
            </table>

            ${
              about
                ? `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <h2 style="color: #111; margin: 0 0 12px; font-size: 16px;">About / links</h2>
            <p style="color: #374151; white-space: pre-wrap; margin: 0;">${escapeHtml(about)}</p>`
                : ""
            }

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 13px; margin: 0;">
              Submitted: ${submittedAt}
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json(
        { error: "Failed to send application" },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "sent" }, { status: 201 });
  } catch (error) {
    console.error("Street interview application error:", error);
    return NextResponse.json(
      { error: "Failed to send application" },
      { status: 500 }
    );
  }
}
