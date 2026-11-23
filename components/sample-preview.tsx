"use client";

import { useEffect, useRef } from "react";
import type { SignedLink } from "@/lib/types";
import { useSignedLink } from "./use-signed-link";

/** A short, silent preview of a sample clip. Still for viewers who prefer reduced motion. */
export function SamplePreview({ link: initial, label, className }: { link: SignedLink; label: string; className?: string }) {
  const { link, renew } = useSignedLink(initial);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (video.error) void renew();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) void video.play().catch(() => {});
  }, [renew]);

  if (!link) return <div className={className} />;
  return (
    <video
      ref={ref}
      src={link.url}
      aria-label={label}
      className={className}
      disablePictureInPicture
      onContextMenu={(event) => event.preventDefault()}
      muted
      loop
      playsInline
      preload="auto"
      onError={() => void renew()}
    />
  );
}
