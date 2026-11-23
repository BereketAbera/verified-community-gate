import { expect, test, type Page } from "@playwright/test";
import { signUpAndSubmit, switchTo, tickChecklist } from "./helpers";

// Proposal screenshots. Run with: BASE_URL=... SCREENS_DIR=... PROPOSAL_DIR=... pnpm screens
const DIR = process.env.SCREENS_DIR ?? "screens";
const PROPOSAL_DIR = process.env.PROPOSAL_DIR ?? `${DIR}/proposal`;

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0));
  await page.waitForFunction(() => Array.from(document.querySelectorAll("video")).every((v) => v.readyState >= 3));
  // Keep the pointer away so the native video controls fade out while the clip plays.
  await page.mouse.move(0, 0);
  const videos = await page.locator("video").count();
  await page.waitForTimeout(videos > 0 ? 3500 : 800);
  await page.evaluate(() => document.fonts.ready);
}

async function shot(page: Page, path: string) {
  await settle(page);
  await page.screenshot({ path });
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("home", async ({ page }) => {
    await page.goto("/");
    await shot(page, `${DIR}/gate-home-desktop.png`);
  });

  test("pending", async ({ page }) => {
    await signUpAndSubmit(page, "Hana Tesfaye");
    await shot(page, `${DIR}/gate-pending-desktop.png`);
  });

  test("browse", async ({ page }) => {
    await page.goto("/");
    await switchTo(page, "member");
    await page.waitForURL("**/members");
    await shot(page, `${DIR}/gate-browse-desktop.png`);
  });

  test("moderate detail", async ({ page }) => {
    await page.goto("/");
    await switchTo(page, "moderator");
    await page.goto("/moderate/m09");
    await expect(page.getByTestId("side-by-side").getByTestId("signed-media")).toHaveCount(2);
    await shot(page, `${DIR}/gate-moderate-detail-desktop.png`);
  });

  test("audit", async ({ page }) => {
    await page.goto("/");
    await switchTo(page, "moderator");
    await page.goto("/moderate/m08");
    await tickChecklist(page);
    await page.getByTestId("approve").click();
    await expect(page.getByTestId("notice")).toContainText("Approved");
    await page.goto("/moderate/m10");
    await page.getByTestId("reject-reason").fill("Video is unclear or too short");
    await page.getByTestId("reject").click();
    await expect(page.getByTestId("notice")).toContainText("Rejected");
    await page.goto("/moderate/audit");
    await shot(page, `${DIR}/gate-audit-desktop.png`);
  });

  test("how it works", async ({ page }) => {
    await page.goto("/how-it-works");
    await shot(page, `${DIR}/gate-how-it-works-desktop.png`);
  });

  test("tests", async ({ page }) => {
    await page.goto("/tests");
    await shot(page, `${DIR}/gate-tests-desktop.png`);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  test("browse", async ({ page }) => {
    await page.goto("/");
    await switchTo(page, "member");
    await page.waitForURL("**/members");
    await shot(page, `${DIR}/gate-browse-phone.png`);
  });
});

test.describe("proposal, 2x", () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test("moderate detail", async ({ page }) => {
    await page.goto("/");
    await switchTo(page, "moderator");
    await page.goto("/moderate/m09");
    await expect(page.getByTestId("side-by-side").getByTestId("signed-media")).toHaveCount(2);
    await shot(page, `${PROPOSAL_DIR}/gate-moderate-detail@2x.png`);
  });

  test("tests", async ({ page }) => {
    await page.goto("/tests");
    await shot(page, `${PROPOSAL_DIR}/gate-tests@2x.png`);
  });
});
