"use client";

import { useActionState, useState } from "react";
import { Ban, CircleCheck, Flag, PauseCircle, RotateCcw, XCircle } from "lucide-react";
import { moderateAction, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REJECT_REASONS } from "@/lib/reference";
import type { Status } from "@/lib/types";

function useDecision() {
  return useActionState<FormState, FormData>(moderateAction, { attempt: 0 });
}

function ReasonForm({
  targetId,
  action,
  label,
  presets,
  required,
  icon: Icon,
  variant,
  testId,
}: {
  targetId: string;
  action: string;
  label: string;
  presets: readonly string[];
  required: boolean;
  icon: typeof Flag;
  variant: "outline" | "destructive" | "secondary";
  testId: string;
}) {
  const [state, formAction, pending] = useDecision();
  const [reason, setReason] = useState("");
  const inputId = `${action}-reason`;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="action" value={action} />
      <Label htmlFor={inputId} className="text-xs text-muted-foreground">
        {required ? "Reason (required, shown to the member)" : "Reason (optional)"}
      </Label>
      {presets.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              {preset}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input id={inputId} name="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={160} placeholder="Write a reason" data-testid={`${testId}-reason`} />
        <Button type="submit" variant={variant} disabled={pending} data-testid={testId}>
          <Icon aria-hidden /> {label}
        </Button>
      </div>
      {state.error ? <p className="text-xs font-medium text-destructive" data-testid="decision-error">{state.error}</p> : null}
    </form>
  );
}

export function DecisionPanel({ targetId, status, canRestrict }: { targetId: string; status: Status; canRestrict: boolean }) {
  const [approveState, approveAction, approving] = useDecision();
  const [reinstateState, reinstateAction, reinstating] = useDecision();

  return (
    <div className="flex flex-col gap-5">
      {status === "pending" ? (
        <>
          <form action={approveAction} className="flex flex-col gap-2">
            <input type="hidden" name="targetId" value={targetId} />
            <input type="hidden" name="action" value="approve" />
            <Button type="submit" size="lg" disabled={approving} data-testid="approve" className="bg-emerald-700 text-white hover:bg-emerald-800">
              <CircleCheck aria-hidden /> Approve: video matches photo
            </Button>
            <p className="text-xs text-muted-foreground">The profile becomes visible to approved members immediately.</p>
            {approveState.error ? <p className="text-xs font-medium text-destructive">{approveState.error}</p> : null}
          </form>
          <ReasonForm targetId={targetId} action="reject" label="Reject" presets={REJECT_REASONS} required icon={XCircle} variant="destructive" testId="reject" />
          <ReasonForm targetId={targetId} action="flag" label="Flag" presets={["Needs a second look", "Country mismatch"]} required={false} icon={Flag} variant="outline" testId="flag" />
        </>
      ) : (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Approve, reject and flag apply to profiles waiting for review. This one is {status}.
        </p>
      )}

      {canRestrict ? (
        <div className="flex flex-col gap-4 border-t pt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Admin: account actions</p>
          {status === "approved" || status === "pending" ? (
            <ReasonForm targetId={targetId} action="suspend" label="Suspend" presets={["Reported for harassment", "Under investigation"]} required icon={PauseCircle} variant="outline" testId="suspend" />
          ) : null}
          {status !== "banned" ? (
            <ReasonForm targetId={targetId} action="ban" label="Ban" presets={["Fake identity", "Same person as a banned account"]} required icon={Ban} variant="destructive" testId="ban" />
          ) : null}
          {status === "suspended" ? (
            <form action={reinstateAction}>
              <input type="hidden" name="targetId" value={targetId} />
              <input type="hidden" name="action" value="reinstate" />
              <Button type="submit" variant="outline" disabled={reinstating} data-testid="reinstate">
                <RotateCcw aria-hidden /> Reinstate
              </Button>
              {reinstateState.error ? <p className="text-xs font-medium text-destructive">{reinstateState.error}</p> : null}
            </form>
          ) : null}
        </div>
      ) : (
        <p className="border-t pt-4 text-xs text-muted-foreground">Suspend and ban are admin actions. Moderators can flag a profile for an admin.</p>
      )}
    </div>
  );
}
