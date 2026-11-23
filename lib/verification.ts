// The verification recording (R2): a 2 to 5 minute video answering five prompts, three
// fixed and two the member chooses, spoken in every language on the profile. The approval
// gate below is what a moderator's "Approve" has to pass, here and in production.
import type { Account } from "./types";

export const RECORDING_SECONDS = { min: 120, max: 300 } as const;
export const PROMPT_COUNT = 5;
export const CHOSEN_PROMPTS = 2;

export const FIXED_PROMPTS = [
  { id: "f1", short: "Name and city", text: "Say your first name and the city you live in." },
  { id: "f2", short: "Today's date and a slow head turn", text: "Say today's date, then turn your head slowly to the left and to the right." },
  { id: "f3", short: "What they hope to find here", text: "In your own words, what do you hope to find here?" },
] as const;

export const OPTIONAL_PROMPTS = [
  { id: "o1", short: "A good weekend", text: "What does a good weekend look like for you?" },
  { id: "o2", short: "Who shaped them", text: "Who has shaped the person you are today?" },
  { id: "o3", short: "Values in a relationship", text: "What values matter most to you in a relationship?" },
  { id: "o4", short: "A family tradition", text: "Describe a family tradition you would like to keep." },
  { id: "o5", short: "Grateful for this week", text: "What are you grateful for this week?" },
  { id: "o6", short: "Helping in the community", text: "How do you like to help in your community?" },
] as const;

export type OptionalPromptId = (typeof OPTIONAL_PROMPTS)[number]["id"];
export const FIXED_PROMPT_IDS: string[] = FIXED_PROMPTS.map((p) => p.id);
export const OPTIONAL_PROMPT_IDS = OPTIONAL_PROMPTS.map((p) => p.id) as [OptionalPromptId, ...OptionalPromptId[]];

const ALL_PROMPTS: ReadonlyArray<{ id: string; short: string; text: string }> = [...FIXED_PROMPTS, ...OPTIONAL_PROMPTS];

export function prompt(id: string) {
  return ALL_PROMPTS.find((p) => p.id === id) ?? null;
}

/** The five prompts a recording answers: the three fixed ones, then the member's choices. */
export function promptsFor(chosen: readonly string[]): string[] {
  return [...FIXED_PROMPT_IDS, ...chosen];
}

/** "3:05" */
export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function recordingLengthOk(seconds: number): boolean {
  return seconds >= RECORDING_SECONDS.min && seconds <= RECORDING_SECONDS.max;
}

/** What the moderator ticks while watching. */
export interface Checklist {
  samePerson: boolean;
  /** Prompt ids the moderator heard answered. */
  prompts: string[];
  /** Languages the moderator heard. */
  languages: string[];
}

// #region approval
/** Everything that stops an approval. Empty means the moderator may approve. */
export function approvalProblems(member: Account, checklist: Checklist): string[] {
  const rec = member.verification;
  if (!member.photoId || !member.videoId || !rec) {
    return ["This profile has not submitted a photo and video yet."];
  }
  const problems: string[] = [];
  const { min, max } = RECORDING_SECONDS;
  const length = formatDuration(rec.seconds);
  const asked = new Set(rec.prompts);
  const skipped = FIXED_PROMPT_IDS.filter((id) => !asked.has(id)).length;

  // The recording itself
  if (skipped > 0) problems.push(`The recording skips ${skipped} fixed ${skipped === 1 ? "prompt" : "prompts"}.`);
  if (asked.size < PROMPT_COUNT) problems.push(`The recording answers ${asked.size} of ${PROMPT_COUNT} prompts.`);
  if (rec.seconds < min) problems.push(`The recording is ${length}, under the 2:00 minimum.`);
  if (rec.seconds > max) problems.push(`The recording is ${length}, over the 5:00 maximum.`);

  // What the moderator saw and heard
  const total = rec.prompts.length;
  const heard = rec.prompts.filter((id) => checklist.prompts.includes(id)).length;
  const unticked = member.languages.filter((language) => !checklist.languages.includes(language));
  if (!checklist.samePerson) problems.push("Confirm the video shows the person in the photo.");
  if (heard < total) problems.push(`Tick every prompt you heard answered (${heard} of ${total} ticked).`);
  if (unticked.length > 0) problems.push(`Tick each language you heard (${unticked.join(", ")} not ticked).`);
  return problems;
}
// #endregion

/** One line for the audit log, recorded with the approval. */
export function checklistSummary(member: Account, checklist: Checklist): string {
  const seconds = member.verification?.seconds ?? 0;
  const heard = member.languages.filter((l) => checklist.languages.includes(l));
  return `Checklist: same person; prompts ${checklist.prompts.length}/${PROMPT_COUNT}; heard ${heard.join(", ")}; length ${formatDuration(seconds)}`;
}
