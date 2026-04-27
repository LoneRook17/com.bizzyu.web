import type { Metadata } from "next";
import AppInterstitial from "@/components/deeplink/AppInterstitial";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const title = "Event on Bizzy";
  const description =
    "View this event and grab tickets on Bizzy — the student app for campus events and deals.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://bizzyu.com/e/${id}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function EventInterstitialPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppInterstitial
      title="Opening event…"
      deepLinkUrl={`https://bizzyu.com/e/${id}`}
      customSchemeUrl={`bizzy://event/${id}`}
    />
  );
}
