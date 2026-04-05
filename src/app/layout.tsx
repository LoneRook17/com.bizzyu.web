import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LayoutShell from "@/components/layout/LayoutShell";
import JsonLd from "@/components/seo/JsonLd";
import { APP_STORE_URL } from "@/lib/constants";
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
    default: "Bizzy — Student Deals & Discounts at Your College Campus",
    template: "%s | Bizzy",
  },
  description:
    "Bizzy is the #1 student deals app. Get exclusive discounts at local restaurants, bars, and shops near your college campus.",
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
    title: "Bizzy — Student Deals & Discounts at Your College Campus",
    description:
      "Bizzy is the #1 student deals app. Get exclusive discounts at local restaurants, bars, and shops near your college campus.",
    images: [
      {
        url: "/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "Bizzy — Student Deals & Discounts at Your College Campus",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bizzy — Student Deals & Discounts at Your College Campus",
    description:
      "Bizzy is the #1 student deals app. Get exclusive discounts at local restaurants, bars, and shops near your college campus.",
    images: ["/images/og-default.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
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
  description:
    "The #1 student deals app for college campuses. Exclusive local discounts at restaurants, bars, and shops.",
  sameAs: [
    "https://www.instagram.com/bizzy.fgcu/",
    "https://instagram.com/Bizzy.University",
    "https://tiktok.com/@bizzyapp",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "Admin@bizzy.university",
  },
  founder: {
    "@type": "Person",
    name: "Cooper Aiello",
  },
  foundingDate: "2024",
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "Bizzy",
  operatingSystem: "iOS",
  applicationCategory: "LifestyleApplication",
  description:
    "Student deals app for college campuses. Exclusive discounts at local restaurants, bars, and shops.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "350",
    bestRating: "5",
  },
  downloadUrl: APP_STORE_URL,
  screenshot: [
    "https://bizzyu.com/images/screens/1.png",
    "https://bizzyu.com/images/screens/2.png",
  ],
  author: {
    "@type": "Organization",
    name: "Bizzy Deals LLC",
  },
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
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
