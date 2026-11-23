/** End-to-end tests in e2e/gate.spec.ts and the rule each one proves. A unit test keeps the titles in sync. */
export const E2E_TESTS = [
  {
    title: "a pending member sees no one and gets a 404 on a direct member link",
    rule: "A pending account cannot see members, nobody can see it, and a direct member URL returns a real 404 (R5).",
  },
  {
    title: "an approved member sees only approved, unblocked members",
    rule: "Search lists approved members only: never pending, rejected, suspended, banned, blocked or yourself (R5).",
  },
  {
    title: "media needs a valid signature: none is 403, tampered is 403, valid is 200",
    rule: "There are no public media URLs; only a fresh link issued to this viewer opens a file (R4).",
  },
  {
    title: "a moderator approval makes the new member visible to approved members",
    rule: "A profile stays invisible until a moderator ticks the checklist (same person, five prompts, each language) and approves; then it appears at once (R2, R3).",
  },
  {
    title: "replacing the video sends a member back to review and hides them",
    rule: "New media goes back to review, and the profile disappears until approved again (R2).",
  },
  {
    title: "a free member must subscribe to start a conversation, and replying stays free",
    rule: "Accepting a request is free; starting a conversation needs a membership, here through the test-mode checkout (R6, R7).",
  },
  {
    title: "the third open report hides a member until a moderator reviews the reports",
    rule: "Three open reports hide a profile from every member at once; a moderator's review restores it (R9).",
  },
] as const;
