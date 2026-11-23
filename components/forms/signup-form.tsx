"use client";

import { useActionState, useState } from "react";
import { signupAction, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRIES, LANGUAGES, LOOKING_FOR_LABELS, TERMS_VERSION } from "@/lib/reference";
import { LOOKING_FOR } from "@/lib/types";
import { Field } from "./field";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function SignupForm({ detectedCountry }: { detectedCountry: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(signupAction, { attempt: 0 });
  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      <SignupFields key={state.attempt} state={state} pending={pending} detectedCountry={detectedCountry} />
    </form>
  );
}

function SignupFields({ state, pending, detectedCountry }: { state: FormState; pending: boolean; detectedCountry: string | null }) {
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};
  const text = (key: string) => (typeof values[key] === "string" ? (values[key] as string) : "");
  const checked = (key: string) => values[key] === true;
  const languages = Array.isArray(values.languages) ? values.languages : [];
  const [faithConsent, setFaithConsent] = useState(checked("faithConsent"));

  return (
    <>
      {state.error ? <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</p> : null}

      <fieldset className="grid gap-5 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:grid-cols-2">
        <legend className="sr-only">About you</legend>
        <Field label="Display name" htmlFor="name" error={errors.name}>
          <Input id="name" name="name" defaultValue={text("name")} autoComplete="off" aria-invalid={!!errors.name} maxLength={40} />
        </Field>
        <Field label="Age" htmlFor="age" error={errors.age}>
          <Input id="age" name="age" type="number" inputMode="numeric" min={18} max={99} defaultValue={text("age")} aria-invalid={!!errors.age} />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city}>
          <Input id="city" name="city" defaultValue={text("city")} autoComplete="off" aria-invalid={!!errors.city} maxLength={40} />
        </Field>
        <Field
          label="Country"
          htmlFor="country"
          error={errors.country}
          hint={`Moderators compare this with the country your connection comes from${detectedCountry ? ` (${detectedCountry})` : ", when the host provides it"}.`}
        >
          <select id="country" name="country" defaultValue={text("country")} className={selectClass} aria-invalid={!!errors.country}>
            <option value="" disabled>Choose a country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Languages" error={errors.languages} className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LANGUAGES.map((language) => (
              <label key={language} className="flex items-center gap-2 text-sm">
                <Checkbox name="languages" value={language} defaultChecked={languages.includes(language)} />
                {language}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Looking for" error={errors.lookingFor} className="sm:col-span-2">
          <RadioGroup name="lookingFor" defaultValue={text("lookingFor") || undefined} className="flex flex-wrap gap-4">
            {LOOKING_FOR.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={option} />
                {LOOKING_FOR_LABELS[option]}
              </label>
            ))}
          </RadioGroup>
        </Field>
        <Field label="About you" htmlFor="about" error={errors.about} hint="Optional, up to 280 characters." className="sm:col-span-2">
          <Textarea id="about" name="about" defaultValue={text("about")} maxLength={280} rows={3} />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <legend className="sr-only">Consent</legend>
        <h2 className="font-heading text-lg font-semibold">Confirmations</h2>
        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox name="adult" className="mt-0.5" defaultChecked={checked("adult")} aria-invalid={!!errors.adult} />
            <span>I confirm I am 18 or older.</span>
          </label>
          {errors.adult ? <p className="pl-7 text-xs font-medium text-destructive" data-testid="field-error">{errors.adult}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox name="terms" className="mt-0.5" defaultChecked={checked("terms")} aria-invalid={!!errors.terms} />
            <span>
              I accept the community terms, version {TERMS_VERSION}. <span className="text-muted-foreground">Your acceptance is recorded with the version and the time.</span>
            </span>
          </label>
          {errors.terms ? <p className="pl-7 text-xs font-medium text-destructive" data-testid="field-error">{errors.terms}</p> : null}
        </div>

        <div className="mt-2 flex flex-col gap-3 rounded-lg bg-muted/70 p-4">
          <p className="text-sm font-medium">Faith and values (optional)</p>
          <p className="text-xs text-muted-foreground">
            This is sensitive information, so it has its own consent, separate from the terms. Leave it unticked and nothing you type below is stored.
          </p>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox name="faithConsent" className="mt-0.5" checked={faithConsent} onCheckedChange={(v) => setFaithConsent(v === true)} />
            <span>I consent to my faith-related information being stored and shown to approved members.</span>
          </label>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="faith" className={faithConsent ? undefined : "text-muted-foreground"}>In a few words</Label>
            <Input id="faith" name="faith" defaultValue={text("faith")} disabled={!faithConsent} maxLength={80} placeholder={faithConsent ? "For example: Practising, and it matters to me" : "Tick the consent above to add this"} />
            {errors.faith ? <p className="text-xs font-medium text-destructive">{errors.faith}</p> : null}
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending} data-testid="signup-submit">
          {pending ? "Saving..." : "Continue to verification"}
        </Button>
        <p className="text-sm text-muted-foreground">Next: a photo and a short video for a moderator to compare.</p>
      </div>
    </>
  );
}
