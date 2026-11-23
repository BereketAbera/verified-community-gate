// State changes, as pure functions: (current state, input) -> new sandbox or an error.
// Every permission question is answered by the policy module, never here.
import { z } from "zod";
import { addMonths, FOUNDING } from "./access";
import { applyBillingEvent, type BillingEvent } from "./billing";
import { formatDate } from "./format";
import type { Policy } from "./policy";
import { compact, EXTRA_FIELDS, FAITH_FIELDS, fieldsSchema } from "./profile-fields";
import {
  COUNTRY_CODES,
  LANGUAGES,
  REPORT_REASON_IDS,
  REPORT_REASONS,
  SAMPLE_IDS,
  TERMS_VERSION,
  sampleFile,
  sampleSeconds,
  type ReportReason,
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
  type Status,
  type Visibility,
  type World,
} from "./types";
import {
  approvalProblems,
  checklistSummary,
  FIXED_PROMPT_IDS,
  OPTIONAL_PROMPT_IDS,
  type Checklist,
  type OptionalPromptId,
} from "./verification";

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
const unchanged = (ctx: DomainContext): Result => ({ ok: true, sandbox: ctx.sandbox });

const STATUS_WORDS: Record<Status, string> = {
  approved: "approved",
  pending: "pending review",
  rejected: "rejected",
  suspended: "suspended",
  banned: "banned",
};

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

/** The two prompts the member chose for their current recording. */
function chosenPrompts(account: Account): OptionalPromptId[] {
  return (account.verification?.prompts ?? []).filter((id): id is OptionalPromptId => !FIXED_PROMPT_IDS.includes(id));
}

export function switchIdentity(sb: Sandbox, identity: Identity): Sandbox {
  const next = cloneSandbox(sb);
  next.as = identity;
  return next;
}

export const IdentityInput = z.enum(IDENTITIES);

// ---------------------------------------------------------------- signup

export const SignupInput = z.object({
  name: z.string().trim().min(1, "Enter a display name").min(2, "Use at least 2 characters").max(40, "Keep it under 40 characters"),
  age: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce.number({ error: "Enter your age" }).int("Enter a whole number").min(18, "Members must be 18 or older").max(99, "Enter a real age"),
  ),
  city: z.string().trim().min(1, "Enter a city").max(40, "Keep it under 40 characters"),
  country: z.enum(COUNTRY_CODES, { error: "Choose a country" }),
  languages: z.array(z.enum(LANGUAGES)).min(1, "Pick at least one language").max(5, "Pick up to five"),
  lookingFor: z.enum(LOOKING_FOR, { error: "Choose one" }),
  about: z.string().trim().max(280, "Keep it under 280 characters"),
  extra: fieldsSchema(EXTRA_FIELDS),
  adult: z.literal(true, { error: "Confirm that you are 18 or older" }),
  terms: z.literal(true, { error: "Accept the terms to continue" }),
  faithConsent: z.boolean(),
  faith: fieldsSchema(FAITH_FIELDS),
});
export type SignupInput = z.infer<typeof SignupInput>;

export function signup(ctx: DomainContext, input: SignupInput, detectedCountry: string | null): Result {
  if (ctx.sandbox.self) return fail("You already signed up in this browser. Use Reset demo to start again.");
  const sb = cloneSandbox(ctx.sandbox);
  const det = detectedCountry && /^[A-Z]{2}$/.test(detectedCountry) ? detectedCountry : null;
  sb.self = {
    id: newSelfId(),
    name: input.name,
    age: input.age,
    city: input.city,
    country: input.country,
    det,
    langs: input.languages,
    look: input.lookingFor,
    about: input.about,
    x: compact(input.extra),
    // Faith-related answers are kept only with their own consent; otherwise they are dropped here.
    fa: input.faithConsent ? compact(input.faith) : null,
    fc: input.faithConsent ? ctx.now : null,
    tv: TERMS_VERSION,
    ta: ctx.now,
    at: ctx.now,
    fnd: ctx.policy.foundingPlaces().taken < FOUNDING.places,
  };
  sb.as = "newcomer";
  return { ok: true, sandbox: sb };
}

// ---------------------------------------------------------------- verification media

export const VerificationInput = z.object({
  photo: z.enum(SAMPLE_IDS, { error: "Choose a photo" }),
  video: z.enum(SAMPLE_IDS, { error: "Choose a video" }),
  prompts: z
    .array(z.enum(OPTIONAL_PROMPT_IDS))
    .length(2, "Choose two prompts")
    .refine((ids) => new Set(ids).size === ids.length, "Choose two different prompts"),
});

export function submitVerification(ctx: DomainContext, input: z.infer<typeof VerificationInput>): Result {
  const viewer = ctx.viewer;
  if (!viewer || !viewer.isSelf) return fail("Only the new member can submit their own verification.");
  if (viewer.status !== "pending" && viewer.status !== "rejected") return fail("This profile is not waiting for verification.");
  const sb = cloneSandbox(ctx.sandbox);
  const ov = overrideFor(sb, viewer.id);
  ov.ph = { f: sampleFile("photo", input.photo)!, v: ov.ph?.v ?? "members", r: (ov.ph?.r ?? 0) + 1 };
  ov.vd = { f: sampleFile("video", input.video)!, v: ov.vd?.v ?? "members", r: (ov.vd?.r ?? 0) + 1 };
  ov.vm = { p: input.prompts, s: sampleSeconds(input.video)! };
  ov.s = "pending";
  ov.sub = ctx.now;
  log(sb, ctx.now, viewer.id, "submit", viewer.id, viewer.status === "rejected" ? "Resubmitted after rejection" : null);
  return { ok: true, sandbox: sb };
}

export const ReplaceMediaInput = z.object({
  kind: z.enum(["photo", "video"]),
  choice: z.enum(SAMPLE_IDS),
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
  else {
    ov.vd = next;
    ov.vm = { p: chosenPrompts(viewer), s: sampleSeconds(choice)! };
  }
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
  if (current.visibility === visibility) return unchanged(ctx);
  const sb = cloneSandbox(ctx.sandbox);
  const ov = overrideFor(sb, viewer.id);
  const next = { f: current.file, v: visibility, r: current.revision };
  if (kind === "photo") ov.ph = next;
  else ov.vd = next;
  const who = visibility === "members" ? "approved members" : "only me and moderators";
  log(sb, ctx.now, viewer.id, "visibility_changed", viewer.id, `${kind === "photo" ? "Photo" : "Video"} visible to ${who}`);
  return { ok: true, sandbox: sb };
}

// ---------------------------------------------------------------- blocks, reports and messages

export function block(ctx: DomainContext, targetId: string): Result {
  const viewer = ctx.viewer;
  if (!viewer || viewer.role !== "member") return fail("not_found");
  if (ctx.policy.hasBlocked(viewer, targetId)) return unchanged(ctx); // a repeated click lands on the same result
  const target = ctx.policy.getVisibleMember(viewer, targetId);
  if (!target) return fail("not_found");
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
  if (!ctx.policy.hasBlocked(viewer, targetId)) return fail("not_found");
  const sb = cloneSandbox(ctx.sandbox);
  const addedIndex = sb.blk.add.findIndex(([a, b]) => a === viewer.id && b === targetId);
  if (addedIndex >= 0) sb.blk.add.splice(addedIndex, 1);
  else sb.blk.del.push([viewer.id, targetId]);
  if (sb.blk.del.length > LIMITS.blocks) sb.blk.del.shift();
  log(sb, ctx.now, viewer.id, "unblock", targetId);
  return { ok: true, sandbox: sb };
}

export const ReportInput = z.object({
  targetId: z.string().min(2).max(24),
  reason: z.enum(REPORT_REASON_IDS, { error: "Choose a reason" }),
});

/** One open report per member and target. The third open report hides the profile (see policy). */
export function report(ctx: DomainContext, targetId: string, reason: ReportReason): Result {
  const viewer = ctx.viewer;
  if (!viewer || viewer.role !== "member") return fail("not_found");
  const target = ctx.policy.getVisibleMember(viewer, targetId);
  if (!target) return fail("not_found");
  if (ctx.policy.hasReported(viewer, target.id)) return unchanged(ctx);
  const sb = cloneSandbox(ctx.sandbox);
  sb.rep.push([ctx.now, viewer.id, target.id, reason]);
  if (sb.rep.length > LIMITS.reports) sb.rep.shift();
  log(sb, ctx.now, viewer.id, "report", target.id, REPORT_REASONS[reason]);
  return { ok: true, sandbox: sb };
}

export function clearReports(ctx: DomainContext, targetId: string): Result {
  const { viewer, policy } = ctx;
  if (!policy.can(viewer, "review.decide")) return fail("forbidden");
  const target = policy.getProfileForReview(viewer, targetId);
  if (!viewer || !target) return fail("not_found");
  const open = policy.listOpenReports(viewer, target.id).length;
  if (open === 0) return unchanged(ctx);
  const sb = cloneSandbox(ctx.sandbox);
  overrideFor(sb, target.id).rc = ctx.now;
  log(sb, ctx.now, viewer.id, "reports_cleared", target.id, `${open} ${open === 1 ? "report" : "reports"} reviewed`);
  return { ok: true, sandbox: sb };
}

export function requestMessage(ctx: DomainContext, targetId: string): Result {
  const viewer = ctx.viewer;
  const target = ctx.world.accounts.get(targetId) ?? null;
  if (!viewer || !target || !ctx.policy.canMessage(viewer, target)) return fail("not_found");
  if (ctx.policy.conversationWith(viewer, target)) return unchanged(ctx);
  if (!ctx.policy.canStartConversation(viewer, target)) return fail("subscription_required");
  const sb = cloneSandbox(ctx.sandbox);
  sb.msg.push([viewer.id, target.id, ctx.now]);
  if (sb.msg.length > LIMITS.msg) sb.msg.shift();
  return { ok: true, sandbox: sb };
}

/** Accepting or declining a request someone sent you. Free for every member. */
export function answerRequest(ctx: DomainContext, conversationId: string, answer: "accepted" | "declined"): Result {
  const entry = ctx.policy.getConversation(ctx.viewer, conversationId);
  if (!entry || !entry.incoming) return fail("not_found");
  const sb = cloneSandbox(ctx.sandbox);
  sb.cv[conversationId] = answer;
  return { ok: true, sandbox: sb };
}

// ---------------------------------------------------------------- moderation

export const MODERATION_ACTIONS = ["approve", "reject", "flag", "suspend", "ban", "reinstate"] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const ModerationInput = z.object({
  targetId: z.string().min(2).max(24),
  action: z.enum(MODERATION_ACTIONS),
  reason: z.string().trim().max(160, "Keep the reason under 160 characters"),
  checklist: z
    .object({
      samePerson: z.boolean(),
      prompts: z.array(z.string().max(4)).max(10),
      languages: z.array(z.string().max(20)).max(10),
    })
    .optional(),
});

const REASON_REQUIRED: ReadonlySet<ModerationAction> = new Set(["reject", "suspend", "ban"]);
const NO_CHECKLIST: Checklist = { samePerson: false, prompts: [], languages: [] };

export function moderate(ctx: DomainContext, input: z.infer<typeof ModerationInput>): Result {
  const { viewer, policy } = ctx;
  const restricting = input.action === "suspend" || input.action === "ban" || input.action === "reinstate";
  if (!policy.can(viewer, restricting ? "account.restrict" : "review.decide")) return fail("forbidden");
  const target = policy.getProfileForReview(viewer, input.targetId);
  if (!viewer || !target) return fail("not_found");
  const reason = input.reason || null;
  if (REASON_REQUIRED.has(input.action)) {
    if (!reason) return fail("Write a reason. The member will see it.");
    if (reason.length < 3) return fail("Write a reason of at least 3 characters.");
  }

  const allowedFrom: Record<ModerationAction, ReadonlyArray<Status>> = {
    approve: ["pending"],
    reject: ["pending"],
    flag: ["pending"],
    suspend: ["approved", "pending"],
    ban: ["approved", "pending", "rejected", "suspended"],
    reinstate: ["suspended"],
  };
  if (!allowedFrom[input.action].includes(target.status)) {
    return fail(`Cannot ${input.action} a profile that is ${STATUS_WORDS[target.status]}.`);
  }
  if (input.action === "reject" && (!target.photoId || !target.videoId)) {
    return fail("This profile has not submitted a photo and video yet.");
  }
  const checklist = input.checklist ?? NO_CHECKLIST;
  if (input.action === "approve") {
    const problems = approvalProblems(target, checklist);
    if (problems.length > 0) return fail(problems.join(" "));
  }

  const sb = cloneSandbox(ctx.sandbox);
  const ov = overrideFor(sb, target.id);
  const decide = (status: Status) => {
    ov.s = status;
    ov.d = { s: status, r: reason, by: viewer.id, at: ctx.now };
  };
  let logReason = reason;

  switch (input.action) {
    case "approve":
      decide("approved");
      ov.ap = ctx.now;
      ov.f = null;
      // Founding months start at approval, so time spent waiting in review is not lost.
      if (target.access.kind === "founding" && target.access.until === null) {
        ov.acc = { k: "founding", u: addMonths(ctx.now, FOUNDING.months), by: null };
      }
      logReason = checklistSummary(target, checklist);
      break;
    case "reject":
      decide("rejected");
      ov.f = null;
      break;
    case "flag":
      ov.f = { r: reason, by: viewer.id, at: ctx.now };
      break;
    case "suspend":
      ov.ps = target.status; // reinstating restores this, so a pending profile never skips review
      decide("suspended");
      break;
    case "ban":
      ov.ps = null;
      decide("banned");
      break;
    case "reinstate":
      decide(target.suspendedFrom ?? "pending");
      ov.ps = null;
      break;
  }
  log(sb, ctx.now, viewer.id, input.action, target.id, logReason);
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

// ---------------------------------------------------------------- access and billing

const toEpoch = (iso: string | null) => (iso ? Math.floor(Date.parse(iso) / 1000) : null);

/** Writes a verified processor event to the member's access record, once per event id. */
export function recordBillingEvent(ctx: DomainContext, event: BillingEvent): Result {
  const member = ctx.world.accounts.get(event.memberId);
  if (!member || member.role !== "member") return fail("not_found");
  const applied = new Set(ctx.sandbox.bev);
  if (applied.has(event.id)) return unchanged(ctx);
  const next = applyBillingEvent(member.access, event, applied);
  const sb = cloneSandbox(ctx.sandbox);
  overrideFor(sb, member.id).acc = { k: next.kind, u: toEpoch(next.until), by: next.setBy };
  sb.bev.push(event.id);
  if (sb.bev.length > LIMITS.billing) sb.bev.shift();
  const what =
    event.type === "subscription.active"
      ? `Subscription active (test mode) until ${formatDate(next.until)}`
      : event.type === "subscription.cancelled"
        ? `Subscription cancelled; access ends ${formatDate(next.until)}`
        : "Payment failed; the processor will retry";
  log(sb, ctx.now, member.id, "access_changed", member.id, what);
  return { ok: true, sandbox: sb };
}

export const ComplimentaryInput = z.object({
  targetId: z.string().min(2).max(24),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date"),
});

/** Staff-set complimentary access with an end date (R6). Admins only. */
export function setComplimentary(ctx: DomainContext, targetId: string, untilDate: string): Result {
  const { viewer, policy } = ctx;
  if (!policy.can(viewer, "access.grant")) return fail("forbidden");
  const target = policy.getProfileForReview(viewer, targetId);
  if (!viewer || !target) return fail("not_found");
  const until = Math.floor(Date.parse(`${untilDate}T23:59:00Z`) / 1000);
  if (!Number.isFinite(until) || until <= ctx.now) return fail("Choose an end date in the future.");
  if (until > addMonths(ctx.now, 24)) return fail("Choose an end date within two years.");
  const sb = cloneSandbox(ctx.sandbox);
  overrideFor(sb, target.id).acc = { k: "complimentary", u: until, by: viewer.id };
  log(sb, ctx.now, viewer.id, "access_changed", target.id, `Complimentary access until ${formatDate(new Date(until * 1000).toISOString())}`);
  return { ok: true, sandbox: sb };
}
