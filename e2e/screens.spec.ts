import { expect, test, type Page } from "@playwright/test";
import { signUpAndSubmit, switchTo } from "./helpers";

// Proposal screenshots. Run with: BASE_URL=... SCREENS_DIR=... pnpm screens
const DIR = process.env.SCREENS_DIR ?? "screens";

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0));
  await page.waitForFunction(() => Array.from(document.querySelectorAll("video")).every((v) => v.readyState >= 3));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.fonts.ready);
}

async function shot(page: Page, name: string) {
  await settle(page);
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("home", async ({ page }) => {
    await page.goto("/");
    await shot(page, "gate-home-desktop");
  });

  test("pending", async ({ page }) => {
    await signUpAndSubmit(page, "Hana Tesfaye");
    await shot(page, "gate-pending-desktop");
  });

  test("browse", async ({ page }) => {
    await page.goto("/");
    await switchTo(page, "member");
    await page.waitForURL("**/members");
    await shot(page, "gate-browse-desktop");
  });

  test("moderate detail", async ({ page }) => {
    await page.goto("/");
    await switchTo(page, "moderator");
    await page.goto("/moderate/m09");
    await expect(page.getByTestId("side-by-side").getByTestId("signed-media")).toHaveCount(2);
    await shot(page, "gate-moderate-detail-desktop");
  });

  test("audit", async ({ page }) => {
    await page.goto("/");
    await switchTo(page, "moderator");
    await page.goto("/moderate/m08");
    await page.getByTestId("approve").click();
    await expect(page.getByTestId("notice")).toContainText("Approved");
    await page.goto("/moderate/m10");
    await page.getByTestId("reject-reason").fill("Video is unclear or too short");
    await page.getByTestId("reject").click();
    await expect(page.getByTestId("notice")).toContainText("Rejected");
    await page.goto("/moderate/audit");
    await shot(page, "gate-audit-desktop");
  });

  test("how it works", async ({ page }) => {
    await page.goto("/how-it-works");
    await shot(page, "gate-how-it-works-desktop");
  });

  test("tests", async ({ page }) => {
    await page.goto("/tests");
    await shot(page, "gate-tests-desktop");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  test("browse", async ({ page }) => {
    await page.goto("/");
    await switchTo(page, "member");
    await page.waitForURL("**/members");
    await shot(page, "gate-browse-phone");
  });
});
