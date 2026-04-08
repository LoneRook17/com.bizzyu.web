import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("biz_session_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const db = getDb();

    // Find session
    const [sessions] = await db.query(
      `SELECT s.business_id, s.expires_at
       FROM business_sessions s
       WHERE s.session_token = ? AND s.expires_at > NOW()`,
      [token]
    );
    const session = (sessions as any[])[0];

    if (!session) {
      return NextResponse.json({ message: "Session expired" }, { status: 401 });
    }

    // Get business + profile
    const [businesses] = await db.query(
      `SELECT b.id AS business_id, b.name, b.email, b.status, b.logo_url,
              p.contact_name, p.phone, p.campus_id, p.address,
              p.website, p.instagram, p.description,
              p.stripe_connect_onboarded, p.logo_image_url
       FROM businesses b
       LEFT JOIN business_profiles p ON p.business_id = b.id
       WHERE b.id = ?`,
      [session.business_id]
    );
    const business = (businesses as any[])[0];

    if (!business) {
      return NextResponse.json({ message: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({
      business: {
        business_id: business.business_id,
        name: business.name,
        email: business.email,
        status: business.status,
        logo_url: business.logo_url || business.logo_image_url,
      },
      profile: {
        contact_name: business.contact_name,
        phone: business.phone,
        campus_id: business.campus_id,
        address: business.address,
        website: business.website,
        instagram: business.instagram,
        description: business.description,
        logo_image_url: business.logo_image_url || business.logo_url,
        stripe_connect_onboarded: !!business.stripe_connect_onboarded,
      },
    });
  } catch (err: any) {
    console.error("Me error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
