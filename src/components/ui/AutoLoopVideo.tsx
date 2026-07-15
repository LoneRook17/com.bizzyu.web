"use client";

import { useEffect, useRef } from "react";

interface AutoLoopVideoProps {
  src: string;
  poster: string;
  /** Describes the footage for screen readers. The video is silent, so this
      carries its meaning. */
  label: string;
  className?: string;
}

/**
 * Silent, looping background video that respects prefers-reduced-motion and
 * only plays while it is actually on screen.
 *
 * The `autoplay` ATTRIBUTE is deliberately omitted. Markup can't ask about
 * motion preference, and CSS can't stop a video, so autoplay is started from
 * JS instead, after we've checked. Users who asked for reduced motion get the
 * poster frame and nothing moves. Everyone else gets the loop.
 *
 * Playback is gated on an IntersectionObserver, and `preload="none"` means the
 * file is not fetched until then. Without that, a below-the-fold clip
 * downloads in full on mount for every visitor, most of whom never scroll to
 * it (bizzy-event-night.mp4 is ~10 MB).
 *
 * Rendering the same <video> on server and client (rather than swapping an
 * <img> for a <video> on mount) avoids both a hydration mismatch and a visible
 * jump from the poster frame to frame 0.
 */
export default function AutoLoopVideo({ src, poster, label, className = "" }: AutoLoopVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false;

    const apply = () => {
      if (mq.matches || !onScreen) {
        video.pause();
        return;
      }
      // Can reject on autoplay policy or if the tab is backgrounded. The
      // poster stays up, which is a fine outcome, so swallow it.
      void video.play().catch(() => {});
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        apply();
      },
      { threshold: 0.25 },
    );
    io.observe(video);
    mq.addEventListener("change", apply);

    return () => {
      io.disconnect();
      mq.removeEventListener("change", apply);
    };
  }, []);

  return (
    <video
      ref={ref}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      role="img"
      aria-label={label}
      className={className}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
