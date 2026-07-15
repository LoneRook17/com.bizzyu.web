import { NextResponse } from "next/server";
import { fetchTrendingDeals } from "@/lib/deals";

export async function GET() {
  try {
    const deals = await fetchTrendingDeals();
    return NextResponse.json({ deals }, { status: 200 });
  } catch {
    return NextResponse.json({ deals: [] }, { status: 500 });
  }
}
