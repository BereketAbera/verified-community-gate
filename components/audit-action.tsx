import { cn } from "@/lib/utils";
import type { AuditAction } from "@/lib/types";

const LABELS: Record<AuditAction, string> = {
  signup: "Signed up",
  submit: "Submitted for review",
  approve: "Approved",
  reject: "Rejected",
  flag: "Flagged",
  note: "Note added",
  suspend: "Suspended",
  ban: "Banned",
  reinstate: "Reinstated",
  media_replaced: "Media replaced",
  visibility_changed: "Visibility changed",
  block: "Blocked",
  unblock: "Unblocked",
};

const TONES: Partial<Record<AuditAction, string>> = {
  approve: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  reinstate: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  reject: "bg-rose-50 text-rose-800 ring-rose-200",
  ban: "bg-zinc-100 text-zinc-800 ring-zinc-300",
  suspend: "bg-orange-50 text-orange-900 ring-orange-200",
  flag: "bg-amber-50 text-amber-900 ring-amber-200",
  media_replaced: "bg-amber-50 text-amber-900 ring-amber-200",
};

export function AuditActionBadge({ action }: { action: AuditAction }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONES[action] ?? "bg-secondary text-secondary-foreground ring-primary/15")}>
      {LABELS[action]}
    </span>
  );
}
