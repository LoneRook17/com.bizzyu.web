import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Find business by email
    const [rows] = await db.query(
      "SELECT * FROM businesses WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    const business = (rows as any[])[0];

    if (!business) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const valid = await bcrypt.compare(password, business.password_hash);
    if (!valid) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (business.status === "pending_verification") {
      return NextResponse.json(
        { message: "Please verify your email before logging in" },
        { status: 403 }
      );
    }

    // Generate session token
    const session_token = crypto.randomBytes(48).toString("hex");
    const refresh_token = crypto.randomBytes(48).toString("hex");
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store session
    await db.query(
      `INSERT INTO business_sessions (
        business_id, session_token, refresh_token, expires_at, created_at
      ) VALUES (?, ?, ?, ?, NOW())`,
      [business.id, session_token, refresh_token, expires_at]
    );

    // Build response
    const response = NextResponse.json({
      message: "Login successful",
      business: {
        business_id: business.id,
        name: business.name,
        email: business.email,
        status: business.status,
        logo_url: business.logo_url,
      },
    });

    // Set session cookie
    response.cookies.set("biz_session_token", session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    response.cookies.set("biz_refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set the UI-level cookie the middleware checks
    response.cookies.set("biz_session", "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
