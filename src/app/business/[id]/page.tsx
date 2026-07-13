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
      // No customSchemeUrl: the shipped app has no bizzy://business scheme arm
      // (deep_link_service.dart only maps bizzy://venue and bizzy://deal), so
      // "Open in App" uses the universal link. Wiring a real business scheme is
      // an app-side change tracked separately — do NOT point this at
      // bizzy://business (dead link) or bizzy://venue (id-space mismatch).
    />
  );
}
