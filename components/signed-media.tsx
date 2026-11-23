"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SignedLink } from "@/lib/types";
import { MediaPlaceholder } from "./media-placeholder";
import { useSignedLink } from "./use-signed-link";

const SecurityDetailsContext = createContext(false);

/** Hides the signed-link details on member pages until the viewer asks for them. */
export function SecurityDetails({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <SecurityDetailsContext.Provider value={shown}>
      {children}
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        className="inline-flex items-center gap-1.5 self-start rounded-md px-1 py-0.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        data-testid="security-details"
      >
        <KeyRound className="size-3.5" aria-hidden />
        {shown ? "Hide security details" : "Show security details"}
      </button>
    </SecurityDetailsContext.Provider>
  );
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface Props {
  link: SignedLink;
  alt: string;
  /** "always": countdown and copy shown; "toggle": shown after "Show security details"; "never". */
  controls?: "always" | "toggle" | "never";
  /** Play the silent clip on its own, as a moderator would watch it, unless the viewer prefers reduced motion. */
  autoPlay?: boolean;
  className?: string;
}

/**
 * Renders a photo or video from a 60-second signed link. The countdown and the copy
 * button let a reviewer paste the link elsewhere and watch it stop working.
 */
export function SignedMedia({ link: initial, alt, controls = "always", autoPlay = false, className }: Props) {
  const { link, renew, renewing, expired: isExpired } = useSignedLink(initial);
  const detailsShown = useContext(SecurityDetailsContext);
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Back or Forward can restore a page whose links have already expired: renew them at once.
    if (isExpired()) void renew();
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) void renew();
    const video = videoRef.current;
    if (video && autoPlay && !prefersReducedMotion()) void video.play().catch(() => {});
    // Only on mount: later renewals are driven by errors and the "New link" button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = link && now !== null ? Math.min(60, Math.max(0, link.exp - Math.floor(now / 1000))) : null;
  const expired = remaining === 0;
  const showControls = controls === "always" || (controls === "toggle" && detailsShown);

  async function renewAndResume(manual = false) {
    const resumeAt = videoRef.current?.currentTime;
    const next = await renew(manual);
    const video = videoRef.current;
    if (next && video && resumeAt !== undefined) {
      video.addEventListener("loadedmetadata", () => (video.currentTime = resumeAt), { once: true });
    }
  }

  async function copy() {
    if (!link || expired) return;
    await navigator.clipboard.writeText(new URL(link.url, window.location.origin).toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!link) return <MediaPlaceholder kind={initial.kind} reason="ended" className={className} />;

  return (
    <figure className={cn("flex flex-col gap-2", className)} data-testid="signed-media" data-asset-id={link.assetId} data-kind={link.kind} data-src={link.url}>
      <div className="relative overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
        {link.kind === "photo" ? (
          // A plain <img>: next/image would fetch the file server-side without the viewer's session.
          // eslint-disable-next-line @next/next/no-img-element
          <img ref={imgRef} src={link.url} alt={alt} className="aspect-[3/4] w-full object-cover" onError={() => void renew()} />
        ) : (
          <video
            ref={videoRef}
            src={link.url}
            aria-label={alt}
            className="aspect-[3/4] w-full bg-zinc-900 object-cover"
            controls
            muted
            loop
            playsInline
            preload="auto"
            // The browser asked for more bytes after the link expired: ask the policy again.
            onError={() => void renewAndResume()}
          />
        )}
      </div>
      {showControls ? (
        <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5" data-testid="link-countdown">
            <KeyRound className="size-3.5" aria-hidden />
            {renewing ? "Renewing link" : remaining === null ? "Signed link" : expired ? "Link expired" : `Link expires in ${remaining}s`}
          </span>
          <span className="flex gap-1">
            {expired ? (
              <Button type="button" variant="outline" size="xs" onClick={() => void renewAndResume(true)} disabled={renewing}>
                <RefreshCw aria-hidden /> New link
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="xs" onClick={copy} disabled={expired} data-testid="copy-link">
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied" : "Copy signed link"}
            </Button>
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}
