import type { LookingFor } from "./types";

export const TERMS_VERSION = "2026-11-01";

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

/** Sample media a new member can pick instead of uploading. Files live in private-media/. */
export const SAMPLE_PHOTOS = [
  { id: "sample-a", label: "Sample photo A", file: "photos/sample-a.jpg", tint: ["#e6c9a8", "#9a6240"] },
  { id: "sample-b", label: "Sample photo B", file: "photos/sample-b.jpg", tint: ["#aec6e2", "#33557c"] },
  { id: "sample-c", label: "Sample photo C", file: "photos/sample-c.jpg", tint: ["#d6d3ad", "#66653a"] },
  { id: "sample-d", label: "Sample photo D", file: "photos/sample-d.jpg", tint: ["#e2bcbc", "#86505a"] },
] as const;

export const SAMPLE_VIDEOS = [
  { id: "clip-1", label: "Sample video 1", file: "videos/clip-1.mp4", tint: ["#9cc4bb", "#2f5d62"] },
  { id: "clip-2", label: "Sample video 2", file: "videos/clip-2.mp4", tint: ["#c9bedb", "#55497a"] },
  { id: "clip-3", label: "Sample video 3", file: "videos/clip-3.mp4", tint: ["#e6c9a8", "#9a6240"] },
  { id: "clip-4", label: "Sample video 4", file: "videos/clip-4.mp4", tint: ["#aec6e2", "#33557c"] },
  { id: "clip-5", label: "Sample video 5", file: "videos/clip-5.mp4", tint: ["#d6d3ad", "#66653a"] },
  { id: "clip-6", label: "Sample video 6", file: "videos/clip-6.mp4", tint: ["#e2bcbc", "#86505a"] },
] as const;

export type SamplePhotoId = (typeof SAMPLE_PHOTOS)[number]["id"];
export type SampleVideoId = (typeof SAMPLE_VIDEOS)[number]["id"];

export const SAMPLE_PHOTO_IDS = SAMPLE_PHOTOS.map((p) => p.id) as [SamplePhotoId, ...SamplePhotoId[]];
export const SAMPLE_VIDEO_IDS = SAMPLE_VIDEOS.map((v) => v.id) as [SampleVideoId, ...SampleVideoId[]];

export function sampleFile(kind: "photo" | "video", id: string): string | null {
  const list: ReadonlyArray<{ id: string; file: string }> = kind === "photo" ? SAMPLE_PHOTOS : SAMPLE_VIDEOS;
  return list.find((s) => s.id === id)?.file ?? null;
}

export const REJECT_REASONS = [
  "Video does not match the photo",
  "Video is unclear or too short",
  "Age is unclear from the video",
  "Profile details are inconsistent",
] as const;
