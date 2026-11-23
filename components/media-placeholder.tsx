import { ImageOff, Lock, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

const TEXT = {
  private: "Private: only the member and moderators can see this",
  none: "Not available",
  ended: "Access ended",
} as const;

export function MediaPlaceholder({
  kind,
  reason,
  className,
}: {
  kind: "photo" | "video";
  reason: keyof typeof TEXT;
  className?: string;
}) {
  const Icon = reason === "private" ? Lock : kind === "photo" ? ImageOff : VideoOff;
  return (
    <div
      data-testid="media-placeholder"
      data-reason={reason}
      className={cn(
        "flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted px-6 text-center text-sm text-muted-foreground ring-1 ring-foreground/10",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
      <span className="font-medium text-foreground/80">{kind === "photo" ? "Photo" : "Video"}</span>
      <span className="text-xs">{TEXT[reason]}</span>
    </div>
  );
}
