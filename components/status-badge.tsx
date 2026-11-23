import { cn } from "@/lib/utils";
import type { Account, Status } from "@/lib/types";

/** Status as people see it: a pending account that has not sent its photo and video yet is "Not submitted". */
export type DisplayStatus = Status | "not_submitted";

export function displayStatus(account: Pick<Account, "status" | "submittedAt">): DisplayStatus {
  return account.status === "pending" && !account.submittedAt ? "not_submitted" : account.status;
}

const STYLES: Record<DisplayStatus, string> = {
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  pending: "bg-amber-50 text-amber-900 ring-amber-200",
  not_submitted: "bg-slate-50 text-slate-700 ring-slate-300",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200",
  suspended: "bg-orange-50 text-orange-900 ring-orange-200",
  banned: "bg-zinc-100 text-zinc-800 ring-zinc-300",
};

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  approved: "Approved",
  pending: "Pending review",
  not_submitted: "Not submitted",
  rejected: "Rejected",
  suspended: "Suspended",
  banned: "Banned",
};

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
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
