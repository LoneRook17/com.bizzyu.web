import { NextResponse } from "next/server";
import { Resend } from "resend";

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

const ADMIN_RECIPIENTS = [
  "cooper.aiello@gmail.com",
  "evanmillionis@gmail.com",
  "admin@bizzy.university",
];

interface NotifyPayload {
  type: "deal" | "event";
  title: string;
  business?: string;
  venue?: string;
  university?: string;
  createdBy?: string; // email of the user who created it
  id?: number | string;
  details?: Record<string, string | number | boolean | null | undefined>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotifyPayload;
    const { type, title, business, venue, university, createdBy, id, details } =
      body;

    if (!type || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const label = type === "deal" ? "Deal" : "Event";
    const submittedAt = new Date().toLocaleString();

    const detailRows = details
      ? Object.entries(details)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(
            ([k, v]) =>
              `<tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">${escapeHtml(
                k
              )}</td><td style="padding: 6px 0;">${escapeHtml(String(v))}</td></tr>`
          )
          .join("")
      : "";

    const { error: emailError } = await getResend().emails.send({
      from: "Bizzy <support@no-reply.bizzyu.com>",
      to: ADMIN_RECIPIENTS,
      subject: `New ${label}: ${title}${business ? ` — ${business}` : ""}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #05EB54, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">New ${label} Created</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">${label}</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(title)}</td></tr>
              ${business ? `<tr><td style="padding: 6px 0; color: #6b7280;">Business</td><td style="padding: 6px 0;">${escapeHtml(business)}</td></tr>` : ""}
              ${venue ? `<tr><td style="padding: 6px 0; color: #6b7280;">Venue</td><td style="padding: 6px 0;">${escapeHtml(venue)}</td></tr>` : ""}
              ${university ? `<tr><td style="padding: 6px 0; color: #6b7280;">Campus</td><td style="padding: 6px 0;">${escapeHtml(university)}</td></tr>` : ""}
              ${createdBy ? `<tr><td style="padding: 6px 0; color: #6b7280;">Created by</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(createdBy)}">${escapeHtml(createdBy)}</a></td></tr>` : ""}
              ${id ? `<tr><td style="padding: 6px 0; color: #6b7280;">ID</td><td style="padding: 6px 0;">${escapeHtml(String(id))}</td></tr>` : ""}
              ${detailRows}
              <tr><td style="padding: 6px 0; color: #6b7280;">Submitted</td><td style="padding: 6px 0;">${submittedAt}</td></tr>
            </table>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("Admin notify Resend error:", emailError);
      return NextResponse.json(
        { error: "Failed to send notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "sent" }, { status: 201 });
  } catch (error) {
    console.error("Admin notify error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
