// The per-visitor sandbox: every change a visitor makes (their own signup, moderator
// decisions, notes, blocks, audit entries) is stored here, in an encrypted cookie.
// The server rebuilds the world as seed + sandbox on every request (see world.ts).
// It exists only so the demo needs no database; production would use Postgres.
import { z } from "zod";
import { AUDIT_ACTIONS, IDENTITIES, LOOKING_FOR, STATUSES, VISIBILITIES } from "./types";

const Id = z.string().regex(/^[a-z0-9-]{2,24}$/);
const Epoch = z.number().int().nonnegative();
const Reason = z.string().max(160);

const MediaOverride = z.object({
  /** file under private-media/ */
  f: z.string().regex(/^(photos|videos)\/[a-z0-9-]+\.(jpg|mp4)$/),
  /** visibility */
  v: z.enum(VISIBILITIES),
  /** revision; a replaced file gets a new asset id */
  r: z.number().int().min(1).max(999),
});

const AccountOverride = z.object({
  s: z.enum(STATUSES).optional(),
  d: z.object({ s: z.enum(STATUSES), r: Reason.nullable(), by: Id, at: Epoch }).nullable().optional(),
  f: z.object({ r: Reason.nullable(), by: Id, at: Epoch }).nullable().optional(),
  sub: Epoch.nullable().optional(),
  ph: MediaOverride.optional(),
  vd: MediaOverride.optional(),
});
export type AccountOverride = z.infer<typeof AccountOverride>;

const Self = z.object({
  id: Id,
  name: z.string().min(2).max(40),
  age: z.number().int().min(18).max(99),
  city: z.string().min(1).max(40),
  country: z.string().regex(/^[A-Z]{2}$/),
  /** country detected from the signup request, if the platform sent one */
  det: z.string().regex(/^[A-Z]{2}$/).nullable(),
  langs: z.array(z.string().max(20)).min(1).max(5),
  look: z.enum(LOOKING_FOR),
  about: z.string().max(280),
  /** faith-related field, kept only when its separate consent was given */
  faith: z.string().max(80).nullable(),
  /** faith consent time, or null when not given */
  fc: Epoch.nullable(),
  /** terms version and acceptance time */
  tv: z.string().max(12),
  ta: Epoch,
  at: Epoch,
});
export type SelfProfile = z.infer<typeof Self>;

export const LIMITS = { log: 25, notes: 8, msg: 10, blocks: 12 } as const;

export const SandboxSchema = z.object({
  v: z.literal(1),
  sid: z.string().regex(/^[a-z0-9]{12}$/),
  as: z.enum(IDENTITIES),
  self: Self.nullable(),
  ov: z.record(Id, AccountOverride),
  blk: z.object({
    add: z.array(z.tuple([Id, Id])).max(LIMITS.blocks),
    del: z.array(z.tuple([Id, Id])).max(LIMITS.blocks),
  }),
  /** message requests: [from, to, at] */
  msg: z.array(z.tuple([Id, Id, Epoch])).max(LIMITS.msg),
  /** notes, newest first: [at, author, target, text] */
  notes: z.array(z.tuple([Epoch, Id, Id, z.string().max(280)])).max(LIMITS.notes),
  /** audit entries, newest first: [at, actor, action, target, reason] */
  log: z.array(z.tuple([Epoch, Id, z.enum(AUDIT_ACTIONS), Id, Reason.nullable()])).max(LIMITS.log),
  seq: z.number().int().nonnegative(),
});
export type Sandbox = z.infer<typeof SandboxSchema>;

function randomToken(length: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function newSelfId(): string {
  return `u-${randomToken(6)}`;
}

export function freshSandbox(sid: string = randomToken(12)): Sandbox {
  return {
    v: 1,
    sid,
    as: "visitor",
    self: null,
    ov: {},
    blk: { add: [], del: [] },
    msg: [],
    notes: [],
    log: [],
    seq: 0,
  };
}

/** Deep copy so domain functions can change a sandbox without touching the caller's. */
export function cloneSandbox(sb: Sandbox): Sandbox {
  return structuredClone(sb);
}
