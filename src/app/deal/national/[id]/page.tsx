import type { Metadata } from "next";
import AppInterstitial from "@/components/deeplink/AppInterstitial";

interface PageProps {
  params: Promise<{ id: string }>;
}

// National deal share landing. Twin of /deal/[id] (local deals) — the app
// shares `bizzyu.com/deal/national/:id` so the link rides the existing
// `/deal/*` Universal Link claim and never collides with a local deal id.
// Same tap-only interstitial: universal link opens the app when installed;
// "Open in App" fires bizzy://deal/national/:id (deep_link_service.dart
// `deal` arm); everyone else gets the App Store.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const title = "Student deal on Bizzy";
  const description =
    "Claim this national student discount on Bizzy: streaming, food delivery, tech, fashion and more, verified for students.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://bizzyu.com/deal/national/${id}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function NationalDealInterstitialPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppInterstitial
      title="Open this student deal in Bizzy"
      deepLinkUrl={`https://bizzyu.com/deal/national/${id}`}
      customSchemeUrl={`bizzy://deal/national/${id}`}
    />
  );
}
