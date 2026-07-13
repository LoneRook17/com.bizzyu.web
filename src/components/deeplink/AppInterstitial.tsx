"use client";

import Image from "next/image";
import { APP_STORE_URL } from "@/lib/constants";

type Props = {
  title: string;
  subtitle?: string;
  /** The universal-link URL the user originally tapped. Used by the "Open in App" button. */
  deepLinkUrl: string;
  /** Optional bizzy:// custom-scheme variant - preferred for the "Open in App" button when available. */
  customSchemeUrl?: string;
};

export default function AppInterstitial({
  title,
  subtitle,
  deepLinkUrl,
  customSchemeUrl,
}: Props) {
  // The "Open in App" button prefers the bizzy:// custom scheme when the
  // consumer supplies one, otherwise it falls back to the universal link.
  const openInApp = customSchemeUrl ?? deepLinkUrl;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A] px-6 text-white">
      <div className="flex flex-col items-center gap-6 text-center">
        <Image
          src="/images/appicon.png"
          alt="Bizzy"
          width={96}
          height={96}
          priority
          className="rounded-2xl shadow-[0_0_60px_rgba(5,235,84,0.25)]"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-white/70">
            {subtitle ?? "Tap below to open it in the app."}
          </p>
        </div>
        <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
          {/*
            Tap-only by design. We deliberately do NOT auto-fire the bizzy://
            scheme on load: on a device WITHOUT the app, navigating to a custom
            scheme throws Safari's "address is invalid" error - that was the
            original bug this page exists to avoid. Firing the scheme only on an
            explicit tap means non-app users never hit that error; they read the
            page and choose "Download Bizzy" instead. Do not "helpfully" automate
            this with a setTimeout/redirect - that reintroduces the error.
          */}
          <a
            href={openInApp}
            className="rounded-full bg-[#05EB54] px-6 py-3 text-center text-sm font-semibold text-black transition hover:brightness-110"
          >
            Open in App
          </a>
          <a
            href={APP_STORE_URL}
            className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Download Bizzy
          </a>
        </div>
      </div>
    </div>
  );
}
