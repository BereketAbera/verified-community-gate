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

export interface Account {
  id: string;
  role: Role;
  status: Status;
  displayName: string;
  age: number | null;
  city: string;
  /** Country the member stated (ISO 3166-1 alpha-2). */
  country: string;
  /** Country detected from the request at signup, if any. */
  detectedCountry: string | null;
  languages: string[];
  lookingFor: LookingFor | null;
  about: string;
  /** Faith-related data is stored only with its own, separate consent. */
  faith: { consentedAt: string | null; value: string | null };
  terms: { version: string; acceptedAt: string } | null;
  photoId: string | null;
  videoId: string | null;
  /** When the current photo and video were submitted for review. */
  submittedAt: string | null;
  createdAt: string;
  decision: Decision | null;
  flag: Flag | null;
  /** True for the visitor's own signup in this browser. */
  isSelf: boolean;
}

export interface MediaAsset {
  id: string;
  ownerId: string;
  kind: MediaKind;
  /** Path relative to private-media/. Never exposed to clients. */
  file: string;
  visibility: Visibility;
}

export interface Conversation {
  id: string;
  members: [string, string];
  state: "active" | "requested";
  startedBy: string;
  preview: string;
  at: string;
}

export interface Note {
  id: string;
  at: string;
  authorId: string;
  targetId: string;
  text: string;
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
  now: number;
  accounts: ReadonlyMap<string, Account>;
  assets: ReadonlyMap<string, MediaAsset>;
  /** [blocker, blocked] */
  blocks: ReadonlyArray<readonly [string, string]>;
  conversations: Conversation[];
  notes: Note[];
  audit: AuditEntry[];
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
