import type { Metadata } from "next";
import AppInterstitial from "@/components/deeplink/AppInterstitial";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const title = "Business on Bizzy";
  const description =
    "View this business and its deals on Bizzy, the student app for campus deals and events.";
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
      title="Open this business in Bizzy"
      deepLinkUrl={`https://bizzyu.com/business/${id}`}
      // Requires app >= 4.2.5(9): the bizzy://business arm is added to
      // deep_link_service.dart in the same release. Without the custom scheme,
      // "Open in App" would fall back to the same-domain universal link, which
      // iOS suppresses (we're already on bizzyu.com) — that just re-navigates to
      // this interstitial and loops. Mirrors the /deal page's custom scheme.
      customSchemeUrl={`bizzy://business/${id}`}
    />
  );
}
