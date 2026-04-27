import type { Metadata } from "next";
import AppInterstitial from "@/components/deeplink/AppInterstitial";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const title = "Business on Bizzy";
  const description =
    "View this business and its deals on Bizzy — the student app for campus deals and events.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://bizzyu.com/business/${id}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function BusinessInterstitialPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppInterstitial
      title="Opening business…"
      deepLinkUrl={`https://bizzyu.com/business/${id}`}
    />
  );
}
