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
      title="Opening deal…"
      deepLinkUrl={`https://bizzyu.com/deal/${id}`}
      // The "Open in App" button prefers this custom scheme. It's the ONLY thing
      // that opens the app when the user arrives from a same-domain tap (e.g. the
      // venue page on bizzyu.com), where a Universal Link is suppressed. Non-app
      // users never reach this via a scheme automatically — the page shows the
      // App Store CTA and auto-redirects there — so the raw scheme only fires on
      // an explicit "Open in App" tap.
      customSchemeUrl={`bizzy://deal/${id}`}
    />
  );
}
