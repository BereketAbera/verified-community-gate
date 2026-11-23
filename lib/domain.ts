// State changes, as pure functions: (current state, input) -> new sandbox or an error.
// Every permission question is answered by the policy module, never here.
import { z } from "zod";
import type { Policy } from "./policy";
import {
  COUNTRY_CODES,
  LANGUAGES,
  SAMPLE_PHOTO_IDS,
  SAMPLE_VIDEO_IDS,
  TERMS_VERSION,
  sampleFile,
} from "./reference";
import { cloneSandbox, LIMITS, newSelfId, type Sandbox } from "./sandbox";
import {
  IDENTITIES,
  LOOKING_FOR,
  VISIBILITIES,
  type Account,
  type AuditAction,
  type Identity,
  type MediaKind,
  type Visibility,
  type World,
} from "./types";

export interface DomainContext {
  sandbox: Sandbox;
  world: World;
  policy: Policy;
  viewer: Account | null;
  /** seconds since epoch */
  now: number;
}

export type Result = { ok: true; sandbox: Sandbox } | { ok: false; error: string };

const fail = (error: string): Result => ({ ok: false, error });

function log(sb: Sandbox, now: number, actor: string, action: AuditAction, target: string, reason: string | null = null) {
  sb.log.unshift([now, actor, action, target, reason ? reason.slice(0, 160) : null]);
  if (sb.log.length > LIMITS.log) sb.log.length = LIMITS.log;
}

function overrideFor(sb: Sandbox, id: string) {
  return (sb.ov[id] ??= {});
}

function currentMedia(ctx: DomainContext, owner: Account, kind: MediaKind) {
  const id = kind === "photo" ? owner.photoId : owner.videoId;
  const asset = id ? ctx.world.assets.get(id) : undefined;
  if (!asset) return null;
  const revision = ctx.sandbox.ov[owner.id]?.[kind === "photo" ? "ph" : "vd"]?.r ?? 1;
  return { file: asset.file, visibility: asset.visibility, revision };
}

export function switchIdentity(sb: Sandbox, identity: Identity): Sandbox {
  const next = cloneSandbox(sb);
  next.as = identity;
  return next;
}

export const IdentityInput = z.enum(IDENTITIES);

// ---------------------------------------------------------------- signup

export const SignupInput = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters").max(40, "Keep it under 40 characters"),
  age: z.coerce.number({ error: "Enter your age" }).int().min(18, "Members must be 18 or older").max(99),
  city: z.string().trim().min(1, "Enter a city").max(40),
  country: z.enum(COUNTRY_CODES, { error: "Choose a country" }),
  languages: z.array(z.enum(LANGUAGES)).min(1, "Pick at least one language").max(5, "Pick up to five"),
  lookingFor: z.enum(LOOKING_FOR, { error: "Choose one" }),
  about: z.string().trim().max(280, "Keep it under 280 characters"),
  adult: z.literal(true, { error: "Confirm that you are 18 or older" }),
  terms: z.literal(true, { error: "Accept the terms to continue" }),
  faithConsent: z.boolean(),
  faith: z.string().trim().max(80, "Keep it under 80 characters"),
});
export type SignupInput = z.infer<typeof SignupInput>;

export function signup(ctx: DomainContext, input: SignupInput, detectedCountry: string | null): Result {
  if (ctx.sandbox.self) return fail("You already signed up in this browser. Use Reset demo to start again.");
  const sb = cloneSandbox(ctx.sandbox);
  const det = detectedCountry && /^[A-Z]{2}$/.test(detectedCountry) ? detectedCountry : null;
  const id = newSelfId();
  sb.self = {
    id,
    name: input.name,
    age: input.age,
    city: input.city,
    country: input.country,
    det,
    langs: input.languages,
    look: input.lookingFor,
    about: input.about,
    // Faith-related data is kept only with its own consent; otherwise it is dropped here.
    faith: input.faithConsent && input.faith ? input.faith : null,
    fc: input.faithConsent ? ctx.now : null,
    tv: TERMS_VERSION,
    ta: ctx.now,
    at: ctx.now,
  };
  sb.as = "newcomer";
  log(sb, ctx.now, id, "signup", id, `Terms ${TERMS_VERSION} accepted; faith-data consent ${input.faithConsent ? "given" : "not given"}`);
  return { ok: true, sandbox: sb };
}

// ---------------------------------------------------------------- verification media

export const VerificationInput = z.object({
  photo: z.enum(SAMPLE_PHOTO_IDS, { error: "Choose a photo" }),
  video: z.enum(SAMPLE_VIDEO_IDS, { error: "Choose a video" }),
});

export function submitVerification(ctx: DomainContext, input: z.infer<typeof VerificationInput>): Result {
  const viewer = ctx.viewer;
  if (!viewer || !viewer.isSelf) return fail("Only the new member can submit their own verification.");
  if (viewer.status !== "pending" && viewer.status !== "rejected") return fail("This profile is not waiting for verification.");
  const sb = cloneSandbox(ctx.sandbox);
  const ov = overrideFor(sb, viewer.id);
  ov.ph = { f: sampleFile("photo", input.photo)!, v: ov.ph?.v ?? "members", r: (ov.ph?.r ?? 0) + 1 };
  ov.vd = { f: sampleFile("video", input.video)!, v: ov.vd?.v ?? "members", r: (ov.vd?.r ?? 0) + 1 };
  ov.s = "pending";
  ov.sub = ctx.now;
  log(sb, ctx.now, viewer.id, "submit", viewer.id, viewer.status === "rejected" ? "Resubmitted after rejection" : null);
  return { ok: true, sandbox: sb };
}

export const ReplaceMediaInput = z.object({
  kind: z.enum(["photo", "video"]),
  choice: z.string(),
});

/** Replacing a photo or video always sends the profile back to review. */
export function replaceMedia(ctx: DomainContext, kind: MediaKind, choice: string): Result {
  const viewer = ctx.viewer;
  if (!viewer || viewer.role !== "member") return fail("Only members have profile media.");
  if (viewer.status === "suspended" || viewer.status === "banned") return fail("This account is restricted.");
  const file = sampleFile(kind, choice);
  if (!file) return fail("Choose one of the sample files.");
  const current = currentMedia(ctx, viewer, kind);
  const sb = cloneSandbox(ctx.sandbox);
  const ov = overrideFor(sb, viewer.id);
  const next = { f: file, v: current?.visibility ?? "members", r: (current?.revision ?? 0) + 1 };
  if (kind === "photo") ov.ph = next;
  else ov.vd = next;
  ov.s = "pending";
  ov.sub = ctx.now;
  log(sb, ctx.now, viewer.id, "media_replaced", viewer.id, `${kind === "photo" ? "Photo" : "Video"} replaced; profile back in review`);
  return { ok: true, sandbox: sb };
}

export const VisibilityInput = z.object({
  kind: z.enum(["photo", "video"]),
  visibility: z.enum(VISIBILITIES),
});

export function setVisibility(ctx: DomainContext, kind: MediaKind, visibility: Visibility): Result {
  const viewer = ctx.viewer;
  if (!viewer || viewer.role !== "member") return fail("Only members have profile media.");
  if (viewer.status === "suspended" || viewer.status === "banned") return fail("This account is restricted.");
  const current = currentMedia(ctx, viewer, kind);
  if (!current) return fail("There is no file to change yet.");
  const sb = cloneSandbox(ctx.sandbox);
  const ov = overrideFor(sb, viewer.id);
  const next = { f: current.file, v: visibility, r: current.revision };
  if (kind === "photo") ov.ph = next;
  else ov.vd = next;
  const who = visibility === "members" ? "approved members" : "only me and moderators";
  log(sb, ctx.now, viewer.id, "visibility_changed", viewer.id, `${kind === "photo" ? "Photo" : "Video"} visible to ${who}`);
  return { ok: true, sandbox: sb };
}

// ---------------------------------------------------------------- blocks and messages

export function block(ctx: DomainContext, targetId: string): Result {
  const viewer = ctx.viewer;
  const target = ctx.policy.getVisibleMember(viewer, targetId);
  if (!viewer || viewer.role !== "member" || !target) return fail("not_found");
  const sb = cloneSandbox(ctx.sandbox);
  const removedIndex = sb.blk.del.findIndex(([a, b]) => a === viewer.id && b === target.id);
  if (removedIndex >= 0) sb.blk.del.splice(removedIndex, 1);
  else sb.blk.add.push([viewer.id, target.id]);
  if (sb.blk.add.length > LIMITS.blocks) sb.blk.add.shift();
  log(sb, ctx.now, viewer.id, "block", target.id);
  return { ok: true, sandbox: sb };
}

export function unblock(ctx: DomainContext, targetId: string): Result {
  const viewer = ctx.viewer;
  if (!viewer || viewer.role !== "member") return fail("not_found");
  const exists = ctx.world.blocks.some(([a, b]) => a === viewer.id && b === targetId);
  if (!exists) return fail("not_found");
  const sb = cloneSandbox(ctx.sandbox);
  const addedIndex = sb.blk.add.findIndex(([a, b]) => a === viewer.id && b === targetId);
  if (addedIndex >= 0) sb.blk.add.splice(addedIndex, 1);
  else sb.blk.del.push([viewer.id, targetId]);
  if (sb.blk.del.length > LIMITS.blocks) sb.blk.del.shift();
  log(sb, ctx.now, viewer.id, "unblock", targetId);
  return { ok: true, sandbox: sb };
}

export function requestMessage(ctx: DomainContext, targetId: string): Result {
  const viewer = ctx.viewer;
  const target = ctx.world.accounts.get(targetId) ?? null;
  if (!viewer || !target || !ctx.policy.canMessage(viewer, target)) return fail("not_found");
  const sb = cloneSandbox(ctx.sandbox);
  if (!ctx.policy.hasConversation(viewer, target)) {
    sb.msg.push([viewer.id, target.id, ctx.now]);
    if (sb.msg.length > LIMITS.msg) sb.msg.shift();
  }
  return { ok: true, sandbox: sb };
}

// ---------------------------------------------------------------- moderation

export const MODERATION_ACTIONS = ["approve", "reject", "flag", "suspend", "ban", "reinstate"] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const ModerationInput = z.object({
  targetId: z.string().min(2).max(24),
  action: z.enum(MODERATION_ACTIONS),
  reason: z.string().trim().max(160, "Keep the reason under 160 characters"),
});

const REASON_REQUIRED: ReadonlySet<ModerationAction> = new Set(["reject", "suspend", "ban"]);

export function moderate(ctx: DomainContext, input: z.infer<typeof ModerationInput>): Result {
  const { viewer, policy } = ctx;
  const restricting = input.action === "suspend" || input.action === "ban" || input.action === "reinstate";
  if (!policy.can(viewer, restricting ? "account.restrict" : "review.decide")) return fail("forbidden");
  const target = policy.getProfileForReview(viewer, input.targetId);
  if (!viewer || !target) return fail("not_found");
  const reason = input.reason || null;
  if (REASON_REQUIRED.has(input.action) && (!reason || reason.length < 3)) return fail("A reason is required.");

  const allowedFrom: Record<ModerationAction, ReadonlyArray<Account["status"]>> = {
    approve: ["pending"],
    reject: ["pending"],
    flag: ["pending"],
    suspend: ["approved", "pending"],
    ban: ["approved", "pending", "rejected", "suspended"],
    reinstate: ["suspended"],
  };
  if (!allowedFrom[input.action].includes(target.status)) {
    return fail(`Cannot ${input.action} a profile that is ${target.status}.`);
  }
  if ((input.action === "approve" || input.action === "reject") && (!target.photoId || !target.videoId)) {
    return fail("This profile has not submitted a photo and video yet.");
  }

  const sb = cloneSandbox(ctx.sandbox);
  const ov = overrideFor(sb, target.id);
  const nextStatus = {
    approve: "approved",
    reject: "rejected",
    flag: target.status,
    suspend: "suspended",
    ban: "banned",
    reinstate: "approved",
  }[input.action] as Account["status"];

  if (input.action === "flag") {
    ov.f = { r: reason, by: viewer.id, at: ctx.now };
  } else {
    ov.s = nextStatus;
    ov.d = { s: nextStatus, r: reason, by: viewer.id, at: ctx.now };
    if (input.action === "approve" || input.action === "reject") ov.f = null;
  }
  log(sb, ctx.now, viewer.id, input.action, target.id, reason);
  return { ok: true, sandbox: sb };
}

export const NoteInput = z.object({
  targetId: z.string().min(2).max(24),
  text: z.string().trim().min(2, "Write at least a few words").max(280, "Keep notes under 280 characters"),
});

export function addNote(ctx: DomainContext, input: z.infer<typeof NoteInput>): Result {
  const { viewer, policy } = ctx;
  if (!policy.can(viewer, "review.note")) return fail("forbidden");
  const target = policy.getProfileForReview(viewer, input.targetId);
  if (!viewer || !target) return fail("not_found");
  const sb = cloneSandbox(ctx.sandbox);
  sb.notes.unshift([ctx.now, viewer.id, target.id, input.text]);
  if (sb.notes.length > LIMITS.notes) sb.notes.length = LIMITS.notes;
  log(sb, ctx.now, viewer.id, "note", target.id, input.text.length > 70 ? `${input.text.slice(0, 67)}...` : input.text);
  return { ok: true, sandbox: sb };
}
