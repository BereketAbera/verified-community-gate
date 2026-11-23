// Fictional seed data. Every person, place detail and message here is invented.
import type {
  Account,
  AuditEntry,
  Conversation,
  LookingFor,
  MediaAsset,
  Note,
  Status,
  Visibility,
} from "./types";
import { TERMS_VERSION } from "./reference";

/** The seeded account behind the "Approved member" demo identity. */
export const DEMO_MEMBER_ID = "m01";
export const DEMO_MODERATOR_ID = "s01";
export const DEMO_ADMIN_ID = "s02";

interface SeedMember {
  id: string;
  name: string;
  age: number;
  city: string;
  country: string;
  detected: string;
  languages: string[];
  lookingFor: LookingFor;
  about: string;
  faith?: string;
  status: Status;
  photo: Visibility;
  video: Visibility;
  clip: number;
  joined: string;
  submitted: string;
  decision?: { reason: string | null; by: string; at: string };
  flag?: { reason: string; by: string; at: string };
}

const members: SeedMember[] = [
  {
    id: "m01", name: "Amara Okafor", age: 31, city: "Toronto", country: "CA", detected: "CA",
    languages: ["English", "Igbo"], lookingFor: "relationship",
    about: "Architect. Weekends are for long walks, slow breakfasts and longer conversations.",
    faith: "Practising, and it matters to me", status: "approved", photo: "members", video: "members", clip: 1,
    joined: "2026-10-28T09:10:00Z", submitted: "2026-10-28T09:20:00Z",
    decision: { reason: null, by: "s01", at: "2026-10-29T10:00:00Z" },
  },
  {
    id: "m02", name: "Daniel Mekonnen", age: 34, city: "Washington", country: "US", detected: "US",
    languages: ["English", "Amharic"], lookingFor: "marriage",
    about: "Civil engineer, amateur baker, always reading two books at once.",
    status: "approved", photo: "members", video: "members", clip: 2,
    joined: "2026-10-30T14:00:00Z", submitted: "2026-10-30T14:12:00Z",
    decision: { reason: null, by: "s01", at: "2026-10-31T09:30:00Z" },
  },
  {
    id: "m03", name: "Lucía Herrera", age: 29, city: "Austin", country: "US", detected: "US",
    languages: ["Spanish", "English"], lookingFor: "relationship",
    about: "Pediatric nurse. Keeps her photo private until a conversation has started.",
    faith: "Important to me", status: "approved", photo: "private", video: "members", clip: 3,
    joined: "2026-11-02T18:00:00Z", submitted: "2026-11-02T18:09:00Z",
    decision: { reason: null, by: "s01", at: "2026-11-03T08:45:00Z" },
  },
  {
    id: "m04", name: "Samuel Osei", age: 36, city: "London", country: "GB", detected: "GB",
    languages: ["English"], lookingFor: "marriage",
    about: "Secondary-school maths teacher and choir tenor. Video kept private.",
    status: "approved", photo: "members", video: "private", clip: 4,
    joined: "2026-11-04T07:30:00Z", submitted: "2026-11-04T07:41:00Z",
    decision: { reason: null, by: "s01", at: "2026-11-04T16:20:00Z" },
  },
  {
    id: "m05", name: "Grace Kimani", age: 30, city: "Nairobi", country: "KE", detected: "KE",
    languages: ["English", "Swahili"], lookingFor: "friendship",
    about: "Product designer who loves hiking and community gardening.",
    status: "approved", photo: "members", video: "members", clip: 5,
    joined: "2026-11-05T12:00:00Z", submitted: "2026-11-05T12:15:00Z",
    decision: { reason: null, by: "s01", at: "2026-11-06T09:00:00Z" },
  },
  {
    id: "m06", name: "Jonah Whitfield", age: 38, city: "Chicago", country: "US", detected: "US",
    languages: ["English"], lookingFor: "relationship",
    about: "Carpenter. Builds furniture, fixes bikes, cooks for friends.",
    status: "approved", photo: "members", video: "members", clip: 6,
    joined: "2026-11-06T19:00:00Z", submitted: "2026-11-06T19:20:00Z",
    decision: { reason: null, by: "s01", at: "2026-11-07T11:10:00Z" },
  },
  {
    id: "m07", name: "Priya Raman", age: 33, city: "Atlanta", country: "US", detected: "US",
    languages: ["English", "Hindi"], lookingFor: "marriage",
    about: "Pharmacist. Shares her photo and video only after a first conversation.",
    faith: "Practising", status: "approved", photo: "private", video: "private", clip: 1,
    joined: "2026-11-08T15:00:00Z", submitted: "2026-11-08T15:04:00Z",
    decision: { reason: null, by: "s01", at: "2026-11-09T08:00:00Z" },
  },
  {
    id: "m08", name: "Ruth Alemu", age: 27, city: "Seattle", country: "US", detected: "US",
    languages: ["English", "Amharic"], lookingFor: "relationship",
    about: "Software tester, runner, fan of very long phone calls with family.",
    status: "pending", photo: "members", video: "members", clip: 2,
    joined: "2026-11-22T16:30:00Z", submitted: "2026-11-22T16:40:00Z",
  },
  {
    id: "m09", name: "Michael Brandt", age: 41, city: "Denver", country: "US", detected: "DE",
    languages: ["English", "German"], lookingFor: "relationship",
    about: "Logistics manager who travels a lot for work.",
    status: "pending", photo: "members", video: "members", clip: 3,
    joined: "2026-11-22T10:50:00Z", submitted: "2026-11-22T11:02:00Z",
    flag: { reason: "Stated country (US) differs from detected country (DE)", by: "s01", at: "2026-11-22T18:04:00Z" },
  },
  {
    id: "m10", name: "Esther Nakamura", age: 32, city: "Vancouver", country: "CA", detected: "CA",
    languages: ["English", "Japanese"], lookingFor: "friendship",
    about: "Physiotherapist and weekend potter.",
    faith: "Exploring", status: "pending", photo: "members", video: "members", clip: 4,
    joined: "2026-11-22T17:05:00Z", submitted: "2026-11-22T17:20:00Z",
  },
  {
    id: "m11", name: "Tomás Silva", age: 35, city: "Lisbon", country: "PT", detected: "PT",
    languages: ["Portuguese", "English"], lookingFor: "relationship",
    about: "Photographer.",
    status: "rejected", photo: "members", video: "members", clip: 5,
    joined: "2026-11-18T20:00:00Z", submitted: "2026-11-18T20:10:00Z",
    decision: { reason: "Video does not match the photo", by: "s01", at: "2026-11-19T09:45:00Z" },
  },
  {
    id: "m12", name: "Hannah Cole", age: 28, city: "Dublin", country: "IE", detected: "IE",
    languages: ["English"], lookingFor: "friendship",
    about: "Barista and illustrator.",
    status: "suspended", photo: "members", video: "members", clip: 6,
    joined: "2026-11-01T10:00:00Z", submitted: "2026-11-01T10:05:00Z",
    decision: { reason: "Repeated unsolicited messages after a warning", by: "s02", at: "2026-11-20T10:12:00Z" },
  },
  {
    id: "m13", name: "Victor Hale", age: 45, city: "Phoenix", country: "US", detected: "US",
    languages: ["English"], lookingFor: "marriage",
    about: "Sales.",
    status: "banned", photo: "members", video: "members", clip: 1,
    joined: "2026-11-15T22:00:00Z", submitted: "2026-11-15T22:03:00Z",
    decision: { reason: "Same person as a previously banned account", by: "s02", at: "2026-11-21T15:30:00Z" },
  },
  {
    id: "m14", name: "Naomi Bekele", age: 26, city: "Minneapolis", country: "US", detected: "US",
    languages: ["English", "Amharic", "Tigrinya"], lookingFor: "friendship",
    about: "Graduate student in public health. Volunteers at a food bank on Saturdays.",
    faith: "Important to me", status: "approved", photo: "members", video: "members", clip: 2,
    joined: "2026-11-16T13:00:00Z", submitted: "2026-11-16T13:08:00Z",
    decision: { reason: null, by: "s01", at: "2026-11-17T08:00:00Z" },
  },
];

function staff(id: string, name: string, role: "moderator" | "admin"): Account {
  return {
    id, role, status: "approved", displayName: name, age: null, city: "", country: "US",
    detectedCountry: null, languages: ["English"], lookingFor: null, about: "",
    faith: { consentedAt: null, value: null }, terms: null, photoId: null, videoId: null,
    submittedAt: null, createdAt: "2026-10-01T09:00:00Z", decision: null, flag: null, isSelf: false,
  };
}

export const SEED_ACCOUNTS: readonly Account[] = [
  ...members.map<Account>((m) => ({
    id: m.id,
    role: "member",
    status: m.status,
    displayName: m.name,
    age: m.age,
    city: m.city,
    country: m.country,
    detectedCountry: m.detected,
    languages: m.languages,
    lookingFor: m.lookingFor,
    about: m.about,
    faith: m.faith
      ? { consentedAt: m.joined, value: m.faith }
      : { consentedAt: null, value: null },
    terms: { version: TERMS_VERSION, acceptedAt: m.joined },
    photoId: `ph-${m.id}`,
    videoId: `vd-${m.id}`,
    submittedAt: m.submitted,
    createdAt: m.joined,
    decision: m.decision ? { status: m.status, ...m.decision } : null,
    flag: m.flag ?? null,
    isSelf: false,
  })),
  staff(DEMO_MODERATOR_ID, "Morgan Lee", "moderator"),
  staff(DEMO_ADMIN_ID, "Riley Park", "admin"),
];

export const SEED_ASSETS: readonly MediaAsset[] = members.flatMap<MediaAsset>((m) => [
  { id: `ph-${m.id}`, ownerId: m.id, kind: "photo", file: `photos/${m.id}.jpg`, visibility: m.photo },
  { id: `vd-${m.id}`, ownerId: m.id, kind: "video", file: `videos/clip-${m.clip}.mp4`, visibility: m.video },
]);

/** [blocker, blocked] */
export const SEED_BLOCKS: ReadonlyArray<readonly [string, string]> = [
  ["m01", "m05"], // the demo member blocked Grace
  ["m06", "m01"], // Jonah blocked the demo member
  ["m03", "m04"],
];

export const SEED_CONVERSATIONS: readonly Conversation[] = [
  { id: "c1", members: ["m01", "m02"], state: "active", startedBy: "m02", preview: "Thanks for the book recommendation. I'll start it this week.", at: "2026-11-21T19:12:00Z" },
  { id: "c2", members: ["m01", "m14"], state: "active", startedBy: "m01", preview: "Are you going to the volunteer day on Saturday?", at: "2026-11-20T16:40:00Z" },
  { id: "c3", members: ["m01", "m12"], state: "active", startedBy: "m12", preview: "Hello again, did you see my last message?", at: "2026-11-19T22:05:00Z" },
  { id: "c4", members: ["m06", "m01"], state: "active", startedBy: "m06", preview: "Nice to meet you at the meetup.", at: "2026-11-12T12:00:00Z" },
  { id: "c5", members: ["m02", "m03"], state: "active", startedBy: "m02", preview: "Good luck with the night shifts this week.", at: "2026-11-18T08:30:00Z" },
];

export const SEED_NOTES: readonly Note[] = [
  { id: "n1", at: "2026-11-22T18:05:00Z", authorId: "s01", targetId: "m09", text: "Detected country is Germany, profile says Denver. Could be travel or a VPN. Asking an admin for a second look before approving." },
  { id: "n2", at: "2026-11-20T10:14:00Z", authorId: "s02", targetId: "m12", text: "Two reports in one week after a written warning. Suspended until we have spoken with her." },
];

export const SEED_AUDIT: readonly AuditEntry[] = [
  { id: "a17", at: "2026-11-22T18:04:00Z", actorId: "s01", action: "flag", targetId: "m09", reason: "Stated country (US) differs from detected country (DE)" },
  { id: "a16", at: "2026-11-22T17:20:00Z", actorId: "m10", action: "submit", targetId: "m10", reason: null },
  { id: "a15", at: "2026-11-22T16:40:00Z", actorId: "m08", action: "submit", targetId: "m08", reason: null },
  { id: "a14", at: "2026-11-22T11:02:00Z", actorId: "m09", action: "submit", targetId: "m09", reason: null },
  { id: "a13", at: "2026-11-21T15:30:00Z", actorId: "s02", action: "ban", targetId: "m13", reason: "Same person as a previously banned account" },
  { id: "a12", at: "2026-11-20T10:12:00Z", actorId: "s02", action: "suspend", targetId: "m12", reason: "Repeated unsolicited messages after a warning" },
  { id: "a11", at: "2026-11-19T09:45:00Z", actorId: "s01", action: "reject", targetId: "m11", reason: "Video does not match the photo" },
  { id: "a10", at: "2026-11-18T14:20:00Z", actorId: "m01", action: "block", targetId: "m05", reason: null },
  { id: "a09", at: "2026-11-17T08:00:00Z", actorId: "s01", action: "approve", targetId: "m14", reason: null },
  { id: "a08", at: "2026-11-09T08:00:00Z", actorId: "s01", action: "approve", targetId: "m07", reason: null },
  { id: "a07", at: "2026-11-07T11:10:00Z", actorId: "s01", action: "approve", targetId: "m06", reason: null },
  { id: "a06", at: "2026-11-06T09:00:00Z", actorId: "s01", action: "approve", targetId: "m05", reason: null },
  { id: "a05", at: "2026-11-04T16:20:00Z", actorId: "s01", action: "approve", targetId: "m04", reason: null },
  { id: "a04", at: "2026-11-03T08:45:00Z", actorId: "s01", action: "approve", targetId: "m03", reason: null },
  { id: "a03", at: "2026-10-31T09:30:00Z", actorId: "s01", action: "approve", targetId: "m02", reason: null },
  { id: "a02", at: "2026-10-29T10:00:00Z", actorId: "s01", action: "approve", targetId: "m01", reason: null },
];
