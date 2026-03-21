import { NextResponse } from "next/server";
import { Resend } from "resend";

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { business, deal, media } = body;

    if (!business?.businessName || !business?.email || !deal?.title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const submittedAt = new Date().toLocaleString();

    // Parse base64 image into attachment if provided
    const attachments: { filename: string; content: Buffer }[] = [];
    if (media?.dealImageUrl?.startsWith("data:")) {
      const match = media.dealImageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === "jpeg" ? "jpg" : match[1];
        attachments.push({
          filename: `deal-image.${ext}`,
          content: Buffer.from(match[2], "base64"),
        });
      }
    }

    // Send notification email
    const { error: emailError } = await getResend().emails.send({
      from: "Bizzy <support@no-reply.bizzyu.com>",
      to: ["Partnerships@BizzyU.com"],
      subject: `New Deal Submission: ${deal.title} — ${business.businessName}`,
      attachments,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #05EB54, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">New Deal Submission</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #111; margin: 0 0 16px;">Business Info</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Business Name</td><td style="padding: 6px 0; font-weight: 600;">${business.businessName}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Contact Name</td><td style="padding: 6px 0;">${business.contactName || "—"}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;"><a href="mailto:${business.email}">${business.email}</a></td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Phone</td><td style="padding: 6px 0;">${business.phone || "—"}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Address</td><td style="padding: 6px 0;">${business.address || "—"}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Campus</td><td style="padding: 6px 0;">${business.campus || "—"}</td></tr>
            </table>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

            <h2 style="color: #111; margin: 0 0 16px;">Deal Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Deal Title</td><td style="padding: 6px 0; font-weight: 600;">${deal.title}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Description</td><td style="padding: 6px 0;">${deal.description || "—"}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Estimated Savings</td><td style="padding: 6px 0; color: #05EB54; font-weight: 700;">${deal.estimatedSavings || "—"}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Redemption</td><td style="padding: 6px 0;">${deal.redemptionFrequency || "—"}${deal.limitedSupplyCount ? ` (${deal.limitedSupplyCount} available)` : ""}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Start Date</td><td style="padding: 6px 0;">${deal.startDate || "Immediately"}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">End Date</td><td style="padding: 6px 0;">${deal.endDate || "Ongoing"}</td></tr>
            </table>

            ${attachments.length > 0 ? `
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 13px; font-style: italic;">Deal image attached.</p>
            ` : ""}

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 13px; margin: 0;">
              Submission ID: ${submissionId}<br/>
              Submitted: ${submittedAt}
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
    }

    // Forward submission to the live admin panel backend (without base64 images to keep payload small)
    const adminApiUrl = process.env.ADMIN_API_URL;
    if (adminApiUrl) {
      try {
        const lightMedia = {
          logoUrl: media?.logoUrl && !media.logoUrl.startsWith("data:") ? media.logoUrl : "",
          dealImageUrl: media?.dealImageUrl && !media.dealImageUrl.startsWith("data:") ? media.dealImageUrl : "",
        };
        const forwardRes = await fetch(`${adminApiUrl}/api/deal-submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business, deal, media: lightMedia }),
        });
        console.log("Forward status:", forwardRes.status);
      } catch (forwardError) {
        console.error("Failed to forward to admin API:", forwardError);
      }
    }

    return NextResponse.json({ id: submissionId, status: "submitted" }, { status: 201 });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
