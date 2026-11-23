// Fictional seed data. Every person, place detail and message here is invented.
// The community launched in July 2026; 487 of the 500 founding places are taken.
import type {
  Access,
  Account,
  AuditEntry,
  Conversation,
  LookingFor,
  MediaAsset,
  Note,
  Report,
  Status,
  Visibility,
} from "./types";
import { SAMPLE_PEOPLE, TERMS_VERSION, libraryAssetId } from "./reference";
import { checklistSummary, promptsFor, type OptionalPromptId } from "./verification";
import { SAMPLE_LIBRARY } from "./types";

/** The seeded account behind the "Amara (member)" demo identity. */
export const DEMO_MEMBER_ID = "m01";
export const DEMO_MODERATOR_ID = "s01";
export const DEMO_ADMIN_ID = "s02";

/** Founding places taken by sign-ups before this sample (fictional). */
export const FOUNDING_PLACES_TAKEN = 487;

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
  extra: Record<string, string>;
  faith?: Record<string, string>;
  status: Status;
  /** status a suspension interrupted */
  before?: Status;
  photo: Visibility;
  video: Visibility;
  prompts: [OptionalPromptId, OptionalPromptId];
  seconds: number;
  joined: string;
  submitted: string;
  decision?: { reason: string | null; by: string; at: string };
  approved?: string;
  flag?: { reason: string; by: string; at: string };
  access: Access;
}

const free: Access = { kind: "free", until: null, setBy: null };
const founding = (until: string | null): Access => ({ kind: "founding", until, setBy: null });
const paid = (until: string): Access => ({ kind: "paid", until, setBy: null });

const members: SeedMember[] = [
  {
    id: "m01", name: "Amara Okafor", age: 31, city: "Toronto", country: "CA", detected: "CA",
    languages: ["English", "Igbo"], lookingFor: "relationship",
    about: "Architect. Weekends are for long walks, slow breakfasts and longer conversations.",
    extra: { occupation: "Architect", children: "none" },
    faith: { words: "Practising, and it matters to me", importance: "very", attendance: "weekly" },
    status: "approved", photo: "members", video: "members", prompts: ["o1", "o3"], seconds: 196,
    joined: "2026-07-28T09:10:00Z", submitted: "2026-07-28T09:20:00Z",
    decision: { reason: null, by: "s01", at: "2026-07-29T10:00:00Z" }, approved: "2026-07-29T10:00:00Z",
    access: founding("2026-10-29T10:00:00Z"), // her founding months have ended
  },
  {
    id: "m02", name: "Daniel Mekonnen", age: 34, city: "Washington", country: "US", detected: "US",
    languages: ["English", "Amharic"], lookingFor: "marriage",
    about: "Civil engineer, amateur baker, always reading two books at once.",
    extra: { occupation: "Civil engineer", children: "none" },
    status: "approved", photo: "members", video: "members", prompts: ["o2", "o5"], seconds: 212,
    joined: "2026-08-03T14:00:00Z", submitted: "2026-08-03T14:12:00Z",
    decision: { reason: null, by: "s01", at: "2026-08-04T09:30:00Z" }, approved: "2026-08-04T09:30:00Z",
    access: paid("2026-12-04T09:30:00Z"),
  },
  {
    id: "m03", name: "Lucía Herrera", age: 29, city: "Austin", country: "US", detected: "US",
    languages: ["Spanish", "English"], lookingFor: "relationship",
    about: "Pediatric nurse who loves salsa classes and Sunday dinners with her cousins. Keeps her photo private for now.",
    extra: { occupation: "Pediatric nurse", children: "none" },
    faith: { words: "Important to me", importance: "important", attendance: "monthly" },
    status: "approved", photo: "private", video: "members", prompts: ["o3", "o4"], seconds: 174,
    joined: "2026-09-10T18:00:00Z", submitted: "2026-09-10T18:09:00Z",
    decision: { reason: null, by: "s01", at: "2026-09-11T08:45:00Z" }, approved: "2026-09-11T08:45:00Z",
    access: founding("2026-12-11T08:45:00Z"),
  },
  {
    id: "m04", name: "Samuel Osei", age: 36, city: "London", country: "GB", detected: "GB",
    languages: ["English"], lookingFor: "marriage",
    about: "Secondary-school maths teacher and choir tenor. Keeps his video private.",
    extra: { occupation: "Teacher", children: "private" },
    status: "approved", photo: "members", video: "private", prompts: ["o2", "o6"], seconds: 233,
    joined: "2026-08-15T07:30:00Z", submitted: "2026-08-15T07:41:00Z",
    decision: { reason: null, by: "s01", at: "2026-08-15T16:20:00Z" }, approved: "2026-08-15T16:20:00Z",
    access: { kind: "complimentary", until: "2026-12-31T23:59:00Z", setBy: "s02" },
  },
  {
    id: "m05", name: "Grace Kimani", age: 30, city: "Nairobi", country: "KE", detected: "KE",
    languages: ["English", "Swahili"], lookingFor: "friendship",
    about: "Product designer who loves hiking and community gardening.",
    extra: { occupation: "Product designer" },
    status: "approved", photo: "members", video: "members", prompts: ["o1", "o6"], seconds: 158,
    joined: "2026-08-20T12:00:00Z", submitted: "2026-08-20T12:15:00Z",
    decision: { reason: null, by: "s01", at: "2026-08-21T09:00:00Z" }, approved: "2026-08-21T09:00:00Z",
    access: founding("2026-11-21T09:00:00Z"),
  },
  {
    id: "m06", name: "Jonah Whitfield", age: 38, city: "Chicago", country: "US", detected: "US",
    languages: ["English"], lookingFor: "relationship",
    about: "Carpenter. Builds furniture, fixes bikes, cooks for friends.",
    extra: { occupation: "Carpenter", children: "have" },
    status: "approved", photo: "members", video: "members", prompts: ["o4", "o5"], seconds: 141,
    joined: "2026-08-25T19:00:00Z", submitted: "2026-08-25T19:20:00Z",
    decision: { reason: null, by: "s01", at: "2026-08-26T11:10:00Z" }, approved: "2026-08-26T11:10:00Z",
    access: paid("2026-12-10T11:10:00Z"),
  },
  {
    id: "m07", name: "Priya Raman", age: 33, city: "Atlanta", country: "US", detected: "US",
    languages: ["English", "Hindi"], lookingFor: "marriage",
    about: "Pharmacist, early riser and keen cook. Keeps her video private for now.",
    extra: { occupation: "Pharmacist", children: "none" },
    faith: { words: "Practising", importance: "very", attendance: "weekly" },
    status: "approved", photo: "members", video: "private", prompts: ["o3", "o5"], seconds: 189,
    joined: "2026-09-01T15:00:00Z", submitted: "2026-09-01T15:04:00Z",
    decision: { reason: null, by: "s01", at: "2026-09-02T08:00:00Z" }, approved: "2026-09-02T08:00:00Z",
    access: founding("2026-12-02T08:00:00Z"),
  },
  {
    id: "m08", name: "Ruth Alemu", age: 27, city: "Seattle", country: "US", detected: "US",
    languages: ["English", "Amharic"], lookingFor: "relationship",
    about: "Software tester, runner, fan of very long phone calls with family.",
    extra: { occupation: "Software tester", children: "none" },
    status: "pending", photo: "members", video: "members", prompts: ["o1", "o4"], seconds: 203,
    joined: "2026-11-22T16:30:00Z", submitted: "2026-11-22T16:40:00Z",
    access: founding(null),
  },
  {
    id: "m09", name: "Michael Brandt", age: 41, city: "Denver", country: "US", detected: "DE",
    languages: ["English", "German"], lookingFor: "relationship",
    about: "Logistics manager who travels a lot for work.",
    extra: { occupation: "Logistics manager" },
    status: "pending", photo: "members", video: "members", prompts: ["o3", "o6"], seconds: 171,
    joined: "2026-11-22T10:50:00Z", submitted: "2026-11-22T11:02:00Z",
    flag: { reason: "Stated country (US) differs from detected country (DE)", by: "s01", at: "2026-11-22T18:04:00Z" },
    access: founding(null),
  },
  {
    id: "m10", name: "Esther Nakamura", age: 32, city: "Vancouver", country: "CA", detected: "CA",
    languages: ["English", "Japanese"], lookingFor: "friendship",
    about: "Physiotherapist and weekend potter.",
    extra: { occupation: "Physiotherapist", children: "none" },
    faith: { words: "Exploring", importance: "exploring", attendance: "occasionally" },
    status: "pending", photo: "members", video: "members", prompts: ["o2", "o5"], seconds: 108,
    joined: "2026-11-22T17:05:00Z", submitted: "2026-11-22T17:20:00Z",
    access: founding(null),
  },
  {
    id: "m11", name: "Tomás Silva", age: 35, city: "Lisbon", country: "PT", detected: "PT",
    languages: ["Portuguese", "English"], lookingFor: "relationship",
    about: "Photographer.",
    extra: { occupation: "Photographer" },
    status: "rejected", photo: "members", video: "members", prompts: ["o1", "o2"], seconds: 154,
    joined: "2026-11-18T20:00:00Z", submitted: "2026-11-18T20:10:00Z",
    decision: { reason: "Video does not match the photo", by: "s01", at: "2026-11-19T09:45:00Z" },
    access: founding(null),
  },
  {
    id: "m12", name: "Hannah Cole", age: 28, city: "Dublin", country: "IE", detected: "IE",
    languages: ["English"], lookingFor: "friendship",
    about: "Barista and illustrator.",
    extra: { occupation: "Barista and illustrator" },
    status: "suspended", before: "approved", photo: "members", video: "members", prompts: ["o1", "o5"], seconds: 166,
    joined: "2026-08-01T10:00:00Z", submitted: "2026-08-01T10:05:00Z",
    decision: { reason: "Repeated unsolicited messages after a warning", by: "s02", at: "2026-11-20T10:12:00Z" },
    approved: "2026-08-02T09:00:00Z",
    access: paid("2026-12-01T09:00:00Z"),
  },
  {
    id: "m13", name: "Victor Hale", age: 45, city: "Phoenix", country: "US", detected: "US",
    languages: ["English"], lookingFor: "marriage",
    about: "Sales.",
    extra: {},
    status: "banned", photo: "members", video: "members", prompts: ["o4", "o6"], seconds: 132,
    joined: "2026-11-15T22:00:00Z", submitted: "2026-11-15T22:03:00Z",
    decision: { reason: "Same person as a previously banned account", by: "s02", at: "2026-11-21T15:30:00Z" },
    access: founding(null),
  },
  {
    id: "m14", name: "Naomi Bekele", age: 26, city: "Minneapolis", country: "US", detected: "US",
    languages: ["English", "Amharic", "Tigrinya"], lookingFor: "friendship",
    about: "Graduate student in public health. Volunteers at a food bank on Saturdays.",
    extra: { occupation: "Graduate student", children: "none" },
    faith: { words: "Important to me", importance: "important", attendance: "weekly" },
    status: "approved", photo: "members", video: "members", prompts: ["o2", "o3"], seconds: 247,
    joined: "2026-09-03T13:00:00Z", submitted: "2026-09-03T13:08:00Z",
    decision: { reason: null, by: "s01", at: "2026-09-04T08:00:00Z" }, approved: "2026-09-04T08:00:00Z",
    access: founding("2026-12-04T08:00:00Z"),
  },
];

function staff(id: string, name: string, role: "moderator" | "admin"): Account {
  return {
    id, role, status: "approved", displayName: name, age: null, city: "", country: "US",
    detectedCountry: null, languages: ["English"], lookingFor: null, about: "", extra: {},
    faith: { consentedAt: null, answers: null }, terms: null, photoId: null, videoId: null,
    submittedAt: null, verification: null, approvedAt: null, suspendedFrom: null,
    createdAt: "2026-07-01T09:00:00Z", decision: null, flag: null, access: free,
    reportsClearedAt: null, isSelf: false,
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
    extra: m.extra,
    faith: m.faith ? { consentedAt: m.joined, answers: m.faith } : { consentedAt: null, answers: null },
    terms: { version: TERMS_VERSION, acceptedAt: m.joined },
    photoId: `ph-${m.id}`,
    videoId: `vd-${m.id}`,
    submittedAt: m.submitted,
    verification: { prompts: promptsFor(m.prompts), seconds: m.seconds },
    approvedAt: m.approved ?? null,
    suspendedFrom: m.before ?? null,
    createdAt: m.joined,
    decision: m.decision ? { status: m.status, ...m.decision } : null,
    flag: m.flag ?? null,
    access: m.access,
    reportsClearedAt: null,
    isSelf: false,
  })),
  staff(DEMO_MODERATOR_ID, "Morgan Lee", "moderator"),
  staff(DEMO_ADMIN_ID, "Riley Park", "admin"),
];

export const SEED_ASSETS: readonly MediaAsset[] = [
  ...members.flatMap<MediaAsset>((m) => [
    { id: `ph-${m.id}`, ownerId: m.id, kind: "photo", file: `photos/${m.id}.jpg`, visibility: m.photo },
    { id: `vd-${m.id}`, ownerId: m.id, kind: "video", file: `videos/${m.id}.mp4`, visibility: m.video },
  ]),
  // The sample library: fictional files a new member picks from. They belong to no member.
  ...SAMPLE_PEOPLE.flatMap<MediaAsset>((s) => [
    { id: libraryAssetId("photo", s.id), ownerId: SAMPLE_LIBRARY, kind: "photo", file: `photos/${s.id}.jpg`, visibility: "members" },
    { id: libraryAssetId("video", s.id), ownerId: SAMPLE_LIBRARY, kind: "video", file: `videos/${s.id}.mp4`, visibility: "members" },
  ]),
];

/** [blocker, blocked] */
export const SEED_BLOCKS: ReadonlyArray<readonly [string, string]> = [
  ["m01", "m05"], // the demo member blocked Grace
  ["m06", "m01"], // Jonah blocked the demo member
  ["m03", "m04"],
];

const msg = (from: string, at: string, text: string) => ({ from, at, text });

export const SEED_CONVERSATIONS: readonly Conversation[] = [
  {
    id: "c1", members: ["m01", "m02"], state: "active", startedBy: "m02", at: "2026-11-21T19:12:00Z",
    messages: [
      msg("m02", "2026-11-20T18:40:00Z", "Hi Amara, I saw you like long walks. Do you have a favourite route in Toronto?"),
      msg("m01", "2026-11-21T08:15:00Z", "The waterfront trail, early on a Sunday. And a good book for the bench at the end."),
      msg("m02", "2026-11-21T19:12:00Z", "A good book for the bench sounds right. What are you reading at the moment?"),
    ],
  },
  {
    id: "c2", members: ["m01", "m14"], state: "active", startedBy: "m01", at: "2026-11-20T16:40:00Z",
    messages: [
      msg("m01", "2026-10-12T12:00:00Z", "Hi Naomi, your Saturdays at the food bank sound wonderful."),
      msg("m14", "2026-10-12T15:30:00Z", "Thank you! We always need more hands, especially before the holidays."),
      msg("m01", "2026-11-20T16:40:00Z", "Are you going to the volunteer day on Saturday?"),
    ],
  },
  {
    id: "c3", members: ["m01", "m12"], state: "active", startedBy: "m12", at: "2026-11-19T22:05:00Z",
    messages: [msg("m12", "2026-11-19T22:05:00Z", "Hello again, did you see my last message?")],
  },
  {
    id: "c4", members: ["m06", "m01"], state: "active", startedBy: "m06", at: "2026-11-12T12:00:00Z",
    messages: [msg("m06", "2026-11-12T12:00:00Z", "Nice to meet you at the meetup.")],
  },
  {
    id: "c5", members: ["m02", "m03"], state: "active", startedBy: "m02", at: "2026-11-18T08:30:00Z",
    messages: [msg("m02", "2026-11-18T08:30:00Z", "Good luck with the night shifts this week.")],
  },
  {
    // An incoming request: Amara can accept or decline it without paying.
    id: "c6", members: ["m07", "m01"], state: "requested", startedBy: "m07", at: "2026-11-22T20:05:00Z",
    messages: [msg("m07", "2026-11-22T20:05:00Z", "Hello Amara, your profile made me smile. I'm an early riser too. Would you like to talk?")],
  },
];

export const SEED_NOTES: readonly Note[] = [
  { id: "n1", at: "2026-11-22T18:05:00Z", authorId: "s01", targetId: "m09", text: "Detected country is Germany, profile says Denver. Could be travel or a VPN. Asking an admin for a second look before approving." },
  { id: "n2", at: "2026-11-20T10:14:00Z", authorId: "s02", targetId: "m12", text: "Two reports in one week after a written warning. Suspended until we have spoken with her." },
  { id: "n3", at: "2026-11-19T09:44:00Z", authorId: "s01", targetId: "m11", text: "A different person in the video: hairline, glasses and skin tone do not match the photo. Rejected; he can submit again." },
];

/** Two open reports on Samuel: a third one hides him until a moderator reviews them. */
export const SEED_REPORTS: readonly Report[] = [
  { id: "r1", at: "2026-11-20T09:00:00Z", reporterId: "m02", targetId: "m04", reason: "money" },
  { id: "r2", at: "2026-11-21T17:30:00Z", reporterId: "m14", targetId: "m04", reason: "money" },
];

const approvals: AuditEntry[] = members
  .filter((m) => m.approved)
  .map((m, i) => {
    const account = SEED_ACCOUNTS.find((a) => a.id === m.id)!;
    const all = { samePerson: true, prompts: account.verification!.prompts, languages: account.languages };
    return { id: `ap${i + 1}`, at: m.approved!, actorId: "s01", action: "approve" as const, targetId: m.id, reason: checklistSummary(account, all) };
  });

export const SEED_AUDIT: readonly AuditEntry[] = [
  { id: "a19", at: "2026-11-22T18:04:00Z", actorId: "s01", action: "flag", targetId: "m09", reason: "Stated country (US) differs from detected country (DE)" },
  { id: "a18", at: "2026-11-22T17:20:00Z", actorId: "m10", action: "submit", targetId: "m10", reason: null },
  { id: "a17", at: "2026-11-22T16:40:00Z", actorId: "m08", action: "submit", targetId: "m08", reason: null },
  { id: "a16", at: "2026-11-22T11:02:00Z", actorId: "m09", action: "submit", targetId: "m09", reason: null },
  { id: "a15", at: "2026-11-21T17:30:00Z", actorId: "m14", action: "report", targetId: "m04", reason: "Asked for money" },
  { id: "a14", at: "2026-11-21T15:30:00Z", actorId: "s02", action: "ban", targetId: "m13", reason: "Same person as a previously banned account" },
  { id: "a13", at: "2026-11-20T10:12:00Z", actorId: "s02", action: "suspend", targetId: "m12", reason: "Repeated unsolicited messages after a warning" },
  { id: "a12", at: "2026-11-20T09:00:00Z", actorId: "m02", action: "report", targetId: "m04", reason: "Asked for money" },
  { id: "a11", at: "2026-11-19T09:45:00Z", actorId: "s01", action: "reject", targetId: "m11", reason: "Video does not match the photo" },
  { id: "a10", at: "2026-11-18T14:20:00Z", actorId: "m01", action: "block", targetId: "m05", reason: null },
  { id: "a09", at: "2026-11-16T10:00:00Z", actorId: "s02", action: "access_changed", targetId: "m04", reason: "Complimentary access until Dec 31, 2026" },
  ...approvals,
];
