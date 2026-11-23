// Table-driven proof of the hidden-by-default rules (R5, R11).
// Every viewer kind x every target status x every block direction, for each surface:
// search listing, member page, messaging and media access.
import { describe, expect, it } from "vitest";
import { createPolicy, REPORTS_TO_HIDE } from "@/lib/policy";
import { SAMPLE_LIBRARY, STATUSES, type Access, type Role, type Status, type Visibility } from "@/lib/types";
import { account, assetsFor, reports, world } from "./helpers";

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

describe("Starting a conversation: both visible to each other, and the starter has an active membership (R6)", () => {
  it.each(
    CASES.filter((c) => c.viewer.role === "member").map((c) => {
      const allowed = expectsProfile(c);
      return [name(c, allowed ? "can start with a membership" : "cannot start"), c, allowed] as const;
    }),
  )("%s", (_, c, allowed) => {
    const { policy, viewer, target } = setup(c);
    expect(policy.canStartConversation(viewer, target)).toBe(allowed);
  });

  const ACCESS: Array<[string, Access, boolean]> = [
    ["free plan", { kind: "free", until: null, setBy: null }, false],
    ["paid, still running", { kind: "paid", until: "2026-12-23T00:00:00Z", setBy: null }, true],
    ["paid, ended", { kind: "paid", until: "2026-11-01T00:00:00Z", setBy: null }, false],
    ["complimentary, still running", { kind: "complimentary", until: "2026-12-31T00:00:00Z", setBy: "s02" }, true],
    ["complimentary, ended", { kind: "complimentary", until: "2026-11-22T00:00:00Z", setBy: "s02" }, false],
    ["founding, months not started", { kind: "founding", until: null, setBy: null }, false],
    ["founding, still running", { kind: "founding", until: "2027-02-01T00:00:00Z", setBy: null }, true],
    ["founding, ended", { kind: "founding", until: "2026-10-29T00:00:00Z", setBy: null }, false],
  ];
  it.each(ACCESS)("approved member on %s: starting allowed = %s, replying always allowed", (_, access, allowed) => {
    const viewer = account("viewer", "member", "approved", { access });
    const other = account("other", "member", "approved");
    const policy = createPolicy(world([viewer, other]));
    expect(policy.canStartConversation(viewer, other)).toBe(allowed);
    expect(policy.canMessage(viewer, other)).toBe(true); // replying and accepting are free
  });

  it("staff and signed-out viewers never start member conversations", () => {
    const other = account("other", "member", "approved");
    const policy = createPolicy(world([other, account("mod", "moderator", "approved")]));
    expect(policy.canStartConversation(null, other)).toBe(false);
    expect(policy.canStartConversation(account("mod", "moderator", "approved"), other)).toBe(false);
  });
});

describe("Reports: three open reports hide a profile until a moderator reviews them (R9)", () => {
  const viewer = account("viewer", "member", "approved");

  it.each([0, 1, 2, 3, 4].map((n) => [n, n < REPORTS_TO_HIDE] as const))("with %i open reports, visible to members: %s", (count, visible) => {
    const target = account("target", "member", "approved");
    const policy = createPolicy(world([viewer, target], { reports: reports("target", count), assets: assetsFor(target, "members", "members") }));
    expect(policy.getVisibleMember(viewer, "target") !== null).toBe(visible);
    expect(policy.listVisibleMembers(viewer).map((m) => m.id).includes("target")).toBe(visible);
    expect(policy.canMessage(viewer, target)).toBe(visible);
    expect(policy.canAccessMedia(viewer, assetsFor(target, "members", "members")[0])).toBe(visible);
  });

  it("reports filed before a moderator's review no longer count", () => {
    const target = account("target", "member", "approved", { reportsClearedAt: "2026-11-21T00:00:00Z" });
    const policy = createPolicy(world([viewer, target], { reports: reports("target", 3, "2026-11-20T00:00:00Z") }));
    expect(policy.getVisibleMember(viewer, "target")).not.toBeNull();
  });

  it("a hidden profile stays open to moderators, and its owner still sees other members", () => {
    const target = account("target", "member", "approved");
    const mod = account("mod", "moderator", "approved");
    const policy = createPolicy(world([viewer, target, mod], { reports: reports("target", 3), assets: assetsFor(target, "members", "members") }));
    expect(policy.getProfileForReview(mod, "target")).not.toBeNull();
    expect(policy.canAccessMedia(mod, assetsFor(target, "members", "members")[0])).toBe(true);
    expect(policy.listVisibleMembers(target).map((m) => m.id)).toEqual(["viewer"]);
  });
});

describe("Visibility counts come from the policy", () => {
  it("counts who can see an account: nobody sees a pending one; every unblocked approved member sees an approved one", () => {
    const pending = account("pending", "member", "pending");
    const approved = account("approved", "member", "approved");
    const others = ["a", "b", "c"].map((id) => account(id, "member", "approved"));
    const policy = createPolicy(world([pending, approved, ...others, account("mod", "moderator", "approved")], { blocks: [["a", "approved"]] }));
    expect(policy.countWhoCanSee(pending)).toBe(0);
    expect(policy.listVisibleMembers(pending)).toHaveLength(0);
    expect(policy.countWhoCanSee(approved)).toBe(2); // b and c; a blocked them
  });
});

describe("Edge rules for the approval record and blocks", () => {
  it("an approved status without a moderator's approval on record is still hidden", () => {
    const viewer = account("viewer", "member", "approved");
    const target = account("target", "member", "approved", { approvedAt: null });
    const policy = createPolicy(world([viewer, target]));
    expect(policy.getVisibleMember(viewer, "target")).toBeNull();
    expect(policy.listVisibleMembers(viewer)).toEqual([]);
  });

  it("a block hides only the pair: both still see everyone else", () => {
    const a = account("a", "member", "approved");
    const b = account("b", "member", "approved");
    const c = account("c", "member", "approved");
    const policy = createPolicy(world([a, b, c], { blocks: [["a", "b"]] }));
    expect(policy.listVisibleMembers(a).map((m) => m.id)).toEqual(["c"]);
    expect(policy.listVisibleMembers(b).map((m) => m.id)).toEqual(["c"]);
    expect(policy.listVisibleMembers(c).map((m) => m.id)).toEqual(["a", "b"]);
  });
});

describe("Sample library: fictional files a new member picks from", () => {
  const library = { id: "lib-ph-sample-a", ownerId: SAMPLE_LIBRARY, kind: "photo" as const, file: "photos/sample-a.jpg", visibility: "members" as const };
  it.each([
    ["signed-out visitor", null, false],
    ["pending member", account("v", "member", "pending"), true],
    ["rejected member", account("v", "member", "rejected"), true],
    ["approved member", account("v", "member", "approved"), true],
    ["suspended member", account("v", "member", "suspended"), false],
    ["banned member", account("v", "member", "banned"), false],
    ["moderator", account("v", "moderator", "approved"), true],
  ] as const)("%s: library access %s", (_, viewer, allowed) => {
    const policy = createPolicy(world(viewer ? [viewer] : [], { assets: [library] }));
    expect(policy.getAccessibleAsset(viewer, library.id) !== null).toBe(allowed);
    expect(policy.canAccessMedia(viewer, library)).toBe(false); // never through the member-media rule
  });
});

