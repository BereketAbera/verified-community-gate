"use client";

import { useActionState } from "react";
import { noteAction, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NoteForm({ targetId }: { targetId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(noteAction, { attempt: 0 });
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="targetId" value={targetId} />
      <Textarea name="text" rows={2} maxLength={280} placeholder="Add a note for other moderators" aria-label="Note" data-testid="note-text" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Notes are internal. Members never see them.</p>
        <Button type="submit" size="sm" variant="outline" disabled={pending} data-testid="note-submit">Add note</Button>
      </div>
      {state.error ? <p className="text-xs font-medium text-destructive">{state.error}</p> : null}
    </form>
  );
}
