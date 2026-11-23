// End-to-end rules on the real seed data, through the same pure functions the server actions call.
import { describe, expect, it } from "vitest";
import {
  addNote,
  answerRequest,
  block,
  clearReports,
  moderate,
  recordBillingEvent,
  replaceMedia,
  report,
  requestMessage,
  setComplimentary,
  setVisibility,
  signup,
  submitVerification,
  switchIdentity,
  unblock,
  type DomainContext,
  type Result,
  type SignupInput,
} from "@/lib/domain";
import { addMonths } from "@/lib/access";
import { createPolicy } from "@/lib/policy";
import { TERMS_VERSION } from "@/lib/reference";
import { freshSandbox, LIMITS, type Sandbox } from "@/lib/sandbox";
import { sealSandbox, openSandbox, deriveSandboxKey } from "@/lib/sandbox-codec";
import { buildWorld, iso, viewerFor } from "@/lib/world";
import type { Identity } from "@/lib/types";
import type { Checklist } from "@/lib/verification";

const NOW = 1_795_400_000; // 2026-11-23T02:13:20Z, fixed so seed-relative results never drift

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
  languages: ["English", "Amharic"],
  lookingFor: "friendship",
  about: "Hello",
  extra: { occupation: "Nurse", children: "" },
  adult: true,
  terms: true,
  faithConsent: false,
  faith: { words: "Typed but not consented", importance: "very", attendance: "" },
};

function signedUp(): Sandbox {
  return ok(signup(ctx(freshSandbox(), "newcomer"), SIGNUP, "US"));
}

function signedUpAndSubmitted(video: "sample-a" | "sample-b" = "sample-a"): Sandbox {
  return ok(submitVerification(ctx(signedUp(), "newcomer"), { photo: "sample-a", video, prompts: ["o1", "o3"] }));
}

/** Everything ticked, as a moderator who watched the whole recording would. */
function fullChecklist(sb: Sandbox, id: string): Checklist {
  const account = ctx(sb, "moderator").world.accounts.get(id)!;
  return { samePerson: true, prompts: account.verification?.prompts ?? [], languages: account.languages };
}

const approve = (sb: Sandbox, id: string, checklist: Checklist = fullChecklist(sb, id)) =>
  moderate(ctx(sb, "moderator"), { targetId: id, action: "approve", reason: "", checklist });

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
    expect(others).toEqual(["m07", "m02", "m14"]); // m07's is an incoming request
  });

  it("every seeded terms acceptance is on or after the terms version date", () => {
    const c = ctx(freshSandbox(), "admin");
    for (const a of c.world.accounts.values()) {
      if (a.terms) expect(Date.parse(a.terms.acceptedAt)).toBeGreaterThanOrEqual(Date.parse(TERMS_VERSION));
    }
  });
});

describe("Signup and verification (R1, R2)", () => {
  it("a new signup is pending, sees nobody and is seen by nobody", () => {
    const sb = signedUpAndSubmitted();
    const self = sb.self!;
    expect(visibleIds(sb, "newcomer")).toEqual([]);
    expect(visibleIds(sb, "member")).not.toContain(self.id);
    const member = ctx(sb, "member");
    expect(member.policy.getVisibleMember(member.viewer, self.id)).toBeNull();
    const newcomer = ctx(sb, "newcomer");
    expect(newcomer.policy.countWhoCanSee(newcomer.viewer!)).toBe(0);
  });

  it("records the terms version and time, and drops faith answers without their own consent", () => {
    const sb = signedUp();
    expect(sb.self).toMatchObject({ tv: TERMS_VERSION, ta: NOW, fa: null, fc: null, x: { occupation: "Nurse" } });
    const consented = ok(signup(ctx(freshSandbox(), "newcomer"), { ...SIGNUP, faithConsent: true, faith: { words: "Practising", importance: "very", attendance: "" } }, null));
    expect(consented.self).toMatchObject({ fa: { words: "Practising", importance: "very" }, fc: NOW, det: null });
  });

  it("keeps the detected country for staff to compare", () => {
    const sb = ok(signup(ctx(freshSandbox(), "newcomer"), SIGNUP, "DE"));
    const mod = ctx(sb, "moderator");
    expect(mod.policy.getProfileForReview(mod.viewer, sb.self!.id)).toMatchObject({ country: "US", detectedCountry: "DE" });
  });

  it("a submission records the five prompts and the recording length, and enters the queue", () => {
    const sb = signedUpAndSubmitted();
    const mod = ctx(sb, "moderator");
    const me = mod.policy.getProfileForReview(mod.viewer, sb.self!.id)!;
    expect(me.verification).toEqual({ prompts: ["f1", "f2", "f3", "o1", "o3"], seconds: 185 });
    expect(mod.policy.reviewQueue(mod.viewer).map((a) => a.id)).toContain(sb.self!.id);
  });

  it("the signup record stays in the audit log after the cookie's log is trimmed", () => {
    let sb = signedUpAndSubmitted();
    for (let i = 0; i < LIMITS.log + 5; i++) sb = ok(addNote(ctx(sb, "moderator"), { targetId: "m08", text: `note ${i}` }));
    const admin = ctx(sb, "admin");
    expect(admin.policy.listAudit(admin.viewer, sb.self!.id).map((e) => e.action)).toContain("signup");
  });
});

describe("Approval gate (R2, R3)", () => {
  it("approving with the full checklist makes the profile visible at once and records the checklist", () => {
    const sb = signedUpAndSubmitted();
    const id = sb.self!.id;
    const approved = ok(approve(sb, id));
    expect(visibleIds(approved, "member")).toContain(id);
    expect(visibleIds(approved, "newcomer")).toContain("m01");
    expect(approved.log[0]).toEqual([NOW, "s01", "approve", id, "Checklist: same person; prompts 5/5; heard English, Amharic; length 3:05"]);
  });

  it("a recording under 2:00 cannot be approved", () => {
    // Esther's seeded recording is 1:48.
    const sb = freshSandbox();
    const result = approve(sb, "m10");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("under the 2:00 minimum");
  });

  it("a recording over 5:00 cannot be approved", () => {
    const sb = signedUpAndSubmitted();
    const id = sb.self!.id;
    sb.ov[id]!.vm = { p: ["o1", "o3"], s: 301 };
    const result = approve(sb, id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("over the 5:00 maximum");
  });

  it("a recording that answers fewer than five prompts cannot be approved", () => {
    const sb = signedUpAndSubmitted();
    const id = sb.self!.id;
    sb.ov[id]!.vm = { p: ["o1"], s: 185 };
    const result = approve(sb, id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("answers 4 of 5 prompts");
  });

  it("every checklist item is needed: same person, each prompt, each language", () => {
    const sb = signedUpAndSubmitted();
    const id = sb.self!.id;
    const full = fullChecklist(sb, id);
    expect(approve(sb, id, { ...full, samePerson: false }).ok).toBe(false);
    expect(approve(sb, id, { ...full, prompts: full.prompts.slice(1) }).ok).toBe(false);
    expect(approve(sb, id, { ...full, languages: ["English"] }).ok).toBe(false);
    expect(approve(sb, id, full).ok).toBe(true);
  });

  it("rejecting requires a reason, keeps the profile hidden and records the reason in the audit log", () => {
    const sb = signedUpAndSubmitted();
    const id = sb.self!.id;
    expect(moderate(ctx(sb, "moderator"), { targetId: id, action: "reject", reason: "" })).toEqual({ ok: false, error: "Write a reason. The member will see it." });
    expect(moderate(ctx(sb, "moderator"), { targetId: id, action: "reject", reason: "no" })).toEqual({ ok: false, error: "Write a reason of at least 3 characters." });
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

describe("Suspend and reinstate never skip review (R3)", () => {
  const suspend = (sb: Sandbox, id: string) => ok(moderate(ctx(sb, "admin"), { targetId: id, action: "suspend", reason: "Under investigation" }));
  const reinstate = (sb: Sandbox, id: string) => ok(moderate(ctx(sb, "admin"), { targetId: id, action: "reinstate", reason: "" }));
  const statusOf = (sb: Sandbox, id: string) => ctx(sb, "admin").world.accounts.get(id)!.status;

  it("moderators cannot suspend; admins can, and the member vanishes from search and messages until reinstated", () => {
    const sb = freshSandbox();
    expect(moderate(ctx(sb, "moderator"), { targetId: "m02", action: "suspend", reason: "Reported" })).toEqual({ ok: false, error: "forbidden" });
    const suspended = suspend(sb, "m02");
    expect(visibleIds(suspended, "member")).not.toContain("m02");
    const member = ctx(suspended, "member");
    expect(member.policy.listConversations(member.viewer).map((x) => x.other.id)).not.toContain("m02");
    const reinstated = reinstate(suspended, "m02");
    expect(statusOf(reinstated, "m02")).toBe("approved");
    expect(visibleIds(reinstated, "member")).toContain("m02");
  });

  it("a pending profile that is suspended and reinstated goes back to pending, hidden and in the queue", () => {
    const sb = reinstate(suspend(freshSandbox(), "m08"), "m08");
    expect(statusOf(sb, "m08")).toBe("pending");
    expect(visibleIds(sb, "member")).not.toContain("m08");
    const mod = ctx(sb, "moderator");
    expect(mod.policy.reviewQueue(mod.viewer).map((a) => a.id)).toContain("m08");
    expect(sb.log[0]).toEqual([NOW, "s02", "reinstate", "m08", null]);
  });

  it("a member who replaced their video, then was suspended and reinstated, stays pending", () => {
    const replaced = ok(replaceMedia(ctx(freshSandbox(), "member"), "video", "sample-d"));
    const sb = reinstate(suspend(replaced, "m01"), "m01");
    expect(statusOf(sb, "m01")).toBe("pending");
    expect(visibleIds(sb, "newcomer")).not.toContain("m01");
    expect(visibleIds(sb, "admin")).not.toContain("m01");
  });

  it("a signup with no photo or video can never become visible", () => {
    const sb = signedUp();
    const id = sb.self!.id;
    expect(approve(sb, id, { samePerson: true, prompts: [], languages: [] })).toEqual({ ok: false, error: "This profile has not submitted a photo and video yet." });
    const back = reinstate(suspend(sb, id), id);
    expect(statusOf(back, id)).toBe("pending");
    for (const as of ["member", "moderator", "admin"] as const) expect(visibleIds(back, as)).not.toContain(id);
  });
});

describe("Member media and privacy (R2, R4)", () => {
  it("replacing the video sends an approved member back to pending and hides them", () => {
    const before = ctx(freshSandbox(), "member");
    const oldVideo = before.viewer!.videoId!;
    const sb = ok(replaceMedia(before, "video", "sample-c"));
    const after = ctx(sb, "member");
    expect(after.viewer!.status).toBe("pending");
    expect(after.viewer!.videoId).not.toBe(oldVideo);
    expect(after.viewer!.verification).toEqual({ prompts: ["f1", "f2", "f3", "o1", "o3"], seconds: 250 });
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
    const approved = ok(approve(sb, sb.self!.id));
    const priv = ok(setVisibility(ctx(approved, "newcomer"), "video", "private"));
    const videoId = ctx(priv, "newcomer").viewer!.videoId!;
    for (const [as, allowed] of [["newcomer", true], ["moderator", true], ["admin", true], ["member", false], ["visitor", false]] as const) {
      const c = ctx(priv, as);
      expect(c.policy.getAccessibleAsset(c.viewer, videoId) !== null).toBe(allowed);
    }
  });
});

describe("Blocks, reports and messages (R5, R7, R9)", () => {
  it("a block hides both people from each other; unblocking restores it", () => {
    const blocked = ok(block(ctx(freshSandbox(), "member"), "m02"));
    expect(visibleIds(blocked, "member")).not.toContain("m02");
    const restored = ok(unblock(ctx(blocked, "member"), "m02"));
    expect(visibleIds(restored, "member")).toContain("m02");
  });

  it("blocking twice lands on the same result", () => {
    const once = ok(block(ctx(freshSandbox(), "member"), "m02"));
    const twice = block(ctx(once, "member"), "m02");
    expect(twice).toEqual({ ok: true, sandbox: switchIdentity(once, "member") });
  });

  it("unblocking a seeded block makes that member visible again", () => {
    const sb = ok(unblock(ctx(freshSandbox(), "member"), "m05"));
    expect(visibleIds(sb, "member")).toContain("m05");
  });

  it("you cannot block, report or message someone you cannot see", () => {
    expect(block(ctx(freshSandbox(), "member"), "m08")).toEqual({ ok: false, error: "not_found" });
    expect(report(ctx(freshSandbox(), "member"), "m08", "fake")).toEqual({ ok: false, error: "not_found" });
    expect(requestMessage(ctx(freshSandbox(), "member"), "m06")).toEqual({ ok: false, error: "not_found" });
    expect(requestMessage(ctx(signedUpAndSubmitted(), "newcomer"), "m02")).toEqual({ ok: false, error: "not_found" });
  });

  it("the third open report hides Samuel from search until a moderator reviews the reports", () => {
    expect(visibleIds(freshSandbox(), "member")).toContain("m04"); // two open reports in the seed
    const reported = ok(report(ctx(freshSandbox(), "member"), "m04", "money"));
    expect(visibleIds(reported, "member")).not.toContain("m04");
    expect(visibleIds(reported, "newcomer")).not.toContain("m04");
    const mod = ctx(reported, "moderator");
    expect(mod.policy.reportedProfiles(mod.viewer)[0]).toMatchObject({ member: { id: "m04" }, hidden: true });
    expect(clearReports(ctx(reported, "member"), "m04")).toEqual({ ok: false, error: "forbidden" });
    const reviewed = ok(clearReports(mod, "m04"));
    expect(visibleIds(reviewed, "member")).toContain("m04");
    expect(reviewed.log[0]).toEqual([NOW, "s01", "reports_cleared", "m04", "3 reports reviewed"]);
  });

  it("a member's report counts once while it is open", () => {
    const sb = ok(report(ctx(freshSandbox(), "member"), "m02", "fake"));
    expect(report(ctx(sb, "member"), "m02", "money")).toEqual({ ok: true, sandbox: switchIdentity(sb, "member") });
    expect(sb.rep).toHaveLength(1);
  });

  it("a free member cannot start a conversation, but can accept a request for free", () => {
    expect(requestMessage(ctx(freshSandbox(), "member"), "m03")).toEqual({ ok: false, error: "subscription_required" });
    const accepted = ok(answerRequest(ctx(freshSandbox(), "member"), "c6", "accepted"));
    const c = ctx(accepted, "member");
    expect(c.policy.getConversation(c.viewer, "c6")).toMatchObject({ conversation: { state: "active" }, incoming: false });
  });

  it("declining a request removes the conversation for both members", () => {
    const declined = ok(answerRequest(ctx(freshSandbox(), "member"), "c6", "declined"));
    const amara = ctx(declined, "member");
    expect(amara.policy.listConversations(amara.viewer).map((x) => x.conversation.id)).not.toContain("c6");
    expect(answerRequest(ctx(freshSandbox(), "member"), "c1", "declined")).toEqual({ ok: false, error: "not_found" }); // not a request to her
  });

  it("a message request appears in conversations and disappears when the other side is suspended", () => {
    const subscribed = ok(recordBillingEvent(ctx(freshSandbox(), "member"), { id: "evt-test-000001", type: "subscription.active", memberId: "m01", periodEnd: "2026-12-17T00:00:00.000Z" }));
    const requested = ok(requestMessage(ctx(subscribed, "member"), "m03"));
    const c = ctx(requested, "member");
    expect(c.policy.listConversations(c.viewer).map((x) => x.other.id)).toContain("m03");
    const suspended = ok(moderate(ctx(requested, "admin"), { targetId: "m03", action: "suspend", reason: "Reported" }));
    const after = ctx(suspended, "member");
    expect(after.policy.listConversations(after.viewer).map((x) => x.other.id)).not.toContain("m03");
  });
});

describe("Access and billing (R6)", () => {
  const event = { id: "evt-test-000002", type: "subscription.active" as const, memberId: "m01", periodEnd: "2026-12-17T00:00:00.000Z" };

  it("a test-mode subscription lets a free member start conversations", () => {
    const sb = ok(recordBillingEvent(ctx(freshSandbox(), "member"), event));
    const c = ctx(sb, "member");
    expect(c.viewer!.access).toEqual({ kind: "paid", until: "2026-12-17T00:00:00.000Z", setBy: null });
    expect(c.policy.canStartConversation(c.viewer, c.world.accounts.get("m03")!)).toBe(true);
    expect(sb.log[0]).toEqual([NOW, "m01", "access_changed", "m01", "Subscription active (test mode) until Dec 17, 2026"]);
  });

  it("a replayed webhook changes nothing", () => {
    const once = ok(recordBillingEvent(ctx(freshSandbox(), "member"), event));
    const replay = recordBillingEvent(ctx(once, "member"), { ...event, periodEnd: "2027-06-01T00:00:00.000Z" });
    expect(replay).toEqual({ ok: true, sandbox: switchIdentity(once, "member") });
  });

  it("only admins give complimentary access, and it ends on its date", () => {
    expect(setComplimentary(ctx(freshSandbox(), "moderator"), "m01", "2026-12-31")).toEqual({ ok: false, error: "forbidden" });
    expect(setComplimentary(ctx(freshSandbox(), "admin"), "m01", "2026-01-01")).toEqual({ ok: false, error: "Choose an end date in the future." });
    const sb = ok(setComplimentary(ctx(freshSandbox(), "admin"), "m01", "2026-12-31"));
    const c = ctx(sb, "member");
    expect(c.viewer!.access).toEqual({ kind: "complimentary", until: "2026-12-31T23:59:00.000Z", setBy: "s02" });
    expect(c.policy.canStartConversation(c.viewer, c.world.accounts.get("m03")!)).toBe(true);
    // After the end date the same record no longer allows starting a conversation.
    const member = switchIdentity(sb, "member");
    const later = buildWorld(member, Date.parse("2027-01-02T00:00:00Z"));
    expect(createPolicy(later).canStartConversation(viewerFor(later, member), later.accounts.get("m03")!)).toBe(false);
  });

  it("a new signup takes a founding place, and its three free months start at approval", () => {
    const sb = signedUpAndSubmitted();
    const before = ctx(sb, "newcomer");
    expect(before.viewer!.access).toEqual({ kind: "founding", until: null, setBy: null });
    expect(before.policy.foundingPlaces()).toEqual({ taken: 488, total: 500 });
    const approved = ok(approve(sb, sb.self!.id));
    const after = ctx(approved, "newcomer");
    expect(after.viewer!.access.kind).toBe("founding");
    expect(after.viewer!.access.until).toBe(iso(addMonths(NOW, 3)));
    expect(after.policy.canStartConversation(after.viewer, after.world.accounts.get("m02")!)).toBe(true);
  });
});

describe("Cookie round trip of a busy sandbox", () => {
  it("a sandbox with a signup, a decision, a report and a subscription still seals and opens", async () => {
    const key = deriveSandboxKey("session-secret-for-tests-0123456789abcdef");
    const submitted = signedUpAndSubmitted();
    let sb = ok(approve(submitted, submitted.self!.id));
    sb = ok(report(ctx(sb, "member"), "m04", "money"));
    sb = ok(recordBillingEvent(ctx(sb, "member"), { id: "evt-test-000003", type: "subscription.active", memberId: "m01", periodEnd: "2026-12-17T00:00:00.000Z" }));
    expect(await openSandbox(await sealSandbox(sb, key), key)).toEqual(sb);
  });
});
