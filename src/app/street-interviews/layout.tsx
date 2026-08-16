import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Paid for Street Interviews",
  description:
    "Film street interviews on your campus for Bizzy and get paid. $100 per interview, $150 if you edit it too. Apply in under a minute.",
  alternates: {
    canonical: "https://bizzyu.com/street-interviews",
  },
  openGraph: {
    title: "Get Paid for Street Interviews",
    description:
      "Film street interviews on your campus for Bizzy and get paid. $100 per interview, $150 if you edit it too. Apply in under a minute.",
  },
};

export default function StreetInterviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
