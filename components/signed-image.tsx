"use client";

import { useEffect, useRef } from "react";
import type { SignedLink } from "@/lib/types";
import { useSignedLink } from "./use-signed-link";

/**
 * A photo behind a signed link. If the link was refused (expired after Back, or before the
 * page hydrated), it renews the link once and swaps the src.
 */
export function SignedImage({
  link: initial,
  alt,
  className,
  fallback = null,
}: {
  link: SignedLink;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const { link, renew } = useSignedLink(initial);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // An error that happened before hydration never reaches onError: check once on mount.
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) void renew();
  }, [renew]);

  if (!link) return <>{fallback}</>;
  // A plain <img>: next/image would fetch the file server-side without the viewer's session.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={link.url} alt={alt} className={className} onError={() => void renew()} data-asset-id={link.assetId} />;
}
