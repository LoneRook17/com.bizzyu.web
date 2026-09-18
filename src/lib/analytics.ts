/**
 * One place to fire a product event from the browser.
 *
 * The site has no analytics vendor wired in yet, so this hands the event to
 * whichever of the usual globals is present and is otherwise a no-op:
 *
 *   - Vercel Web Analytics   window.va("event", { name, data })
 *   - GA4 / gtag             window.gtag("event", name, data)
 *   - GTM data layer         window.dataLayer.push({ event: name, ...data })
 *
 * Adding a vendor means mounting its script in the root layout; nothing here
 * has to change. In development the event is logged so it can be seen firing.
 */

export type EventProps = Record<string, string | number | boolean | null | undefined>;

type AnalyticsWindow = Window & {
  va?: (kind: "event", payload: { name: string; data?: EventProps }) => void;
  gtag?: (kind: "event", name: string, params?: EventProps) => void;
  dataLayer?: unknown[];
};

export function track(name: string, data: EventProps = {}): void {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;
  try {
    if (typeof w.va === "function") w.va("event", { name, data });
    if (typeof w.gtag === "function") w.gtag("event", name, data);
    else if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: name, ...data });
  } catch {
    // Analytics must never break the page that fired it.
  }
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", name, data);
  }
}
