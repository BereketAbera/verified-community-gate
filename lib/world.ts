// Rebuilds the full state for one request: the fictional seed plus this visitor's sandbox.
// In production this module disappears; the same shapes come from Postgres.
import type { Sandbox } from "./sandbox";
import {
  DEMO_ADMIN_ID,
  DEMO_MEMBER_ID,
  DEMO_MODERATOR_ID,
  SEED_ACCOUNTS,
  SEED_ASSETS,
  SEED_AUDIT,
  SEED_BLOCKS,
  SEED_CONVERSATIONS,
  SEED_NOTES,
} from "./seed";
import type { Account, AuditEntry, Conversation, MediaAsset, MediaKind, Note, World } from "./types";

export const iso = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString();

/** A replaced photo or video gets a new asset id, so links to the old file stop resolving. */
export function assetIdFor(kind: MediaKind, ownerId: string, revision: number): string {
  return `${kind === "photo" ? "ph" : "vd"}-${ownerId}${revision > 1 ? `-r${revision}` : ""}`;
}

export function buildWorld(sb: Sandbox, now: number = Date.now()): World {
  const accounts = new Map<string, Account>();
  const assets = new Map<string, MediaAsset>();
  for (const account of SEED_ACCOUNTS) accounts.set(account.id, structuredClone(account));
  for (const asset of SEED_ASSETS) assets.set(asset.id, { ...asset });

  if (sb.self) {
    const s = sb.self;
    accounts.set(s.id, {
      id: s.id,
      role: "member",
      status: "pending",
      displayName: s.name,
      age: s.age,
      city: s.city,
      country: s.country,
      detectedCountry: s.det,
      languages: s.langs,
      lookingFor: s.look,
      about: s.about,
      faith: { consentedAt: s.fc ? iso(s.fc) : null, value: s.fc ? s.faith : null },
      terms: { version: s.tv, acceptedAt: iso(s.ta) },
      photoId: null,
      videoId: null,
      submittedAt: null,
      createdAt: iso(s.at),
      decision: null,
      flag: null,
      isSelf: true,
    });
  }

  for (const [id, ov] of Object.entries(sb.ov)) {
    const account = accounts.get(id);
    if (!account || account.role !== "member") continue;
    if (ov.s) account.status = ov.s;
    if (ov.d !== undefined) {
      account.decision = ov.d ? { status: ov.d.s, reason: ov.d.r, by: ov.d.by, at: iso(ov.d.at) } : null;
    }
    if (ov.f !== undefined) {
      account.flag = ov.f ? { reason: ov.f.r, by: ov.f.by, at: iso(ov.f.at) } : null;
    }
    if (ov.sub !== undefined) account.submittedAt = ov.sub ? iso(ov.sub) : null;
    for (const kind of ["photo", "video"] as const) {
      const media = kind === "photo" ? ov.ph : ov.vd;
      if (!media) continue;
      const previous = kind === "photo" ? account.photoId : account.videoId;
      if (previous) assets.delete(previous);
      const nextId = assetIdFor(kind, id, media.r);
      assets.set(nextId, { id: nextId, ownerId: id, kind, file: media.f, visibility: media.v });
      if (kind === "photo") account.photoId = nextId;
      else account.videoId = nextId;
    }
  }

  const removed = new Set(sb.blk.del.map(([a, b]) => `${a}>${b}`));
  const blockKeys = new Set<string>();
  const blocks: Array<readonly [string, string]> = [];
  for (const pair of [...SEED_BLOCKS, ...sb.blk.add]) {
    const key = `${pair[0]}>${pair[1]}`;
    if (removed.has(key) || blockKeys.has(key)) continue;
    blockKeys.add(key);
    blocks.push([pair[0], pair[1]]);
  }

  const conversations: Conversation[] = SEED_CONVERSATIONS.map((c) => ({ ...c, members: [...c.members] as [string, string] }));
  for (const [from, to, at] of sb.msg) {
    const exists = conversations.some((c) => c.members.includes(from) && c.members.includes(to));
    if (exists) continue;
    conversations.push({
      id: `r-${from}-${to}`,
      members: [from, to],
      state: "requested",
      startedBy: from,
      preview: "Message request sent",
      at: iso(at),
    });
  }
  conversations.sort((a, b) => b.at.localeCompare(a.at));

  const notes: Note[] = [
    ...sb.notes.map(([at, authorId, targetId, text], i) => ({ id: `sn${sb.notes.length - i}`, at: iso(at), authorId, targetId, text })),
    ...SEED_NOTES,
  ].sort((a, b) => b.at.localeCompare(a.at));

  const audit: AuditEntry[] = [
    ...sb.log.map(([at, actorId, action, targetId, reason], i) => ({
      id: `sl${sb.log.length - i}`,
      at: iso(at),
      actorId,
      action,
      targetId,
      reason,
    })),
    ...SEED_AUDIT,
  ].sort((a, b) => b.at.localeCompare(a.at));

  return { now, accounts, assets, blocks, conversations, notes, audit };
}

/** Maps the chosen demo identity to an account. "visitor" (signed out) has none. */
export function viewerFor(world: World, sb: Sandbox): Account | null {
  switch (sb.as) {
    case "newcomer":
      return sb.self ? world.accounts.get(sb.self.id) ?? null : null;
    case "member":
      return world.accounts.get(DEMO_MEMBER_ID) ?? null;
    case "moderator":
      return world.accounts.get(DEMO_MODERATOR_ID) ?? null;
    case "admin":
      return world.accounts.get(DEMO_ADMIN_ID) ?? null;
    default:
      return null;
  }
}
