import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      business_name,
      contact_name,
      phone,
      campus_id,
      address,
      website,
      instagram,
      description,
    } = body;

    if (!email || !password || !business_name || !contact_name || !campus_id) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if email already exists
    const [existing] = await db.query(
      "SELECT id FROM businesses WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Generate email verification token
    const verification_token = crypto.randomBytes(32).toString("hex");
    const verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create the business
    const [result] = await db.query(
      `INSERT INTO businesses (
        name, email, password_hash, status,
        verification_token, verification_token_expires_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'pending_verification', ?, ?, NOW(), NOW())`,
      [
        business_name.trim(),
        email.toLowerCase().trim(),
        password_hash,
        verification_token,
        verification_expires,
      ]
    );

    const businessId = (result as any).insertId;

    // Create the business profile
    await db.query(
      `INSERT INTO business_profiles (
        business_id, contact_name, phone, campus_id,
        address, website, instagram, description,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        businessId,
        contact_name.trim(),
        phone || null,
        campus_id,
        address || null,
        website || null,
        instagram || null,
        description || null,
      ]
    );

    // TODO: Send verification email via Resend

    return NextResponse.json(
      { message: "Account created. Please verify your email.", business_id: businessId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
