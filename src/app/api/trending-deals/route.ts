import { NextResponse } from "next/server";

const SCHOOLS = ["FGCU", "UGA", "ASU", "USF", "Southern"];
const API_URL = "https://bizzy-deals.com/api/home_deals";

interface RawDeal {
  id: number;
  deal_title: string;
  description: string;
  deal_category: string;
  deal_type: string;
  tag_name: string;
  university_name: string;
  business_name: string;
  total_saving: number;
  deal_image_path: string;
  is_active: number;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      SCHOOLS.map(async (school) => {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ university: school }),
          next: { revalidate: 300 }, // cache 5 min
        });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data?.top10_Deals ?? []) as RawDeal[];
      })
    );

    const allDeals = results
      .filter(
        (r): r is PromiseFulfilledResult<RawDeal[]> => r.status === "fulfilled"
      )
      .flatMap((r) => r.value)
      .filter((d) => d.is_active === 1);

    // Shuffle so schools are mixed
    for (let i = allDeals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allDeals[i], allDeals[j]] = [allDeals[j], allDeals[i]];
    }

    const deals = allDeals.map((d) => ({
      id: d.id,
      title: d.description,
      business: d.business_name,
      school: d.university_name,
      savings: d.total_saving,
      image: d.deal_image_path,
      category: d.deal_category,
      tag: d.tag_name,
    }));

    return NextResponse.json({ deals }, { status: 200 });
  } catch {
    return NextResponse.json({ deals: [] }, { status: 500 });
  }
}
