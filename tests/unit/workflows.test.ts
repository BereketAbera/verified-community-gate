// End-to-end rules on the real seed data, through the same pure functions the server actions call.
import { describe, expect, it } from "vitest";
import {
  addNote,
  block,
  moderate,
  replaceMedia,
  requestMessage,
  setVisibility,
  signup,
  submitVerification,
  switchIdentity,
  unblock,
  type DomainContext,
  type Result,
  type SignupInput,
} from "@/lib/domain";
import { createPolicy } from "@/lib/policy";
import { freshSandbox, LIMITS, type Sandbox } from "@/lib/sandbox";
import { buildWorld, viewerFor } from "@/lib/world";
import type { Identity } from "@/lib/types";

const NOW = 1_795_400_000;

function ctx(sb: Sandbox, as?: Identity): DomainContext {
  const sandbox = as ? switchIdentity(sb, as) : sb;
  const world = buildWorld(sandbox, NOW * 1000);
  return { sandbox, world, policy: createPolicy(world), viewer: viewerFor(world, sandbox), now: NOW };
}

function ok(result: Result): Sandbox {
  if (!result.ok) throw new Error(`expected success, got: ${result.error}`);
  return result.sandbox;
}

const SIGNUP: SignupInput = {
  name: "Test Newcomer",
  age: 29,
  city: "Portland",
  country: "US",
  languages: ["English"],
  lookingFor: "friendship",
  about: "Hello",
  adult: true,
  terms: true,
  faithConsent: false,
  faith: "Typed but not consented",
};

function signedUpAndSubmitted(): Sandbox {
  let sb = ok(signup(ctx(freshSandbox(), "newcomer"), SIGNUP, "US"));
  sb = ok(submitVerification(ctx(sb, "newcomer"), { photo: "sample-a", video: "clip-2" }));
  return sb;
}

const visibleIds = (sb: Sandbox, as: Identity) => {
  const c = ctx(sb, as);
  return c.policy.listVisibleMembers(c.viewer).map((m) => m.id);
};

describe("Seed data", () => {
  it("the approved demo member sees exactly the five approved members they have no block with", () => {
    // Sorted by name: Daniel, Lucía, Naomi, Priya, Samuel. Grace (blocked by m01) and Jonah (blocked m01) are absent.
    expect(visibleIds(freshSandbox(), "member")).toEqual(["m02", "m03", "m14", "m07", "m04"]);
  });

  it("no identity ever sees a pending, rejected, suspended or banned seed profile", () => {
    for (const as of ["visitor", "member", "moderator", "admin"] as const) {
      const c = ctx(freshSandbox(), as);
      for (const m of c.policy.listVisibleMembers(c.viewer)) expect(m.status).toBe("approved");
    }
  });

  it("conversations with a suspended member or someone who blocked you are not listed", () => {
    const c = ctx(freshSandbox(), "member");
    const others = c.policy.listConversations(c.viewer).map((x) => x.other.id);
    expect(others).toEqual(["m02", "m14"]);
  });
});

describe("Signup and verification (R2)", () => {
  it("a new signup is pending, sees nobody and is seen by nobody", () => {
    const sb = signedUpAndSubmitted();
    const self = sb.self!;
    expect(visibleIds(sb, "newcomer")).toEqual([]);
    expect(visibleIds(sb, "member")).not.toContain(self.id);
    const member = ctx(sb, "member");
    expect(member.policy.getVisibleMember(member.viewer, self.id)).toBeNull();
  });

  it("records the terms version and time, and drops faith data without its own consent", () => {
    const sb = ok(signup(ctx(freshSandbox(), "newcomer"), SIGNUP, "US"));
    expect(sb.self).toMatchObject({ tv: "2026-11-01", ta: NOW, faith: null, fc: null });
    const consented = ok(signup(ctx(freshSandbox(), "newcomer"), { ...SIGNUP, faithConsent: true, faith: "Practising" }, null));
    expect(consented.self).toMatchObject({ faith: "Practising", fc: NOW, det: null });
  });

  it("keeps the detected country for moderators to compare", () => {
    const sb = ok(signup(ctx(freshSandbox(), "newcomer"), SIGNUP, "DE"));
    const mod = ctx(sb, "moderator");
    expect(mod.policy.getProfileForReview(mod.viewer, sb.self!.id)).toMatchObject({ country: "US", detectedCountry: "DE" });
  });

  it("a submitted profile enters the moderator queue", () => {
    const sb = signedUpAndSubmitted();
    const mod = ctx(sb, "moderator");
    expect(mod.policy.reviewQueue(mod.viewer).map((a) => a.id)).toContain(sb.self!.id);
  });
});

describe("Moderation (R3)", () => {
  it("approving makes the profile visible to approved members immediately", () => {
    const sb = signedUpAndSubmitted();
    const approved = ok(moderate(ctx(sb, "moderator"), { targetId: sb.self!.id, action: "approve", reason: "" }));
    expect(visibleIds(approved, "member")).toContain(sb.self!.id);
    expect(visibleIds(approved, "newcomer")).toContain("m01");
  });

  it("rejecting requires a reason, keeps the profile hidden and records the reason in the audit log", () => {
    const sb = signedUpAndSubmitted();
    const id = sb.self!.id;
    expect(moderate(ctx(sb, "moderator"), { targetId: id, action: "reject", reason: "" })).toEqual({ ok: false, error: "A reason is required." });
    const rejected = ok(moderate(ctx(sb, "moderator"), { targetId: id, action: "reject", reason: "Video does not match the photo" }));
    expect(visibleIds(rejected, "member")).not.toContain(id);
    expect(rejected.log[0]).toEqual([NOW, "s01", "reject", id, "Video does not match the photo"]);
  });

  it("flagging keeps the profile pending and hidden", () => {
    const sb = signedUpAndSubmitted();
    const flagged = ok(moderate(ctx(sb, "moderator"), { targetId: sb.self!.id, action: "flag", reason: "Country mismatch" }));
    const mod = ctx(flagged, "moderator");
    expect(mod.policy.getProfileForReview(mod.viewer, sb.self!.id)).toMatchObject({ status: "pending", flag: { reason: "Country mismatch" } });
    expect(visibleIds(flagged, "member")).not.toContain(sb.self!.id);
  });

  it("moderators cannot suspend or ban; admins can, and the member vanishes from search and messages", () => {
    const sb = freshSandbox();
    expect(moderate(ctx(sb, "moderator"), { targetId: "m02", action: "suspend", reason: "Reported" })).toEqual({ ok: false, error: "forbidden" });
    const suspended = ok(moderate(ctx(sb, "admin"), { targetId: "m02", action: "suspend", reason: "Reported" }));
    expect(visibleIds(suspended, "member")).not.toContain("m02");
    const member = ctx(suspended, "member");
    expect(member.policy.listConversations(member.viewer).map((x) => x.other.id)).not.toContain("m02");
    const reinstated = ok(moderate(ctx(suspended, "admin"), { targetId: "m02", action: "reinstate", reason: "" }));
    expect(visibleIds(reinstated, "member")).toContain("m02");
  });

  it("members and pending accounts cannot moderate", () => {
    const sb = signedUpAndSubmitted();
    expect(moderate(ctx(sb, "member"), { targetId: "m08", action: "approve", reason: "" })).toEqual({ ok: false, error: "forbidden" });
    expect(moderate(ctx(sb, "newcomer"), { targetId: sb.self!.id, action: "approve", reason: "" })).toEqual({ ok: false, error: "forbidden" });
    expect(addNote(ctx(sb, "member"), { targetId: "m08", text: "hello" })).toEqual({ ok: false, error: "forbidden" });
  });

  it("caps the audit log in the sandbox", () => {
    let sb = freshSandbox();
    for (let i = 0; i < LIMITS.log + 5; i++) sb = ok(addNote(ctx(sb, "moderator"), { targetId: "m08", text: `note ${i}` }));
    expect(sb.log).toHaveLength(LIMITS.log);
    expect(sb.notes).toHaveLength(LIMITS.notes);
  });
});

describe("Member media and privacy (R2, R4)", () => {
  it("replacing the video sends an approved member back to pending and hides them", () => {
    const before = ctx(freshSandbox(), "member");
    const oldVideo = before.viewer!.videoId!;
    const sb = ok(replaceMedia(before, "video", "clip-5"));
    const after = ctx(sb, "member");
    expect(after.viewer!.status).toBe("pending");
    expect(after.viewer!.videoId).not.toBe(oldVideo);
    expect(after.policy.getAccessibleAsset(after.viewer, oldVideo)).toBeNull();
    const mod = ctx(sb, "moderator");
    expect(mod.policy.reviewQueue(mod.viewer).map((a) => a.id)).toContain("m01");
    expect(mod.policy.getAccessibleAsset(mod.viewer, oldVideo)).toBeNull();
  });

  it("replacing the photo also sends the profile back to review", () => {
    const sb = ok(replaceMedia(ctx(freshSandbox(), "member"), "photo", "sample-b"));
    expect(ctx(sb, "member").viewer!.status).toBe("pending");
  });

  it("a private video is served to the owner and moderators only", () => {
    const sb = signedUpAndSubmitted();
    const approved = ok(moderate(ctx(sb, "moderator"), { targetId: sb.self!.id, action: "approve", reason: "" }));
    const priv = ok(setVisibility(ctx(approved, "newcomer"), "video", "private"));
    const videoId = ctx(priv, "newcomer").viewer!.videoId!;
    for (const [as, allowed] of [["newcomer", true], ["moderator", true], ["admin", true], ["member", false], ["visitor", false]] as const) {
      const c = ctx(priv, as);
      expect(c.policy.getAccessibleAsset(c.viewer, videoId) !== null).toBe(allowed);
    }
  });
});

describe("Blocks and messages (R5)", () => {
  it("a block hides both people from each other; unblocking restores it", () => {
    const blocked = ok(block(ctx(freshSandbox(), "member"), "m02"));
    expect(visibleIds(blocked, "member")).not.toContain("m02");
    const restored = ok(unblock(ctx(blocked, "member"), "m02"));
    expect(visibleIds(restored, "member")).toContain("m02");
  });

  it("unblocking a seeded block makes that member visible again", () => {
    const sb = ok(unblock(ctx(freshSandbox(), "member"), "m05"));
    expect(visibleIds(sb, "member")).toContain("m05");
  });

  it("you cannot block or message someone you cannot see", () => {
    expect(block(ctx(freshSandbox(), "member"), "m08")).toEqual({ ok: false, error: "not_found" });
    expect(requestMessage(ctx(freshSandbox(), "member"), "m06")).toEqual({ ok: false, error: "not_found" });
    expect(requestMessage(ctx(signedUpAndSubmitted(), "newcomer"), "m02")).toEqual({ ok: false, error: "not_found" });
  });

  it("a message request appears in conversations and disappears when the other side is suspended", () => {
    const sb = ok(requestMessage(ctx(freshSandbox(), "member"), "m03"));
    const c = ctx(sb, "member");
    expect(c.policy.listConversations(c.viewer).map((x) => x.other.id)).toContain("m03");
    const suspended = ok(moderate(ctx(sb, "admin"), { targetId: "m03", action: "suspend", reason: "Reported" }));
    const after = ctx(suspended, "member");
    expect(after.policy.listConversations(after.viewer).map((x) => x.other.id)).not.toContain("m03");
  });
});
