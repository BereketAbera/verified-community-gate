import { ImageOff, ImagePlus, Lock, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

const TEXT = {
  private: "Private: only the member and moderators can see this",
  none: "Not available",
  ended: "Access ended",
  empty: "Not added yet",
} as const;

export function MediaPlaceholder({
  kind,
  reason,
  className,
  action,
  hidden = false,
}: {
  kind: "photo" | "video";
  reason: keyof typeof TEXT;
  className?: string;
  /** A next step, for the owner's own empty state. */
  action?: React.ReactNode;
  /** Decorative copy inside a link that already names the member. */
  hidden?: boolean;
}) {
  const Icon = reason === "private" ? Lock : reason === "empty" ? ImagePlus : kind === "photo" ? ImageOff : VideoOff;
  return (
    <div
      data-testid="media-placeholder"
      data-reason={reason}
      aria-hidden={hidden || undefined}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg bg-muted px-3 text-center text-sm text-muted-foreground ring-1 ring-foreground/10 sm:gap-2 sm:px-6",
        reason === "empty" ? "aspect-[4/3]" : "aspect-[3/4]",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
      <span className="font-medium text-foreground/80">
        {reason === "empty" ? (kind === "photo" ? "No photo yet" : "No video yet") : kind === "photo" ? "Photo" : "Video"}
      </span>
      <span className="text-xs">{reason === "empty" ? "Add both so a moderator can compare them." : TEXT[reason]}</span>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
