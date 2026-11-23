export const STATUSES = ["approved", "pending", "rejected", "suspended", "banned"] as const;
export type Status = (typeof STATUSES)[number];

export const ROLES = ["member", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Who may see a photo or video: approved members, or nobody but the owner and moderators. */
export const VISIBILITIES = ["members", "private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export type MediaKind = "photo" | "video";

export const LOOKING_FOR = ["friendship", "relationship", "marriage"] as const;
export type LookingFor = (typeof LOOKING_FOR)[number];

/** Demo identities a visitor can switch between. There is no real sign-in. */
export const IDENTITIES = ["visitor", "newcomer", "member", "moderator", "admin"] as const;
export type Identity = (typeof IDENTITIES)[number];

/**
 * Access to start conversations. Creating a profile, browsing and replying are free.
 * Paid comes from the payment processor; complimentary is set by staff; founding is the
 * three free months for the first 500 sign-ups.
 */
export const ACCESS_KINDS = ["free", "paid", "complimentary", "founding"] as const;
export type AccessKind = (typeof ACCESS_KINDS)[number];

export interface Access {
  kind: AccessKind;
  /** End of the paid period, complimentary grant or founding months. Null: not started yet. */
  until: string | null;
  /** Staff member who set complimentary access. */
  setBy: string | null;
}

export interface Decision {
  status: Status;
  reason: string | null;
  by: string;
  at: string;
}

export interface Flag {
  reason: string | null;
  by: string;
  at: string;
}

/** What the member's recording covers, as reported by the recorder. */
export interface Verification {
  /** The prompts answered: three fixed and the two the member chose. */
  prompts: string[];
  /** Length of the recording in seconds. */
  seconds: number;
}

export interface Account {
  id: string;
  role: Role;
  status: Status;
  displayName: string;
  age: number | null;
  city: string;
  /** Country the member stated (ISO 3166-1 alpha-2). */
  country: string;
  /** Country detected from the request at signup, if any. Shown to staff only. */
  detectedCountry: string | null;
  languages: string[];
  lookingFor: LookingFor | null;
  about: string;
  /** Optional profile fields from lib/profile-fields.ts. */
  extra: Record<string, string>;
  /** Faith-related answers are stored only with their own, separate consent. */
  faith: { consentedAt: string | null; answers: Record<string, string> | null };
  terms: { version: string; acceptedAt: string } | null;
  photoId: string | null;
  videoId: string | null;
  /** When the current photo and video were submitted for review. */
  submittedAt: string | null;
  verification: Verification | null;
  /** When a moderator last approved this member's photo and video. */
  approvedAt: string | null;
  /** The status a suspension interrupted; reinstating restores it. */
  suspendedFrom: Status | null;
  createdAt: string;
  decision: Decision | null;
  flag: Flag | null;
  access: Access;
  /** Reports filed before this time were reviewed by a moderator. */
  reportsClearedAt: string | null;
  /** True for the visitor's own signup in this browser. */
  isSelf: boolean;
}

/** Media that belongs to no member: the fictional files a new member picks from. */
export const SAMPLE_LIBRARY = "library";

export interface MediaAsset {
  id: string;
  /** A member id, or SAMPLE_LIBRARY. */
  ownerId: string;
  kind: MediaKind;
  /** Path relative to private-media/. Never exposed to clients. */
  file: string;
  visibility: Visibility;
}

export interface Message {
  from: string;
  text: string;
  at: string;
}

export interface Conversation {
  id: string;
  members: [string, string];
  /** "requested" until the other member accepts. */
  state: "active" | "requested";
  startedBy: string;
  at: string;
  messages: Message[];
}

export interface Note {
  id: string;
  at: string;
  authorId: string;
  targetId: string;
  text: string;
}

export interface Report {
  id: string;
  at: string;
  reporterId: string;
  targetId: string;
  reason: string;
}

export const AUDIT_ACTIONS = [
  "signup",
  "submit",
  "approve",
  "reject",
  "flag",
  "note",
  "suspend",
  "ban",
  "reinstate",
  "media_replaced",
  "visibility_changed",
  "block",
  "unblock",
  "report",
  "reports_cleared",
  "access_changed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  action: AuditAction;
  targetId: string;
  reason: string | null;
}

/** Everything the app knows for one request: seed data plus this visitor's sandbox. */
export interface World {
  /** milliseconds since epoch */
  now: number;
  accounts: ReadonlyMap<string, Account>;
  assets: ReadonlyMap<string, MediaAsset>;
  /** [blocker, blocked] */
  blocks: ReadonlyArray<readonly [string, string]>;
  conversations: Conversation[];
  notes: Note[];
  reports: Report[];
  audit: AuditEntry[];
  /** Founding places taken so far, out of FOUNDING.places. */
  foundingPlacesTaken: number;
}

/** A 60-second media link, issued only after a policy check. */
export interface SignedLink {
  url: string;
  exp: number;
  assetId: string;
  kind: MediaKind;
  visibility: Visibility;
}

export interface MemberFilters {
  q?: string;
  country?: string;
  language?: string;
  lookingFor?: LookingFor;
}
