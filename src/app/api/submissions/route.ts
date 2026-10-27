import { NextResponse } from "next/server";
import { Resend } from "resend";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  FORWARD_SAVE_ERROR,
  dealSubmissionsForwardHeaders,
  dealSubmissionsForwardOrigin,
  dealSubmissionsSecret,
  forwardFailureLog,
  submissionEmailSubject,
} from "@/lib/deal-submission-forward";
import { verifyTurnstile, getClientIp } from "@/lib/verifyTurnstile";
import { parseSubmission } from "@/lib/public-forms/validate";
import { buildSubmissionEmail } from "@/lib/public-forms/emails";

const getResend = () => new Resend(process.env.RESEND_API_KEY!);

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function uploadBase64ToS3(base64: string, folder: string): Promise<string> {
  const match = base64.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return "";
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bucket = process.env.AWS_BUCKET || "bizzy-dev";

  // No ACL: the bucket uses Object Ownership "BucketOwnerEnforced", which
  // rejects any request carrying an ACL (AccessControlListNotSupported).
  // Public read is granted by the bucket's PublicReadGetObject policy instead.
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: `image/${match[1]}`,
  }));

  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

/**
 * Deal submission from the public signup flow → Laravel + Partnerships email.
 *
 * Audit F30: the body is reduced to the known business / deal / media keys
 * (lib/public-forms/validate.ts — trimmed, capped, email checked → 422,
 * unknown keys dropped) BEFORE it is forwarded to Laravel or rendered, and
 * every field in the email is HTML-escaped (lib/public-forms/emails.ts).
 * Turnstile + honeypot unchanged.
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

    const parsed = parseSubmission(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const { business, deal, media } = parsed.data;

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const submittedAt = new Date().toLocaleString();

    // Parse base64 image into attachment if provided
    const attachments: { filename: string; content: Buffer }[] = [];
    if (media.dealImageUrl.startsWith("data:")) {
      const match = media.dealImageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === "jpeg" ? "jpg" : match[1];
        attachments.push({
          filename: `deal-image.${ext}`,
          content: Buffer.from(match[2], "base64"),
        });
      }
    }

    // Save to Laravel before emailing, so a failed forward can change the
    // subject. The notification still goes out either way.
    // Host is https://bizzy-deals.com unless DEAL_SUBMISSIONS_API_URL is set.
    // The shared admin-host env var is not read here. TrustHosts 404s any other host.
    // Audit A03: Laravel gates this hop on X-Deal-Submissions-Secret. With
    // DEAL_SUBMISSIONS_SECRET unset we do NOT call Laravel unauthenticated and
    // skip the S3 uploads too: the save is marked failed (502 to the browser,
    // "[NOT SAVED]" email to the team) rather than leaving the hole open.
    const origin = dealSubmissionsForwardOrigin(process.env.DEAL_SUBMISSIONS_API_URL);
    const secret = dealSubmissionsSecret(process.env.DEAL_SUBMISSIONS_SECRET);
    let forwardFailed = false;
    if (!secret) {
      forwardFailed = true;
      console.error(
        "Deal submission forward skipped",
        forwardFailureLog(0, "DEAL_SUBMISSIONS_SECRET not configured"),
      );
    } else {
      let dealImageUrl = "";
      let logoUrl = "";

      // Try S3 upload, but don't let it block the forward
      try {
        if (media.dealImageUrl.startsWith("data:")) {
          dealImageUrl = await uploadBase64ToS3(media.dealImageUrl, "deal-submissions/images");
        } else if (media.dealImageUrl) {
          dealImageUrl = media.dealImageUrl;
        }
      } catch (s3Error) {
        console.error("S3 image upload failed:", s3Error);
      }

      try {
        if (media.logoUrl.startsWith("data:")) {
          logoUrl = await uploadBase64ToS3(media.logoUrl, "deal-submissions/logos");
        } else if (media.logoUrl) {
          logoUrl = media.logoUrl;
        }
      } catch (s3Error) {
        console.error("S3 logo upload failed:", s3Error);
      }

      try {
        const forwardRes = await fetch(`${origin}/api/deal-submissions`, {
          method: "POST",
          headers: dealSubmissionsForwardHeaders(secret),
          body: JSON.stringify({ business, deal, media: { dealImageUrl, logoUrl } }),
        });
        if (!forwardRes.ok) {
          forwardFailed = true;
          const text = await forwardRes.text();
          console.error("Deal submission forward failed", forwardFailureLog(forwardRes.status, text));
        } else {
          console.log("Forward status:", forwardRes.status);
        }
      } catch (forwardError) {
        forwardFailed = true;
        const message = forwardError instanceof Error ? forwardError.message : "Forward request failed";
        console.error("Deal submission forward failed", forwardFailureLog(0, message));
      }
    }

    // Notification email. A mail failure must not hide a successful save, and
    // a failed save must still notify the team.
    try {
      const { error: emailError } = await getResend().emails.send({
        from: "Bizzy <support@no-reply.bizzyu.com>",
        to: ["Partnerships@BizzyU.com", "EvanMilionis@gmail.com"],
        subject: submissionEmailSubject(forwardFailed, deal.title, business.businessName),
        attachments,
        ...buildSubmissionEmail({
          data: parsed.data,
          forwardFailed,
          hasAttachment: attachments.length > 0,
          submissionId,
          submittedAt,
        }),
      });

      if (emailError) {
        console.error("Resend error:", emailError);
      }
    } catch (emailErr) {
      console.error("Resend error:", emailErr);
    }

    if (forwardFailed) {
      return NextResponse.json({ error: FORWARD_SAVE_ERROR }, { status: 502 });
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
