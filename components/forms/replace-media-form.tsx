"use client";

import { useActionState } from "react";
import { RefreshCcw } from "lucide-react";
import { replaceMediaAction, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { SAMPLE_PHOTOS, SAMPLE_VIDEOS } from "@/lib/reference";
import type { MediaKind } from "@/lib/types";

export function ReplaceMediaForm({ kind }: { kind: MediaKind }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(replaceMediaAction, { attempt: 0 });
  const options = kind === "photo" ? SAMPLE_PHOTOS : SAMPLE_VIDEOS;
  return (
    <form action={formAction} className="flex flex-col gap-2" data-testid={`replace-${kind}-form`}>
      <input type="hidden" name="kind" value={kind} />
      <div className="flex gap-2">
        <select
          name="choice"
          aria-label={`Replacement ${kind}`}
          defaultValue={options[options.length - 1].id}
          className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-2 text-sm"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm" disabled={pending} data-testid={`replace-${kind}`}>
          <RefreshCcw aria-hidden /> Replace {kind}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Replacing sends your profile back to review. It is hidden until a moderator approves again.</p>
      {state.error ? <p className="text-xs font-medium text-destructive">{state.error}</p> : null}
    </form>
  );
}
