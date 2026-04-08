import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("biz_session_token")?.value;

    if (token) {
      const db = getDb();
      await db.query("DELETE FROM business_sessions WHERE session_token = ?", [token]);
    }

    const response = NextResponse.json({ message: "Logged out" });

    response.cookies.set("biz_session_token", "", { maxAge: 0, path: "/" });
    response.cookies.set("biz_refresh_token", "", { maxAge: 0, path: "/" });
    response.cookies.set("biz_session", "", { maxAge: 0, path: "/" });

    return response;
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
