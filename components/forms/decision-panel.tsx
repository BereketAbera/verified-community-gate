"use client";

import { useActionState, useRef, useState } from "react";
import { Ban, CircleAlert, CircleCheck, Clock3, Flag, MapPin, PauseCircle, RotateCcw, XCircle } from "lucide-react";
import { moderateAction, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REJECT_REASONS } from "@/lib/reference";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";

function useDecision() {
  return useActionState<FormState, FormData>(moderateAction, { attempt: 0 });
}

export interface ChecklistData {
  /** The five prompts the recording answers, fixed ones first. */
  prompts: Array<{ id: string; text: string; fixed: boolean }>;
  languages: string[];
  seconds: number | null;
  lengthText: string;
  lengthOk: boolean;
  /** Problems with the recording itself, which no tick can fix. */
  recordingProblems: string[];
  /** Stated against detected country, shown beside the checklist (staff only). */
  location: { text: string; differs: boolean };
}

/** R2/R3: the moderator ticks what they saw and heard. Approve stays off until everything is ticked. */
function ApproveForm({ targetId, checklist }: { targetId: string; checklist: ChecklistData }) {
  const [state, formAction, pending] = useDecision();
  const [same, setSame] = useState(false);
  const [heard, setHeard] = useState<string[]>([]);
  const [spoken, setSpoken] = useState<string[]>([]);
  const toggle = (list: string[], set: (v: string[]) => void, id: string, on: boolean) => set(on ? [...list, id] : list.filter((x) => x !== id));
  const complete = same && heard.length === checklist.prompts.length && spoken.length === checklist.languages.length;
  const blocked = checklist.recordingProblems.length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-4" data-testid="approve-form" key={state.attempt}>
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="action" value="approve" />
      <fieldset className="flex flex-col gap-3" data-testid="checklist">
        <legend className="mb-2 text-sm font-semibold">Verification checklist</legend>
        <p
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
            checklist.lengthOk ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-900 ring-1 ring-rose-200",
          )}
          data-testid="recording-length"
        >
          {checklist.lengthOk ? <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
          <span>{checklist.lengthText}</span>
        </p>
        <p
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
            checklist.location.differs ? "bg-amber-50 text-amber-950 ring-1 ring-amber-200" : "bg-muted text-muted-foreground",
          )}
          data-testid="location-line"
        >
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{checklist.location.text}</span>
        </p>
        <label className="flex items-start gap-3 text-sm font-medium">
          <Checkbox name="samePerson" checked={same} onCheckedChange={(v) => setSame(v === true)} className="mt-0.5" data-testid="check-same-person" />
          Same person as the photo
        </label>
        <div className="flex flex-col gap-2" role="group" aria-labelledby={`prompts-${targetId}`}>
          <p id={`prompts-${targetId}`} className="text-xs font-medium text-muted-foreground">
            Prompts answered ({heard.length} of {checklist.prompts.length})
          </p>
          {checklist.prompts.map((p) => (
            <label key={p.id} className="flex items-start gap-3 text-sm">
              <Checkbox name="heardPrompt" value={p.id} checked={heard.includes(p.id)} onCheckedChange={(v) => toggle(heard, setHeard, p.id, v === true)} className="mt-0.5" data-testid={`check-prompt-${p.id}`} />
              <span>
                {p.text} <span className="text-xs text-muted-foreground">{p.fixed ? "fixed" : "chosen"}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-2" role="group" aria-labelledby={`languages-${targetId}`}>
          <p id={`languages-${targetId}`} className="text-xs font-medium text-muted-foreground">
            Languages heard ({spoken.length} of {checklist.languages.length} on the profile)
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {checklist.languages.map((language) => (
              <label key={language} className="flex items-center gap-2 text-sm">
                <Checkbox name="heardLanguage" value={language} checked={spoken.includes(language)} onCheckedChange={(v) => toggle(spoken, setSpoken, language, v === true)} data-testid={`check-language-${language}`} />
                {language}
              </label>
            ))}
          </div>
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={pending || !complete || blocked} data-testid="approve" className="bg-emerald-700 text-white hover:bg-emerald-800">
          <CircleCheck aria-hidden /> Approve
        </Button>
        <p className="text-xs text-muted-foreground">
          {blocked
            ? `Cannot approve: ${checklist.recordingProblems.join(" ")} Reject with a reason instead.`
            : complete
              ? "The profile becomes visible to approved members immediately. The checklist is saved in the audit log."
              : "Tick every item you saw and heard to approve."}
        </p>
        {state.error ? <p role="alert" className="text-xs font-medium text-destructive" data-testid="decision-error">{state.error}</p> : null}
      </div>
    </form>
  );
}

function ReasonForm({
  targetId,
  action,
  legend,
  label,
  presets,
  required,
  icon: Icon,
  variant,
  testId,
  confirm,
}: {
  targetId: string;
  action: string;
  legend: string;
  label: string;
  presets: readonly string[];
  required: boolean;
  icon: typeof Flag;
  variant: "outline" | "destructive" | "secondary";
  testId: string;
  /** Ask before submitting, for actions that cannot be undone here. */
  confirm?: { title: string; body: string; action: string };
}) {
  const [state, formAction, pending] = useDecision();
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputId = `${action}-reason`;
  const errorId = `${action}-error`;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">{legend}</legend>
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="action" value={action} />
        <Label htmlFor={inputId} className="text-xs text-muted-foreground">{label}</Label>
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
          <Input
            id={inputId}
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={160}
            minLength={required ? 3 : undefined}
            required={required}
            placeholder={required ? "Write a reason" : "Optional note"}
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? errorId : undefined}
            data-testid={`${testId}-reason`}
          />
          <Button
            type={confirm ? "button" : "submit"}
            variant={variant}
            disabled={pending}
            data-testid={testId}
            onClick={confirm ? () => formRef.current?.reportValidity() && setAsking(true) : undefined}
          >
            <Icon aria-hidden /> {legend.split(" ")[0]}
          </Button>
        </div>
        {state.error ? <p id={errorId} role="alert" className="text-xs font-medium text-destructive" data-testid="decision-error">{state.error}</p> : null}
      </fieldset>
      {confirm ? (
        <AlertDialog open={asking} onOpenChange={setAsking}>
          <AlertDialogContent>
            <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm.body}</AlertDialogDescription>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">Reason shown to the member: {reason}</p>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button type="button" variant="destructive" data-testid={`${testId}-confirm`} onClick={() => formRef.current?.requestSubmit()}>
                  {confirm.action}
                </Button>
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </form>
  );
}

export function DecisionPanel({
  targetId,
  name,
  status,
  canRestrict,
  checklist,
  suspendedFrom,
  banned,
}: {
  targetId: string;
  name: string;
  status: Status;
  canRestrict: boolean;
  checklist: ChecklistData | null;
  suspendedFrom: string | null;
  banned: { at: string; by: string; reason: string | null } | null;
}) {
  const [reinstateState, reinstateAction, reinstating] = useDecision();

  return (
    <div className="flex flex-col gap-5">
      {status === "pending" ? (
        <>
          {checklist ? (
            <ApproveForm targetId={targetId} checklist={checklist} />
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">This profile has not submitted a photo and video yet, so there is nothing to approve.</p>
          )}
          <div className="border-t pt-4">
            <ReasonForm targetId={targetId} action="reject" legend="Reject" label="Rejection reason (shown to the member)" presets={REJECT_REASONS} required icon={XCircle} variant="destructive" testId="reject" />
          </div>
          <ReasonForm targetId={targetId} action="flag" legend="Flag for a second look" label="Flag note (optional, staff only)" presets={["Needs a second look", "Country mismatch"]} required={false} icon={Flag} variant="outline" testId="flag" />
        </>
      ) : (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Approve, reject and flag apply to profiles waiting for review. This one is {status === "approved" ? "approved" : status}.
        </p>
      )}

      {canRestrict ? (
        <div className="flex flex-col gap-4 border-t pt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Admin: account actions</p>
          {status === "approved" || status === "pending" ? (
            <ReasonForm targetId={targetId} action="suspend" legend="Suspend" label="Suspension reason (shown to the member)" presets={["Reported for harassment", "Under investigation"]} required icon={PauseCircle} variant="outline" testId="suspend" />
          ) : null}
          {status === "suspended" ? (
            <form action={reinstateAction} className="flex flex-col gap-2">
              <input type="hidden" name="targetId" value={targetId} />
              <input type="hidden" name="action" value="reinstate" />
              <Button type="submit" variant="outline" className="self-start" disabled={reinstating} data-testid="reinstate">
                <RotateCcw aria-hidden /> Reinstate
              </Button>
              <p className="text-xs text-muted-foreground">
                Restores the status the suspension interrupted: {suspendedFrom === "approved" ? "Approved, visible again" : "Pending review, back in the queue and still hidden"}.
              </p>
              {reinstateState.error ? <p role="alert" className="text-xs font-medium text-destructive">{reinstateState.error}</p> : null}
            </form>
          ) : null}
          {status !== "banned" ? (
            <ReasonForm
              targetId={targetId}
              action="ban"
              legend="Ban"
              label="Ban reason (shown to the member)"
              presets={["Fake identity", "Same person as a banned account"]}
              required
              icon={Ban}
              variant="destructive"
              testId="ban"
              confirm={{
                title: `Ban ${name}?`,
                body: "They lose access at once: hidden from search, profiles, messages and media, and their own links stop working. Bans are final in this sample.",
                action: "Ban permanently",
              }}
            />
          ) : banned ? (
            <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-800 ring-1 ring-zinc-300 ring-inset" data-testid="ban-summary">
              Banned {banned.at} by {banned.by}{banned.reason ? `: ${banned.reason}` : ""}. Bans are final in this sample; Phase 1 can add a reviewed way to lift one.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="border-t pt-4 text-xs text-muted-foreground">Suspend and ban are admin actions. Moderators can flag a profile for an admin.</p>
      )}
    </div>
  );
}
