// Optional profile fields, driven by config (R1). The core fields (name, age, city, country,
// languages, looking for, about) are used by search, so they are typed in lib/types.ts; the
// rest of the client's ~15 fields are added here and appear in signup, profiles and review.
// Faith-related fields have their own consent and are dropped without it.
import { z } from "zod";

/** `label` is what the member is asked; `shown` is the heading other members see. */
type TextField = { id: string; label: string; shown?: string; kind: "text"; max: number; placeholder: string };
type SelectField = { id: string; label: string; shown?: string; kind: "select"; options: Record<string, string> };
export type ProfileField = TextField | SelectField;

export const EXTRA_FIELDS: readonly ProfileField[] = [
  { id: "occupation", label: "Occupation", kind: "text", max: 40, placeholder: "For example: Nurse" },
  {
    id: "children",
    label: "Children",
    kind: "select",
    options: { none: "No children", have: "Have children", private: "Prefer not to say" },
  },
];

export const FAITH_FIELDS: readonly ProfileField[] = [
  { id: "words", label: "In your own words", shown: "Faith, in their words", kind: "text", max: 80, placeholder: "For example: Practising, and it matters to me" },
  {
    id: "importance",
    label: "How important faith is to you",
    shown: "Importance of faith",
    kind: "select",
    options: { very: "Very important", important: "Important", somewhat: "Somewhat important", exploring: "Still exploring" },
  },
  {
    id: "attendance",
    label: "How often you attend services",
    shown: "Attends services",
    kind: "select",
    options: { weekly: "Weekly or more", monthly: "A few times a month", occasionally: "On special occasions", rarely: "Rarely" },
  },
];

/** Validation for a group of optional fields: empty is allowed, anything else must fit the config. */
export function fieldsSchema(fields: readonly ProfileField[]) {
  return z.object(
    Object.fromEntries(
      fields.map((f) => [
        f.id,
        f.kind === "text"
          ? z.string().trim().max(f.max, `Keep it under ${f.max} characters`)
          : z.union([z.literal(""), z.enum(Object.keys(f.options) as [string, ...string[]])], { error: "Choose one of the options" }),
      ]),
    ),
  );
}

/** Drops empty answers so only what the member filled in is stored. */
export function compact(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ""));
}

/** Label and display value for each stored answer, in config order. */
export function describe(fields: readonly ProfileField[], values: Record<string, string> | null): Array<{ label: string; value: string }> {
  if (!values) return [];
  return fields.flatMap((f) => {
    const raw = values[f.id];
    if (!raw) return [];
    return [{ label: f.shown ?? f.label, value: f.kind === "select" ? (f.options[raw] ?? raw) : raw }];
  });
}
