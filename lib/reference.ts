import type { LookingFor } from "./types";

/** Version of the community terms new members accept. The page lives at /terms. */
export const TERMS_VERSION = "2026-07-15";

export const COUNTRIES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "IT", name: "Italy" },
  { code: "ET", name: "Ethiopia" },
  { code: "KE", name: "Kenya" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "IN", name: "India" },
  { code: "PH", name: "Philippines" },
  { code: "KR", name: "South Korea" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "CO", name: "Colombia" },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** Human name for any ISO country code, including codes outside the signup list. */
export function countryName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const listed = COUNTRIES.find((c) => c.code === code);
  if (listed) return listed.name;
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "German",
  "Arabic",
  "Amharic",
  "Swahili",
  "Hindi",
  "Tagalog",
  "Korean",
  "Yoruba",
  "Igbo",
  "Tigrinya",
  "Italian",
  "Japanese",
] as const;

export const LOOKING_FOR_LABELS: Record<LookingFor, string> = {
  friendship: "Friendship",
  relationship: "A long-term relationship",
  marriage: "Marriage",
};

/**
 * The fictional sample library a new member picks from instead of recording. Each sample
 * person has a portrait and a short clip of the same face. A clip stands in for a recording
 * of the length given here; real recordings are 2 to 5 minutes long.
 */
export const SAMPLE_PEOPLE = [
  { id: "sample-a", label: "Sample person A", seconds: 185 },
  { id: "sample-b", label: "Sample person B", seconds: 160 },
  { id: "sample-c", label: "Sample person C", seconds: 250 },
  { id: "sample-d", label: "Sample person D", seconds: 212 },
] as const;

export type SampleId = (typeof SAMPLE_PEOPLE)[number]["id"];
export const SAMPLE_IDS = SAMPLE_PEOPLE.map((s) => s.id) as [SampleId, ...SampleId[]];

export function sampleFile(kind: "photo" | "video", id: string): string | null {
  return SAMPLE_PEOPLE.some((s) => s.id === id) ? `${kind === "photo" ? "photos" : "videos"}/${id}.${kind === "photo" ? "jpg" : "mp4"}` : null;
}

export function sampleSeconds(id: string): number | null {
  return SAMPLE_PEOPLE.find((s) => s.id === id)?.seconds ?? null;
}

/** Library asset ids. Library files are served through the same signed route as member media. */
export const libraryAssetId = (kind: "photo" | "video", id: string) => `lib-${kind === "photo" ? "ph" : "vd"}-${id}`;

export const REJECT_REASONS = [
  "Video does not match the photo",
  "Video is unclear or too short",
  "Age is unclear from the video",
  "Profile details are inconsistent",
] as const;

export const REPORT_REASONS = {
  fake: "Fake profile or someone else's photos",
  money: "Asked for money",
  harassment: "Harassment or unwanted contact",
  inappropriate: "Inappropriate content",
  underage: "Seems to be under 18",
  other: "Something else",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;
export const REPORT_REASON_IDS = Object.keys(REPORT_REASONS) as [ReportReason, ...ReportReason[]];
