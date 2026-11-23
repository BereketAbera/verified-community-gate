"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { renewLinkAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SignedLink } from "@/lib/types";
import { MediaPlaceholder } from "./media-placeholder";

interface Props {
  link: SignedLink;
  alt: string;
  /** Show the expiry countdown and the copy / renew buttons. */
  withControls?: boolean;
  /** Loop the (silent) clip, as a moderator would watch it. */
  autoPlay?: boolean;
  className?: string;
}

/**
 * Renders a photo or video from a 60-second signed link. The countdown and the copy
 * button let a reviewer paste the link elsewhere and watch it stop working.
 */
export function SignedMedia({ link: initial, alt, withControls = true, autoPlay = false, className }: Props) {
  const [link, setLink] = useState<SignedLink | null>(initial);
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const retried = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = link && now !== null ? Math.max(0, link.exp - Math.floor(now / 1000)) : null;
  const expired = remaining === 0;

  async function renew(resumeAt?: number) {
    if (!link) return;
    setRenewing(true);
    const next = await renewLinkAction(link.assetId);
    setRenewing(false);
    setLink(next);
    retried.current = false;
    if (next && resumeAt !== undefined && videoRef.current) {
      const video = videoRef.current;
      video.addEventListener("loadedmetadata", () => (video.currentTime = resumeAt), { once: true });
    }
  }

  async function copy() {
    if (!link) return;
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
          <img src={link.url} alt={alt} className="aspect-[3/4] w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            src={link.url}
            aria-label={alt}
            className="aspect-[3/4] w-full bg-zinc-900 object-cover"
            controls
            autoPlay={autoPlay}
            muted
            loop
            playsInline
            preload="auto"
            onError={() => {
              // The browser asked for more bytes after the link expired: ask the policy again.
              if (retried.current) return;
              retried.current = true;
              void renew(videoRef.current?.currentTime ?? 0);
            }}
          />
        )}
      </div>
      {withControls ? (
        <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5" data-testid="link-countdown">
            <KeyRound className="size-3.5" aria-hidden />
            {remaining === null ? "Signed link" : expired ? "Link expired" : `Link expires in ${remaining}s`}
          </span>
          <span className="flex gap-1">
            {expired ? (
              <Button type="button" variant="outline" size="xs" onClick={() => renew()} disabled={renewing}>
                <RefreshCw aria-hidden /> New link
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="xs" onClick={copy} data-testid="copy-link">
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied" : "Copy signed link"}
            </Button>
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}
