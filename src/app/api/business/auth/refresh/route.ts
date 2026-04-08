import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("biz_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "No refresh token" }, { status: 401 });
    }

    const db = getDb();

    // Find session by refresh token
    const [sessions] = await db.query(
      "SELECT * FROM business_sessions WHERE refresh_token = ?",
      [refreshToken]
    );
    const session = (sessions as any[])[0];

    if (!session) {
      return NextResponse.json({ message: "Invalid refresh token" }, { status: 401 });
    }

    // Generate new tokens
    const newSessionToken = crypto.randomBytes(48).toString("hex");
    const newRefreshToken = crypto.randomBytes(48).toString("hex");
    const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update session
    await db.query(
      `UPDATE business_sessions
       SET session_token = ?, refresh_token = ?, expires_at = ?
       WHERE id = ?`,
      [newSessionToken, newRefreshToken, newExpires, session.id]
    );

    const response = NextResponse.json({ message: "Token refreshed" });

    response.cookies.set("biz_session_token", newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set("biz_refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.set("biz_session", "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error("Refresh error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
