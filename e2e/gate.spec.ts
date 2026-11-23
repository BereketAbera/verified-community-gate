import { expect, test } from "@playwright/test";
import { approveAsModerator, signUpAndSubmit, switchTo, uniqueName } from "./helpers";

test("a pending member sees no one and gets a 404 on a direct member link", async ({ page }) => {
  await signUpAndSubmit(page, uniqueName("Pending Tester"));
  await expect(page.getByTestId("member-card")).toHaveCount(0);
  // Both numbers come from the policy, not from the page.
  await expect(page.getByTestId("visible-count")).toHaveText("0");
  await expect(page.getByTestId("seen-by-count")).toHaveText("0");

  for (const id of ["m02", "m01", "m08"]) {
    const response = await page.goto(`/members/${id}`);
    expect(response?.status(), `/members/${id}`).toBe(404);
    await expect(page.getByTestId("not-found")).toBeVisible();
  }
  await page.goto("/messages");
  await expect(page.getByTestId("under-review")).toBeVisible();
});

test("an approved member sees only approved, unblocked members", async ({ page }) => {
  await page.goto("/");
  await switchTo(page, "member");
  await page.waitForURL("**/members");

  const ids = await page.getByTestId("member-card").evaluateAll((cards) => cards.map((c) => c.getAttribute("data-member-id")));
  // Approved: m01 (self), m02-m07, m14. m05 is blocked by m01, m06 blocked m01.
  expect(ids.sort()).toEqual(["m02", "m03", "m04", "m07", "m14"]);

  const expected: Array<[string, number]> = [
    ["m02", 200], // approved
    ["m08", 404], // pending
    ["m11", 404], // rejected
    ["m12", 404], // suspended
    ["m13", 404], // banned
    ["m05", 404], // blocked by the viewer
    ["m06", 404], // blocked the viewer
  ];
  for (const [id, status] of expected) {
    const response = await page.goto(`/members/${id}`);
    expect(response?.status(), `/members/${id}`).toBe(status);
  }
});

test("media needs a valid signature: none is 403, tampered is 403, valid is 200", async ({ page, playwright }) => {
  await page.goto("/");
  await switchTo(page, "member");
  await page.goto("/members/m02");

  const photo = page.locator('[data-testid="signed-media"][data-kind="photo"]');
  const signed = new URL((await photo.getAttribute("data-src"))!, page.url());
  const bare = new URL(signed.pathname, signed.origin);
  const tampered = new URL(signed);
  const sig = tampered.searchParams.get("sig")!;
  tampered.searchParams.set("sig", (sig[0] === "A" ? "B" : "A") + sig.slice(1));

  expect((await page.request.get(bare.toString())).status()).toBe(403);
  expect((await page.request.get(tampered.toString())).status()).toBe(403);

  const ok = await page.request.get(signed.toString());
  expect(ok.status()).toBe(200);
  expect(ok.headers()["cache-control"]).toBe("private, no-store");
  expect(ok.headers()["content-type"]).toBe("image/jpeg");

  // The same valid link is refused to a browser without this session.
  const stranger = await playwright.request.newContext();
  expect((await stranger.get(signed.toString())).status()).toBe(403);
  await stranger.dispose();

  // Video supports byte ranges.
  const video = page.locator('[data-testid="signed-media"][data-kind="video"]');
  const videoUrl = new URL((await video.getAttribute("data-src"))!, page.url());
  const partial = await page.request.get(videoUrl.toString(), { headers: { Range: "bytes=0-1023" } });
  expect(partial.status()).toBe(206);
  expect(partial.headers()["content-range"]).toMatch(/^bytes 0-1023\/\d+$/);

  // A private photo gets no link at all.
  await page.goto("/members/m03");
  await expect(page.locator('[data-testid="media-placeholder"][data-reason="private"]')).toBeVisible();
  await expect(page.locator('[data-testid="signed-media"][data-kind="photo"]')).toHaveCount(0);
});

test("a moderator approval makes the new member visible to approved members", async ({ page }) => {
  const name = uniqueName("Approval Tester");
  await signUpAndSubmit(page, name);

  await switchTo(page, "member");
  await page.waitForURL("**/members");
  await expect(page.getByText(name)).toHaveCount(0);

  const id = await approveAsModerator(page, name);

  await switchTo(page, "member");
  await page.waitForURL("**/members");
  await expect(page.locator(`[data-testid="member-card"][data-member-id="${id}"]`)).toContainText(name);
  expect((await page.goto(`/members/${id}`))?.status()).toBe(200);
});

test("replacing the video sends a member back to review and hides them", async ({ page }) => {
  // A second approved account, so someone else can look at the demo member.
  const name = uniqueName("Observer");
  await signUpAndSubmit(page, name);
  await approveAsModerator(page, name);

  await switchTo(page, "member");
  await page.goto("/me");
  await page.getByTestId("replace-video-form").locator("select").selectOption("sample-d");
  await page.getByTestId("replace-video").click();
  await page.waitForURL(/\/me\?notice=replaced-video/);
  await expect(page.getByTestId("profile-visibility")).toContainText("Hidden from everyone");
  await page.goto("/members");
  await expect(page.getByTestId("under-review")).toBeVisible();

  await switchTo(page, "newcomer");
  await page.waitForURL("**/members");
  await expect(page.getByTestId("member-card").first()).toBeVisible();
  await expect(page.locator('[data-member-id="m01"]')).toHaveCount(0);
  expect((await page.goto("/members/m01"))?.status()).toBe(404);

  await switchTo(page, "moderator");
  await expect(page.locator('tr[data-member-id="m01"]')).toBeVisible();
});

test("a free member must subscribe to start a conversation, and replying stays free", async ({ page }) => {
  await page.goto("/");
  await switchTo(page, "member");

  // Accepting a request someone sent is free.
  await page.goto("/messages");
  await page.getByTestId("conversation-c6").click();
  await page.getByTestId("accept-request").click();
  await page.waitForURL(/\/messages\/c6\?notice=accepted/);
  await expect(page.getByTestId("request-actions")).toHaveCount(0);

  // Starting one is not, until the member subscribes (test mode).
  await page.goto("/members/m03");
  await expect(page.getByTestId("request-message")).toHaveCount(0);
  await page.getByTestId("subscribe").click();
  await page.waitForURL(/\/members\/m03\?notice=subscribed/);
  await page.getByTestId("request-message").click();
  await page.waitForURL(/\/messages\?notice=requested/);
  await expect(page.locator('[data-testid="conversations"] [data-member-id="m03"]')).toBeVisible();
});

test("the third open report hides a member until a moderator reviews the reports", async ({ page }) => {
  await page.goto("/");
  await switchTo(page, "member");
  await page.goto("/members/m04");
  await page.getByTestId("report-member").click();
  await page.getByRole("radio", { name: "Asked for money" }).click();
  await page.getByTestId("send-report").click();
  await page.waitForURL(/\/members\?notice=reported-hidden/);
  await expect(page.locator('[data-testid="member-card"][data-member-id="m04"]')).toHaveCount(0);
  expect((await page.goto("/members/m04"))?.status()).toBe(404);

  await switchTo(page, "moderator");
  await page.goto("/moderate?view=reports");
  await page.getByTestId("reports-m04").click();
  await page.getByTestId("clear-reports").click();
  await page.waitForURL(/\/moderate\/m04\?done=reports/);

  await switchTo(page, "member");
  await page.waitForURL("**/members");
  await expect(page.locator('[data-testid="member-card"][data-member-id="m04"]')).toBeVisible();
});
