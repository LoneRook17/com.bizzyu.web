import { NextResponse } from "next/server";
import { Resend } from "resend";

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: Request) {
  try {
    const { name, email, type, message } = await request.json();

    if (!name || !email || !type || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const submittedAt = new Date().toLocaleString();

    const { error: emailError } = await getResend().emails.send({
      from: "Bizzy <support@no-reply.bizzyu.com>",
      to: ["Contact@BizzyU.com"],
      subject: `New Contact Form: ${name} (${type})`,
      replyTo: email,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #05EB54, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">New Contact Message</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #6b7280; width: 120px;">Name</td><td style="padding: 6px 0; font-weight: 600;">${name}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Type</td><td style="padding: 6px 0;">${type}</td></tr>
            </table>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

            <h2 style="color: #111; margin: 0 0 12px; font-size: 16px;">Message</h2>
            <p style="color: #374151; white-space: pre-wrap; margin: 0;">${message}</p>

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
