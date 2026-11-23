import type { Account, MediaAsset, Role, Status, Visibility, World } from "@/lib/types";

export function account(id: string, role: Role, status: Status): Account {
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
    faith: { consentedAt: null, value: null },
    terms: { version: "2026-11-01", acceptedAt: "2026-11-01T00:00:00Z" },
    photoId: role === "member" ? `ph-${id}` : null,
    videoId: role === "member" ? `vd-${id}` : null,
    submittedAt: "2026-11-01T00:00:00Z",
    createdAt: "2026-11-01T00:00:00Z",
    decision: null,
    flag: null,
    isSelf: false,
  };
}

export function assetsFor(owner: Account, photo: Visibility, video: Visibility): MediaAsset[] {
  return [
    { id: `ph-${owner.id}`, ownerId: owner.id, kind: "photo", file: "photos/m01.jpg", visibility: photo },
    { id: `vd-${owner.id}`, ownerId: owner.id, kind: "video", file: "videos/clip-1.mp4", visibility: video },
  ];
}

export function world(accounts: Account[], options: { blocks?: Array<[string, string]>; assets?: MediaAsset[] } = {}): World {
  return {
    now: Date.parse("2026-11-23T12:00:00Z"),
    accounts: new Map(accounts.map((a) => [a.id, a])),
    assets: new Map((options.assets ?? []).map((a) => [a.id, a])),
    blocks: options.blocks ?? [],
    conversations: [],
    notes: [],
    audit: [],
  };
}
