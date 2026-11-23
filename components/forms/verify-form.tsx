"use client";

import { useActionState } from "react";
import { Play } from "lucide-react";
import { verifyAction, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SAMPLE_PHOTOS, SAMPLE_VIDEOS } from "@/lib/reference";

const tileClass =
  "relative flex cursor-pointer flex-col gap-2 rounded-xl bg-card p-2 ring-1 ring-foreground/10 transition hover:ring-foreground/25 has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-primary";

export function VerifyForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(verifyAction, { attempt: 0 });
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {state.error ? <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</p> : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Photo</h2>
        <RadioGroup name="photo" className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Sample photo">
          {SAMPLE_PHOTOS.map((photo) => (
            <label key={photo.id} className={tileClass} data-testid={`pick-${photo.id}`}>
              <span
                className="flex aspect-[3/4] items-center justify-center rounded-lg font-heading text-4xl font-semibold text-white/90"
                style={{ background: `linear-gradient(135deg, ${photo.tint[0]}, ${photo.tint[1]})` }}
                aria-hidden
              >
                {photo.label.slice(-1)}
              </span>
              <span className="flex items-center gap-2 px-1 pb-1 text-sm">
                <RadioGroupItem value={photo.id} />
                {photo.label}
              </span>
            </label>
          ))}
        </RadioGroup>
        {errors.photo ? <p className="text-xs font-medium text-destructive">{errors.photo}</p> : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Verification video</h2>
        <RadioGroup name="video" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Sample video">
          {SAMPLE_VIDEOS.map((video) => (
            <label key={video.id} className={tileClass} data-testid={`pick-${video.id}`}>
              <span
                className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg text-white/90"
                style={{ background: `linear-gradient(160deg, ${video.tint[0]}, ${video.tint[1]})` }}
                aria-hidden
              >
                <Play className="size-6" />
                <span className="text-xs">6 s</span>
              </span>
              <span className="flex items-center gap-2 px-1 pb-1 text-sm">
                <RadioGroupItem value={video.id} />
                {video.label}
              </span>
            </label>
          ))}
        </RadioGroup>
        {errors.video ? <p className="text-xs font-medium text-destructive">{errors.video}</p> : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending} data-testid="verify-submit">
          {pending ? "Submitting..." : "Submit for review"}
        </Button>
        <p className="text-sm text-muted-foreground">Your status becomes Pending review. Replacing either file later restarts the review.</p>
      </div>
    </form>
  );
}
