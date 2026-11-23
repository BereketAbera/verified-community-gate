import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning";
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "success" ? CircleCheck : tone === "warning" ? TriangleAlert : Info;
  return (
    <div
      role="status"
      data-testid="notice"
      className={cn(
        "flex gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset",
        tone === "success" && "bg-emerald-50 text-emerald-900 ring-emerald-200",
        tone === "warning" && "bg-amber-50 text-amber-950 ring-amber-200",
        tone === "info" && "bg-secondary text-secondary-foreground ring-primary/15",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        {children ? <div className="text-[0.85rem] opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}
