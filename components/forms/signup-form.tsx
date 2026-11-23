"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { signupAction, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { EXTRA_FIELDS, FAITH_FIELDS, type ProfileField } from "@/lib/profile-fields";
import { COUNTRIES, LANGUAGES, LOOKING_FOR_LABELS, TERMS_VERSION } from "@/lib/reference";
import { LOOKING_FOR } from "@/lib/types";
import { describedBy, Field, GroupField } from "./field";

const COUNTRY_HINT = "A moderator reviews every signup before the profile is visible.";
const LANGUAGES_HINT = "Your video answers each prompt in every language you tick.";
const ABOUT_HINT = "Optional, up to 280 characters.";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive disabled:bg-muted disabled:opacity-50";

type Values = Record<string, string | string[] | boolean>;

/** Fictional answers for a quick first run. The faith consent stays unticked on purpose. */
const SAMPLE_ANSWERS: Values = {
  name: "Hana Tesfaye",
  age: "30",
  city: "Portland",
  country: "US",
  languages: ["English", "Amharic"],
  lookingFor: "relationship",
  about: "Nurse who loves hiking, coffee with friends and long Sunday lunches.",
  x_occupation: "Nurse",
  x_children: "none",
  adult: true,
  terms: true,
  faithConsent: false,
};

/** Error keys, in page order, with their label and the id of the control to jump to. */
const ERROR_TARGETS: Array<{ key: string; label: string; anchor: string }> = [
  { key: "name", label: "Display name", anchor: "name" },
  { key: "age", label: "Age", anchor: "age" },
  { key: "city", label: "City", anchor: "city" },
  { key: "country", label: "Country", anchor: "country" },
  { key: "languages", label: "Languages", anchor: `lang-${LANGUAGES[0]}` },
  { key: "lookingFor", label: "Looking for", anchor: `looking-${LOOKING_FOR[0]}` },
  { key: "about", label: "About you", anchor: "about" },
  ...EXTRA_FIELDS.map((f) => ({ key: `extra.${f.id}`, label: f.label, anchor: `x_${f.id}` })),
  { key: "adult", label: "18 or older", anchor: "adult" },
  { key: "terms", label: "Community terms", anchor: "terms" },
  ...FAITH_FIELDS.map((f) => ({ key: `faith.${f.id}`, label: f.label, anchor: `f_${f.id}` })),
];

export function SignupForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(signupAction, { attempt: 0 });
  const [prefill, setPrefill] = useState<{ n: number; values: Values } | null>(null);
  // React resets a form after its action runs; remounting with the submitted values restores them.
  const prefilled = prefill !== null && prefill.n > state.attempt;
  const shown: FormState = prefilled ? { attempt: prefill.n, values: prefill.values } : state;
  const values = shown.values ?? {};
  const key = prefilled ? `prefill-${prefill.n}` : `attempt-${state.attempt}`;
  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground ring-1 ring-primary/10">
        <span>In a hurry? Fill the form with fictional answers, then submit.</span>
        <Button type="button" size="sm" variant="outline" className="bg-card" onClick={() => setPrefill({ n: Date.now(), values: SAMPLE_ANSWERS })} data-testid="fill-sample">
          <Sparkles aria-hidden /> Fill with sample answers
        </Button>
      </div>
      <SignupFields key={key} state={shown} values={values} pending={pending} />
    </form>
  );
}

function ErrorSummary({ errors, formError }: { errors: Record<string, string>; formError?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = ERROR_TARGETS.filter((t) => errors[t.key]);
  useEffect(() => {
    // After a failed submit, move focus and the view to the list of problems.
    ref.current?.focus();
    ref.current?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="scroll-mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20" data-testid="error-summary">
      {formError ? <p className="font-medium">{formError}</p> : null}
      {items.length > 0 ? (
        <>
          <p className="font-medium">Check {items.length === 1 ? "one answer" : `${items.length} answers`}:</p>
          <ul className="mt-1 list-disc pl-5">
            {items.map((t) => (
              <li key={t.key}>
                <a href={`#${t.anchor}`} className="underline underline-offset-2">{t.label}: {errors[t.key]}</a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function ConfigField({ field, prefix, values, errors, disabled }: { field: ProfileField; prefix: string; values: Values; errors: Record<string, string>; disabled?: boolean }) {
  const id = `${prefix}${field.id}`;
  const error = errors[`${prefix === "x_" ? "extra" : "faith"}.${field.id}`];
  const value = typeof values[id] === "string" ? (values[id] as string) : "";
  return (
    <Field label={field.label} htmlFor={id} error={error}>
      {field.kind === "text" ? (
        <Input id={id} name={id} defaultValue={value} maxLength={field.max} disabled={disabled} placeholder={disabled ? undefined : field.placeholder} aria-invalid={!!error} aria-describedby={describedBy(id, { error })} />
      ) : (
        <select id={id} name={id} defaultValue={value} disabled={disabled} className={selectClass} aria-invalid={!!error} aria-describedby={describedBy(id, { error })}>
          <option value="">Not answered</option>
          {Object.entries(field.options).map(([optionValue, label]) => (
            <option key={optionValue} value={optionValue}>{label}</option>
          ))}
        </select>
      )}
    </Field>
  );
}

function SignupFields({ state, values, pending }: { state: FormState; values: Values; pending: boolean }) {
  const errors = state.fieldErrors ?? {};
  const text = (key: string) => (typeof values[key] === "string" ? (values[key] as string) : "");
  const checked = (key: string) => values[key] === true;
  const languages = Array.isArray(values.languages) ? values.languages : [];
  const [faithConsent, setFaithConsent] = useState(checked("faithConsent"));
  const hasErrors = Object.keys(errors).length > 0 || !!state.error;

  return (
    <>
      {hasErrors ? <ErrorSummary errors={errors} formError={state.error} /> : null}

      <fieldset className="grid gap-5 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:grid-cols-2">
        <legend className="sr-only">About you</legend>
        <Field label="Display name" htmlFor="name" error={errors.name}>
          <Input id="name" name="name" defaultValue={text("name")} autoComplete="off" aria-invalid={!!errors.name} aria-describedby={describedBy("name", { error: errors.name })} maxLength={40} />
        </Field>
        <Field label="Age" htmlFor="age" error={errors.age}>
          <Input id="age" name="age" type="number" inputMode="numeric" min={18} max={99} defaultValue={text("age")} aria-invalid={!!errors.age} aria-describedby={describedBy("age", { error: errors.age })} />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city}>
          <Input id="city" name="city" defaultValue={text("city")} autoComplete="off" aria-invalid={!!errors.city} aria-describedby={describedBy("city", { error: errors.city })} maxLength={40} />
        </Field>
        <Field label="Country" htmlFor="country" error={errors.country} hint={COUNTRY_HINT}>
          <select id="country" name="country" defaultValue={text("country")} className={selectClass} aria-invalid={!!errors.country} aria-describedby={describedBy("country", { error: errors.country, hint: COUNTRY_HINT })}>
            <option value="" disabled>Choose a country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </Field>
        <GroupField legend="Languages" id="languages" error={errors.languages} hint={LANGUAGES_HINT} className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LANGUAGES.map((language) => (
              <label key={language} className="flex items-center gap-2 text-sm">
                <Checkbox id={`lang-${language}`} name="languages" value={language} defaultChecked={languages.includes(language)} />
                {language}
              </label>
            ))}
          </div>
        </GroupField>
        <GroupField legend="Looking for" id="lookingFor" error={errors.lookingFor} className="sm:col-span-2">
          <RadioGroup name="lookingFor" defaultValue={text("lookingFor") || undefined} className="flex flex-wrap gap-4" aria-label="Looking for" aria-invalid={!!errors.lookingFor}>
            {LOOKING_FOR.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <RadioGroupItem id={`looking-${option}`} value={option} />
                {LOOKING_FOR_LABELS[option]}
              </label>
            ))}
          </RadioGroup>
        </GroupField>
        {EXTRA_FIELDS.map((field) => (
          <ConfigField key={field.id} field={field} prefix="x_" values={values} errors={errors} />
        ))}
        <Field label="About you" htmlFor="about" error={errors.about} hint={ABOUT_HINT} className="sm:col-span-2">
          <Textarea id="about" name="about" defaultValue={text("about")} maxLength={280} rows={3} aria-invalid={!!errors.about} aria-describedby={describedBy("about", { error: errors.about, hint: ABOUT_HINT })} />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <legend className="sr-only">Consent</legend>
        <h2 className="font-heading text-lg font-semibold">Confirmations</h2>
        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox id="adult" name="adult" className="mt-0.5" defaultChecked={checked("adult")} aria-invalid={!!errors.adult} aria-describedby={describedBy("adult", { error: errors.adult })} />
            <span>I confirm I am 18 or older.</span>
          </label>
          {errors.adult ? <p id="adult-error" className="pl-7 text-xs font-medium text-destructive" data-testid="field-error">{errors.adult}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox id="terms" name="terms" className="mt-0.5" defaultChecked={checked("terms")} aria-invalid={!!errors.terms} aria-describedby={describedBy("terms", { error: errors.terms })} />
            <span>
              I accept the{" "}
              <Link href="/terms" target="_blank" className="font-medium text-primary underline underline-offset-2">
                community terms
              </Link>
              , version {TERMS_VERSION}. <span className="text-muted-foreground">Your acceptance is recorded with the version and the time.</span>
            </span>
          </label>
          {errors.terms ? <p id="terms-error" className="pl-7 text-xs font-medium text-destructive" data-testid="field-error">{errors.terms}</p> : null}
        </div>

        <div className="mt-2 flex flex-col gap-3 rounded-lg bg-muted/70 p-4">
          <p className="text-sm font-medium">Faith and values (optional)</p>
          <p className="text-xs text-muted-foreground">
            This is sensitive information, so it has its own consent, separate from the terms. Leave it unticked and nothing below is stored.
          </p>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox name="faithConsent" className="mt-0.5" checked={faithConsent} onCheckedChange={(v) => setFaithConsent(v === true)} />
            <span>I consent to my faith-related answers being stored and shown to approved members.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            {FAITH_FIELDS.map((field) => (
              <ConfigField key={field.id} field={field} prefix="f_" values={values} errors={errors} disabled={!faithConsent} />
            ))}
          </div>
          {!faithConsent ? <p className="text-xs text-muted-foreground">Tick the consent above to answer these.</p> : null}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending} data-testid="signup-submit">
          {pending ? "Saving..." : "Continue to verification"}
        </Button>
        <p className="text-sm text-muted-foreground">Next: a photo and a verification video for a moderator to compare.</p>
      </div>
    </>
  );
}
