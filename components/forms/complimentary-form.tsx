"use client";

import { useActionState } from "react";
import { Gift } from "lucide-react";
import { complimentaryAction, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isoDate(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);
}

/** Staff-set complimentary access with an end date (R6). Admins only. */
export function ComplimentaryForm({ targetId }: { targetId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(complimentaryAction, { attempt: 0 });
  return (
    <form action={formAction} className="flex flex-col gap-2" key={state.attempt}>
      <input type="hidden" name="targetId" value={targetId} />
      <Label htmlFor="comp-until" className="text-xs text-muted-foreground">Complimentary access until</Label>
      <div className="flex gap-2">
        <Input id="comp-until" name="until" type="date" required min={isoDate(1)} max={isoDate(730)} defaultValue={isoDate(90)} className="h-8 w-auto" aria-invalid={state.error ? true : undefined} aria-describedby={state.error ? "comp-error" : undefined} />
        <Button type="submit" variant="outline" size="sm" disabled={pending} data-testid="give-complimentary">
          <Gift aria-hidden /> Give access
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Starting conversations without paying, until the date. It is recorded in the audit log.</p>
      {state.error ? <p id="comp-error" role="alert" className="text-xs font-medium text-destructive">{state.error}</p> : null}
    </form>
  );
}
