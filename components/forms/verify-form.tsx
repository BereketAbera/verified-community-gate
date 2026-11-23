"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Clock3, Languages } from "lucide-react";
import { verifyAction, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SamplePreview } from "@/components/sample-preview";
import { SignedImage } from "@/components/signed-image";
import { cn } from "@/lib/utils";
import type { SignedLink } from "@/lib/types";
import { CHOSEN_PROMPTS, FIXED_PROMPTS, formatDuration, OPTIONAL_PROMPTS } from "@/lib/verification";

const tileClass =
  "relative flex cursor-pointer flex-col gap-2 rounded-xl bg-card p-2 ring-1 ring-foreground/10 transition hover:ring-foreground/25 has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-primary";

export interface SampleOption {
  id: string;
  label: string;
  seconds: number;
  photo: SignedLink | null;
  video: SignedLink | null;
}

function listOf(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function VerifyForm({ samples, languages }: { samples: SampleOption[]; languages: string[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(verifyAction, { attempt: 0 });
  const errors = state.fieldErrors ?? {};
  const previous = state.values ?? {};
  const [chosen, setChosen] = useState<string[]>(Array.isArray(previous.prompts) ? previous.prompts : []);
  const errorRef = useRef<HTMLDivElement>(null);
  const hasErrors = Object.keys(errors).length > 0 || !!state.error;

  useEffect(() => {
    if (state.attempt && hasErrors) {
      errorRef.current?.focus();
      errorRef.current?.scrollIntoView({ block: "start" });
    }
  }, [state.attempt, hasErrors]);

  function toggle(id: string, on: boolean) {
    setChosen((current) => (on ? [...current.filter((c) => c !== id), id].slice(-CHOSEN_PROMPTS) : current.filter((c) => c !== id)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-8" key={state.attempt}>
      {hasErrors ? (
        <div ref={errorRef} tabIndex={-1} role="alert" className="scroll-mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20" data-testid="error-summary">
          {state.error ?? `Check ${Object.keys(errors).length === 1 ? "one answer" : `${Object.keys(errors).length} answers`}: ${Object.values(errors).join(" · ")}`}
        </div>
      ) : null}

      <section className="flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10" aria-labelledby="prompts-title">
        <div className="flex flex-col gap-1">
          <h2 id="prompts-title" className="font-heading text-lg font-semibold">Your five prompts</h2>
          <p className="text-sm text-muted-foreground">Three are asked of everyone. Choose two more that suit you.</p>
        </div>
        <ol className="flex flex-col gap-2 text-sm" aria-label="Asked of everyone">
          {FIXED_PROMPTS.map((p, i) => (
            <li key={p.id} className="flex gap-3 rounded-lg bg-muted/70 px-3 py-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{i + 1}</span>
              <span>{p.text}</span>
            </li>
          ))}
        </ol>
        <fieldset className="flex flex-col gap-2" aria-describedby={errors.prompts ? "prompts-error" : "prompts-hint"}>
          <legend className="mb-2 text-sm font-medium">
            Choose two more <span className="font-normal text-muted-foreground">({chosen.length} of {CHOSEN_PROMPTS} chosen)</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {OPTIONAL_PROMPTS.map((p) => {
              const on = chosen.includes(p.id);
              const full = chosen.length >= CHOSEN_PROMPTS && !on;
              return (
                <label key={p.id} className={cn("flex items-start gap-3 rounded-lg px-3 py-2 text-sm ring-1 ring-foreground/10", on && "bg-secondary ring-primary/40", full && "opacity-60")} data-testid={`prompt-${p.id}`}>
                  <Checkbox name="prompts" value={p.id} checked={on} disabled={full} onCheckedChange={(v) => toggle(p.id, v === true)} className="mt-0.5" />
                  <span>{p.text}</span>
                </label>
              );
            })}
          </div>
          {errors.prompts ? (
            <p id="prompts-error" className="text-xs font-medium text-destructive">{errors.prompts}</p>
          ) : (
            <p id="prompts-hint" className="text-xs text-muted-foreground">Pick any two. Once two are chosen, the others wait until you untick one.</p>
          )}
        </fieldset>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-950 ring-1 ring-amber-200">
            <Languages className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Answer every prompt in each language on your profile: <strong className="font-medium">{listOf(languages)}</strong>.</span>
          </li>
          <li className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-950 ring-1 ring-amber-200">
            <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>The whole recording lasts <strong className="font-medium">2 to 5 minutes</strong>. A moderator checks the length, every prompt and every language.</span>
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="photo-title">
        <h2 id="photo-title" className="font-heading text-lg font-semibold">Photo</h2>
        <RadioGroup name="photo" defaultValue={typeof previous.photo === "string" && previous.photo ? previous.photo : undefined} className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-labelledby="photo-title" aria-describedby={errors.photo ? "photo-error" : undefined}>
          {samples.map((s) => (
            <label key={s.id} className={tileClass} data-testid={`pick-${s.id}`}>
              {s.photo ? (
                <SignedImage link={s.photo} alt="" className="aspect-[3/4] w-full rounded-lg bg-muted object-cover" />
              ) : (
                <span className="aspect-[3/4] w-full rounded-lg bg-muted" />
              )}
              <span className="flex items-center gap-2 px-1 pb-1 text-sm">
                <RadioGroupItem value={s.id} />
                {s.label}
              </span>
            </label>
          ))}
        </RadioGroup>
        {errors.photo ? <p id="photo-error" className="text-xs font-medium text-destructive">{errors.photo}</p> : null}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="video-title">
        <div className="flex flex-col gap-1">
          <h2 id="video-title" className="font-heading text-lg font-semibold">Verification video</h2>
          <p className="text-sm text-muted-foreground">
            Pick the same person as your photo, or a different one to see the moderator catch the mismatch.
          </p>
        </div>
        <RadioGroup name="video" defaultValue={typeof previous.video === "string" && previous.video ? previous.video : undefined} className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-labelledby="video-title" aria-describedby={errors.video ? "video-error" : undefined}>
          {samples.map((s) => (
            <label key={s.id} className={tileClass} data-testid={`pick-video-${s.id}`}>
              {s.video ? (
                <SamplePreview link={s.video} label={`Preview of ${s.label}'s clip`} className="aspect-[3/4] w-full rounded-lg bg-zinc-900 object-cover" />
              ) : (
                <span className="aspect-[3/4] w-full rounded-lg bg-muted" />
              )}
              <span className="flex items-start gap-2 px-1 pb-1 text-sm">
                <RadioGroupItem value={s.id} className="mt-0.5" />
                <span className="flex flex-col">
                  {s.label}
                  <span className="text-xs text-muted-foreground">Stands in for a {formatDuration(s.seconds)} recording</span>
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {errors.video ? <p id="video-error" className="text-xs font-medium text-destructive">{errors.video}</p> : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending} data-testid="verify-submit">
          {pending ? "Submitting..." : "Submit for review"}
        </Button>
        <p className="text-sm text-muted-foreground">Your profile then waits, hidden, in the moderator queue. Replacing either file later restarts the review.</p>
      </div>
    </form>
  );
}
