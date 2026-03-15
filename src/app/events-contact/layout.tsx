import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "List Events on Bizzy — Reach College Students",
  description:
    "Get your events in front of thousands of students. List events, sell tickets in-app, and accept payments at the door with Bizzy.",
  alternates: {
    canonical: "https://bizzyu.com/events-contact",
  },
  openGraph: {
    title: "List Events on Bizzy — Reach College Students",
    description:
      "Get your events in front of thousands of students. List events, sell tickets in-app, and accept payments at the door with Bizzy.",
  },
};

export default function EventsContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
