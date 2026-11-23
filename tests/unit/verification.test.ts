// The approval gate for a verification recording (R2, R3).
import { describe, expect, it } from "vitest";
import { approvalProblems, promptsFor, type Checklist } from "@/lib/verification";
import { account } from "./helpers";

function member(seconds: number, prompts = promptsFor(["o1", "o2"]), languages = ["English", "Amharic"]) {
  return account("m", "member", "pending", { verification: { prompts, seconds }, languages });
}

const ALL: Checklist = { samePerson: true, prompts: promptsFor(["o1", "o2"]), languages: ["English", "Amharic"] };

describe("Approval checklist", () => {
  it("a complete checklist on a 2:00 to 5:00 recording passes", () => {
    for (const seconds of [120, 185, 300]) expect(approvalProblems(member(seconds), ALL)).toEqual([]);
  });

  it.each([[0], [60], [119]])("a %i-second recording is under the minimum", (seconds) => {
    expect(approvalProblems(member(seconds), ALL).join(" ")).toContain("under the 2:00 minimum");
  });

  it.each([[301], [420], [900]])("a %i-second recording is over the maximum", (seconds) => {
    expect(approvalProblems(member(seconds), ALL).join(" ")).toContain("over the 5:00 maximum");
  });

  it("fewer than five prompts cannot be approved, even with every tick", () => {
    const four = promptsFor(["o1"]);
    expect(approvalProblems(member(185, four), { ...ALL, prompts: four })).toEqual(["The recording answers 4 of 5 prompts."]);
  });

  it("five prompts without all three fixed ones cannot be approved", () => {
    const prompts = ["f1", "f3", "o1", "o2", "o3"];
    expect(approvalProblems(member(185, prompts), { ...ALL, prompts })).toEqual(["The recording skips 1 fixed prompt."]);
  });

  it("each tick is required: same person, every prompt, every language", () => {
    expect(approvalProblems(member(185), { ...ALL, samePerson: false })).toEqual(["Confirm the video shows the person in the photo."]);
    expect(approvalProblems(member(185), { ...ALL, prompts: ALL.prompts.slice(0, 3) })).toEqual(["Tick every prompt you heard answered (3 of 5 ticked)."]);
    expect(approvalProblems(member(185), { ...ALL, languages: ["English"] })).toEqual(["Tick each language you heard (Amharic not ticked)."]);
  });

  it("nothing can be approved without a photo and a video", () => {
    expect(approvalProblems(account("m", "member", "pending", { photoId: null }), ALL)).toEqual(["This profile has not submitted a photo and video yet."]);
  });
});
