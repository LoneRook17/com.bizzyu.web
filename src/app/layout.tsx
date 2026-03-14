import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/seo/JsonLd";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bizzyu.com"),
  title: {
    default: "Bizzy — College Deals, Events & Experiences",
    template: "%s | Bizzy",
  },
  description:
    "Discover exclusive deals, events, and experiences near your campus. Bizzy connects college students with the best local spots and helps businesses reach the college crowd.",
  keywords: [
    "college deals",
    "student discounts",
    "campus events",
    "local deals",
    "college app",
    "student savings",
    "Bizzy",
    "college food deals",
    "student entertainment",
    "campus life",
    "BOGO deals near me",
    "college bar specials",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Bizzy",
    title: "Bizzy — Live College For Less",
    description:
      "Exclusive deals, events, and experiences near your campus. One app for everything worth doing in college.",
    images: [
      {
        url: "/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "Bizzy — College Deals, Events & Experiences",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bizzy — Live College For Less",
    description:
      "Exclusive deals, events, and experiences near your campus. One app for everything worth doing in college.",
    images: ["/images/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Bizzy",
  url: "https://bizzyu.com",
  logo: "https://bizzyu.com/images/bizzy-logo.png",
  sameAs: [
    "https://instagram.com/Bizzy.University",
    "https://tiktok.com/@BizzyUniversity",
  ],
  description:
    "Bizzy connects college students to the best local deals, events, and spots around campus while helping nearby businesses reach the college crowd.",
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Bizzy: College Deals & Events",
  operatingSystem: "iOS",
  applicationCategory: "LifestyleApplication",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  url: "https://apps.apple.com/us/app/bizzy-college-deals-events/id6683306360",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={appJsonLd} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
