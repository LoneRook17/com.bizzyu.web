import type { Metadata } from "next";
import AppInterstitial from "@/components/deeplink/AppInterstitial";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const title = "Deal on Bizzy";
  const description =
    "Claim this exclusive student deal on Bizzy: discounts at local restaurants, bars, and shops near campus.";
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
      title="Open this deal in Bizzy"
      deepLinkUrl={`https://bizzyu.com/deal/${id}`}
      // The "Open in App" button prefers this custom scheme. It's the ONLY thing
      // that opens the app when the user arrives from a same-domain tap (e.g. the
      // venue page on bizzyu.com), where a Universal Link is suppressed. The
      // scheme fires only on an explicit "Open in App" tap — never automatically
      // — so non-app users never hit Safari's "address is invalid" error.
      customSchemeUrl={`bizzy://deal/${id}`}
    />
  );
}
