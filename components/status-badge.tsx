import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";

const STYLES: Record<Status, string> = {
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  pending: "bg-amber-50 text-amber-900 ring-amber-200",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200",
  suspended: "bg-orange-50 text-orange-900 ring-orange-200",
  banned: "bg-zinc-100 text-zinc-800 ring-zinc-300",
};

export const STATUS_LABELS: Record<Status, string> = {
  approved: "Approved",
  pending: "Pending review",
  rejected: "Rejected",
  suspended: "Suspended",
  banned: "Banned",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      data-testid="status-badge"
      data-status={status}
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", STYLES[status], className)}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
