import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * One place that registers GSAP plugins.
 *
 * registerPlugin is idempotent, but it must only run in the browser: importing
 * ScrollTrigger on the server touches window during module init. Every consumer
 * of this file is therefore "use client".
 *
 * GSAP 3.13+ is free for every plugin under Webflow's standard no-charge
 * licence, SplitText included. There is no account, key, or Club membership
 * involved, and nothing here phones home.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export { gsap, ScrollTrigger, SplitText };

/**
 * Honour prefers-reduced-motion for a whole effect.
 *
 * gsap.matchMedia() is the right tool rather than an `if`: it scopes every
 * tween and ScrollTrigger created inside the callback, and reverts them
 * automatically if the user flips the OS setting mid-session. The `reduced`
 * branch is deliberately left empty by callers, which means "render the final
 * state and do nothing", never "animate faster".
 */
export const REDUCED = "(prefers-reduced-motion: reduce)";
export const FULL = "(prefers-reduced-motion: no-preference)";
