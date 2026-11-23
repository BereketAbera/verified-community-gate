import { TERMS_VERSION } from "@/lib/reference";
import type { Access, Account, MediaAsset, Report, Role, Status, Visibility, World } from "@/lib/types";
import { promptsFor } from "@/lib/verification";

export const NOW_MS = Date.parse("2026-11-23T12:00:00Z");

/** A member who can start conversations, unless a test says otherwise. */
export const ACTIVE: Access = { kind: "paid", until: "2027-01-01T00:00:00Z", setBy: null };

export function account(id: string, role: Role, status: Status, overrides: Partial<Account> = {}): Account {
  const member = role === "member";
  return {
    id,
    role,
    status,
    displayName: id,
    age: 30,
    city: "Springfield",
    country: "US",
    detectedCountry: "US",
    languages: ["English"],
    lookingFor: "friendship",
    about: "",
    extra: {},
    faith: { consentedAt: null, answers: null },
    terms: { version: TERMS_VERSION, acceptedAt: "2026-11-01T00:00:00Z" },
    photoId: member ? `ph-${id}` : null,
    videoId: member ? `vd-${id}` : null,
    submittedAt: "2026-11-01T00:00:00Z",
    verification: member ? { prompts: promptsFor(["o1", "o2"]), seconds: 180 } : null,
    // Approved, suspended and banned members were approved by a moderator at some point.
    approvedAt: member && ["approved", "suspended", "banned"].includes(status) ? "2026-11-02T00:00:00Z" : null,
    suspendedFrom: status === "suspended" ? "approved" : null,
    createdAt: "2026-11-01T00:00:00Z",
    decision: null,
    flag: null,
    access: ACTIVE,
    reportsClearedAt: null,
    isSelf: false,
    ...overrides,
  };
}

export function assetsFor(owner: Account, photo: Visibility, video: Visibility): MediaAsset[] {
  return [
    { id: `ph-${owner.id}`, ownerId: owner.id, kind: "photo", file: "photos/m01.jpg", visibility: photo },
    { id: `vd-${owner.id}`, ownerId: owner.id, kind: "video", file: "videos/m01.mp4", visibility: video },
  ];
}

export function reports(targetId: string, count: number, at = "2026-11-20T00:00:00Z"): Report[] {
  return Array.from({ length: count }, (_, i) => ({ id: `r${targetId}${i}`, at, reporterId: `reporter${i}`, targetId, reason: "other" }));
}

export function world(
  accounts: Account[],
  options: { blocks?: Array<[string, string]>; assets?: MediaAsset[]; reports?: Report[] } = {},
): World {
  return {
    now: NOW_MS,
    accounts: new Map(accounts.map((a) => [a.id, a])),
    assets: new Map((options.assets ?? []).map((a) => [a.id, a])),
    blocks: options.blocks ?? [],
    conversations: [],
    notes: [],
    reports: options.reports ?? [],
    audit: [],
    foundingPlacesTaken: 0,
  };
}
