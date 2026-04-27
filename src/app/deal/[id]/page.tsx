import type { Metadata } from "next";
import AppInterstitial from "@/components/deeplink/AppInterstitial";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const title = "Deal on Bizzy";
  const description =
    "Claim this exclusive student deal on Bizzy — discounts at local restaurants, bars, and shops near campus.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://bizzyu.com/deal/${id}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function DealInterstitialPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppInterstitial
      title="Opening deal…"
      deepLinkUrl={`https://bizzyu.com/deal/${id}`}
    />
  );
}
