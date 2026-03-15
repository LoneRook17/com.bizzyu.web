import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Bizzy",
  description:
    "Get in touch with the Bizzy team. Questions about student deals, business partnerships, or campus expansion? We'd love to hear from you.",
  alternates: {
    canonical: "https://bizzyu.com/contact",
  },
  openGraph: {
    title: "Contact Bizzy",
    description:
      "Get in touch with the Bizzy team. Questions about student deals, business partnerships, or campus expansion? We'd love to hear from you.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
