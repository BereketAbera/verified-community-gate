// Table-driven proof of the hidden-by-default rules (R5, R11).
// Every viewer kind x every target status x every block direction, for each surface:
// search listing, member page, messaging and media access.
import { describe, expect, it } from "vitest";
import { createPolicy } from "@/lib/policy";
import { STATUSES, type Role, type Status, type Visibility } from "@/lib/types";
import { account, assetsFor, world } from "./helpers";

type ViewerKind = { label: string; role: Role; status: Status } | { label: "signed-out visitor"; role: null; status: null };
type Block = "no block" | "viewer blocked target" | "target blocked viewer";

const VIEWERS: ViewerKind[] = [
  { label: "signed-out visitor", role: null, status: null },
  ...STATUSES.map((status) => ({ label: `${status} member`, role: "member" as const, status })),
  { label: "moderator", role: "moderator", status: "approved" },
  { label: "admin", role: "admin", status: "approved" },
];
const BLOCKS: Block[] = ["no block", "viewer blocked target", "target blocked viewer"];

interface Case {
  viewer: ViewerKind;
  target: Status;
  block: Block;
}

// Blocks exist only between members, so staff and signed-out viewers get the "no block" column.
const CASES: Case[] = VIEWERS.flatMap((viewer) =>
  STATUSES.flatMap((target) =>
    (viewer.role === "member" ? BLOCKS : (["no block"] as Block[])).map((block) => ({ viewer, target, block })),
  ),
);

/** The rule in plain words: both approved, neither blocked. Nothing else is ever visible. */
function expectsProfile(c: Case): boolean {
  return c.viewer.status === "approved" && c.target === "approved" && c.block === "no block";
}

function expectsMedia(c: Case, visibility: Visibility): boolean {
  const staff = c.viewer.role === "moderator" || c.viewer.role === "admin";
  if (staff) return true; // moderators review every profile's media
  if (visibility === "private") return false; // private: owner and moderators only
  return expectsProfile(c);
}

function setup(c: Case, video: Visibility = "private") {
  const target = account("target", "member", c.target);
  const viewer = c.viewer.role ? account("viewer", c.viewer.role, c.viewer.status) : null;
  const blocks: Array<[string, string]> =
    c.block === "viewer blocked target" ? [["viewer", "target"]] : c.block === "target blocked viewer" ? [["target", "viewer"]] : [];
  const accounts = viewer ? [viewer, target] : [target];
  const assets = assetsFor(target, "members", video);
  const policy = createPolicy(world(accounts, { blocks, assets }));
  return { policy, viewer, target, photo: assets[0], video: assets[1] };
}

const name = (c: Case, outcome: string) => `${c.viewer.label} -> ${c.target} profile, ${c.block}: ${outcome}`;

describe("Search listing: only approved, unblocked members are listed", () => {
  it.each(CASES.map((c) => [name(c, expectsProfile(c) ? "listed" : "not listed"), c] as const))("%s", (_, c) => {
    const { policy, viewer } = setup(c);
    const ids = policy.listVisibleMembers(viewer).map((m) => m.id);
    expect(ids.includes("target")).toBe(expectsProfile(c));
  });
});

describe("Member page: anyone not visible is not found", () => {
  it.each(CASES.map((c) => [name(c, expectsProfile(c) ? "page opens" : "not found"), c] as const))("%s", (_, c) => {
    const { policy, viewer } = setup(c);
    expect(policy.getVisibleMember(viewer, "target") !== null).toBe(expectsProfile(c));
  });
});

describe("Messaging: only two approved members who have not blocked each other", () => {
  it.each(CASES.map((c) => {
    const allowed = expectsProfile(c) && c.viewer.role === "member";
    return [name(c, allowed ? "can message" : "cannot message"), c, allowed] as const;
  }))("%s", (_, c, allowed) => {
    const { policy, viewer, target } = setup(c);
    expect(policy.canMessage(viewer, target)).toBe(allowed);
    expect(policy.canMessage(target, viewer)).toBe(allowed && c.viewer.role === "member");
  });
});

describe("Media access: shared with approved members, or private to owner and moderators", () => {
  const mediaCases = CASES.flatMap((c) =>
    (["members", "private"] as const).map((visibility) => [name(c, `${visibility === "members" ? "shared" : "private"} video ${expectsMedia(c, visibility) ? "allowed" : "denied"}`), c, visibility] as const),
  );
  it.each(mediaCases)("%s", (_, c, visibility) => {
    const { policy, viewer, video } = setup(c, visibility);
    expect(policy.canAccessMedia(viewer, video)).toBe(expectsMedia(c, visibility));
  });
});

describe("Hidden statuses are never visible, to anyone", () => {
  const hidden = STATUSES.filter((s) => s !== "approved");
  it.each(hidden)("a %s profile is invisible to every viewer on every surface", (status) => {
    for (const v of VIEWERS) {
      const { policy, viewer, target, photo } = setup({ viewer: v, target: status, block: "no block" });
      expect(policy.listVisibleMembers(viewer)).toHaveLength(0);
      expect(policy.getVisibleMember(viewer, target.id)).toBeNull();
      expect(policy.canMessage(viewer, target)).toBe(false);
      const staff = v.role === "moderator" || v.role === "admin";
      expect(policy.canAccessMedia(viewer, photo)).toBe(staff);
    }
  });

  it.each(hidden)("a %s viewer sees nobody, messages nobody and gets no one else's media", (status) => {
    const viewer = account("viewer", "member", status);
    const others = STATUSES.map((s, i) => account(`t${i}`, "member", s));
    const assets = others.flatMap((o) => assetsFor(o, "members", "members"));
    const policy = createPolicy(world([viewer, ...others], { assets }));
    expect(policy.listVisibleMembers(viewer)).toEqual([]);
    for (const other of others) {
      expect(policy.getVisibleMember(viewer, other.id)).toBeNull();
      expect(policy.canMessage(viewer, other)).toBe(false);
    }
    for (const asset of assets) expect(policy.canAccessMedia(viewer, asset)).toBe(false);
  });
});

describe("Edge rules", () => {
  it("never lists the viewer themself", () => {
    const viewer = account("viewer", "member", "approved");
    const policy = createPolicy(world([viewer, account("other", "member", "approved")]));
    expect(policy.listVisibleMembers(viewer).map((m) => m.id)).toEqual(["other"]);
    expect(policy.getVisibleMember(viewer, "viewer")).toBeNull();
  });

  it("staff accounts are not member profiles", () => {
    const viewer = account("viewer", "member", "approved");
    const policy = createPolicy(world([viewer, account("mod", "moderator", "approved")]));
    expect(policy.listVisibleMembers(viewer)).toEqual([]);
    expect(policy.getVisibleMember(viewer, "mod")).toBeNull();
  });

  it("owners keep access to their own media while pending or rejected, not while suspended or banned", () => {
    for (const status of STATUSES) {
      const owner = account("owner", "member", status);
      const [photo] = assetsFor(owner, "private", "private");
      const policy = createPolicy(world([owner], { assets: [photo] }));
      expect(policy.canAccessMedia(owner, photo)).toBe(status !== "suspended" && status !== "banned");
    }
  });

  it("a replaced file is not served to anyone, staff included", () => {
    const owner = account("owner", "member", "approved");
    const viewer = account("viewer", "member", "approved");
    const mod = account("mod", "moderator", "approved");
    const old = { id: "vd-owner-old", ownerId: "owner", kind: "video" as const, file: "videos/clip-2.mp4", visibility: "members" as const };
    const policy = createPolicy(world([owner, viewer, mod], { assets: [...assetsFor(owner, "members", "members"), old] }));
    for (const who of [owner, viewer, mod]) expect(policy.canAccessMedia(who, old)).toBe(false);
  });

  it("suspended or banned staff lose every permission", () => {
    for (const status of ["suspended", "banned"] as const) {
      const mod = account("mod", "admin", status);
      const policy = createPolicy(world([mod]));
      expect(policy.can(mod, "review.read")).toBe(false);
      expect(policy.can(mod, "account.restrict")).toBe(false);
    }
  });

  it("only admins may suspend, ban or reinstate", () => {
    const policy = createPolicy(world([]));
    expect(policy.can(account("m", "moderator", "approved"), "review.decide")).toBe(true);
    expect(policy.can(account("m", "moderator", "approved"), "account.restrict")).toBe(false);
    expect(policy.can(account("a", "admin", "approved"), "account.restrict")).toBe(true);
    expect(policy.can(account("x", "member", "approved"), "review.read")).toBe(false);
    expect(policy.can(null, "audit.read")).toBe(false);
  });
});
