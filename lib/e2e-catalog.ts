/** End-to-end tests in e2e/gate.spec.ts and the rule each one proves. A unit test keeps the titles in sync. */
export const E2E_TESTS = [
  {
    title: "a pending member sees no one and gets a 404 on a direct member link",
    rule: "A pending account cannot see members, and a direct member URL returns a real 404 (R5).",
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
    rule: "A profile stays invisible until a person approves it, then appears at once (R2, R3).",
  },
  {
    title: "replacing the video sends a member back to review and hides them",
    rule: "New media goes back to review, and the profile disappears until approved again (R2).",
  },
] as const;
