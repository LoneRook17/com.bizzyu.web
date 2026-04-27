import type { Metadata } from "next";
import AppInterstitial from "@/components/deeplink/AppInterstitial";

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000";

interface PageProps {
  params: Promise<{ id: string }>;
}

type EventData = {
  name?: string | null;
  description?: string | null;
  cover_photo_url?: string | null;
  banner_image_url?: string | null;
};

async function fetchEvent(id: string): Promise<EventData | null> {
  if (!/^\d+$/.test(id)) return null;
  try {
    const res = await fetch(`${API_URL}/ui/events/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as EventData;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await fetchEvent(id);
  const name = event?.name?.trim();
  const title = name ? `${name} on Bizzy` : "Event on Bizzy";
  const description =
    event?.description?.trim() ||
    "Get tickets and details on Bizzy — the student app for campus events and deals.";
  const image = event?.cover_photo_url || event?.banner_image_url || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://bizzyu.com/event/${id}`,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function EventInterstitialPage({ params }: PageProps) {
  const { id } = await params;
  const event = await fetchEvent(id);
  const name = event?.name?.trim();

  return (
    <AppInterstitial
      title={name ?? "Opening event…"}
      subtitle={name ? "Opening in Bizzy…" : undefined}
      deepLinkUrl={`https://bizzyu.com/event/${id}`}
      customSchemeUrl={`bizzy://event/${id}`}
    />
  );
}
