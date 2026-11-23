"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Flag } from "lucide-react";
import { reportAction, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { REPORT_REASONS } from "@/lib/reference";
import { SubmitButton } from "./submit-button";

/** Report a member (R7, R9). Moderators see every report; three open reports hide the profile until reviewed. */
export function ReportForm({ targetId, name, alreadyReported }: { targetId: string; name: string; alreadyReported: boolean }) {
  const [state, formAction] = useActionState<FormState, FormData>(reportAction, { attempt: 0 });
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Bring the reasons into view and start the keyboard on the first one.
    if (!open || !panel.current) return;
    panel.current.scrollIntoView({ block: "nearest" });
    panel.current.querySelector<HTMLElement>('[role="radio"]')?.focus({ preventScroll: true });
  }, [open]);

  if (alreadyReported) {
    return (
      <Button type="button" variant="outline" disabled data-testid="report-member">
        <Flag aria-hidden /> Reported
      </Button>
    );
  }

  return (
    <div className="contents">
      <Button type="button" variant="outline" aria-expanded={open} aria-controls="report-panel" onClick={() => setOpen((o) => !o)} data-testid="report-member">
        <Flag aria-hidden /> Report
      </Button>
      {open ? (
        <form ref={panel} id="report-panel" action={formAction} className="flex w-full flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-testid="report-panel">
          <input type="hidden" name="targetId" value={targetId} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Why are you reporting {name}?</legend>
            <RadioGroup name="reason" className="grid gap-2 sm:grid-cols-2" aria-label="Reason">
              {Object.entries(REPORT_REASONS).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={value} />
                  {label}
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <p className="text-xs text-muted-foreground">
            Moderators review every report. {name} is not told who reported them. After three open reports a profile is hidden
            until a moderator has looked.
          </p>
          {state.error ? <p role="alert" className="text-xs font-medium text-destructive">{state.error}</p> : null}
          <div className="flex gap-2">
            <SubmitButton pendingLabel="Sending..." data-testid="send-report">Send report</SubmitButton>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
