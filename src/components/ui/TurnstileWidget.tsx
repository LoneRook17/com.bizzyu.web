"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: Record<string, unknown>
      ) => string | undefined;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
  theme?: "light" | "dark" | "auto";
}

export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  className = "",
  theme = "auto",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const callbacks = useRef({ onVerify, onExpire, onError });
  callbacks.current = { onVerify, onExpire, onError };

  useEffect(() => {
    if (!scriptLoaded || !SITE_KEY || !containerRef.current || widgetIdRef.current) {
      return;
    }
    if (!window.turnstile) return;

    const id = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme,
      callback: (token: string) => callbacks.current.onVerify(token),
      "expired-callback": () => callbacks.current.onExpire?.(),
      "error-callback": () => callbacks.current.onError?.(),
    });

    widgetIdRef.current = id ?? null;

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget might already be gone if React fast-refreshed.
        }
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, theme]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} className={className} />
    </>
  );
}
