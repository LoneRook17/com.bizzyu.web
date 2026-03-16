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
