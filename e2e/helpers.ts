import { expect, type Page } from "@playwright/test";

const LABELS = {
  visitor: "Visitor",
  newcomer: "Your signup",
  member: "Amara (member)",
  moderator: "Morgan (moderator)",
  admin: "Riley (admin)",
} as const;

export type IdentityName = keyof typeof LABELS;

/** Switches identity through the header menu, the way a reviewer would. */
export async function switchTo(page: Page, as: IdentityName) {
  await page.getByTestId("identity-trigger").click();
  await page.getByTestId(`identity-${as}`).click();
  await expect(page.getByTestId("identity-trigger")).toContainText(LABELS[as]);
}

/** Signs up as a new member and submits sample media and two prompts. Ends on the under-review screen. */
export async function signUpAndSubmit(page: Page, name: string, sample = "sample-b") {
  await page.goto("/");
  await switchTo(page, "newcomer");
  await page.waitForURL("**/join");
  await page.getByLabel("Display name", { exact: true }).fill(name);
  await page.getByLabel("Age", { exact: true }).fill("29");
  await page.getByLabel("City", { exact: true }).fill("Portland");
  await page.getByLabel("Country", { exact: true }).selectOption("US");
  await page.getByRole("checkbox", { name: "English" }).click();
  await page.getByRole("radio", { name: "Friendship" }).click();
  await page.getByRole("checkbox", { name: /18 or older/ }).click();
  await page.getByRole("checkbox", { name: /accept the community terms/ }).click();
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/join/verify");
  await page.getByTestId("prompt-o1").click();
  await page.getByTestId("prompt-o3").click();
  await page.getByTestId(`pick-${sample}`).click();
  await page.getByTestId(`pick-video-${sample}`).click();
  await page.getByTestId("verify-submit").click();
  await page.waitForURL("**/members");
  await expect(page.getByTestId("under-review")).toBeVisible();
}

/** Ticks everything a moderator saw and heard: same person, each prompt, each language. */
export async function tickChecklist(page: Page) {
  await page.getByTestId("check-same-person").click();
  for (const box of await page.locator('[data-testid^="check-prompt-"], [data-testid^="check-language-"]').all()) await box.click();
}

/** As the moderator, approves the signup with this display name. Returns its member id. */
export async function approveAsModerator(page: Page, name: string): Promise<string> {
  await switchTo(page, "moderator");
  await page.waitForURL("**/moderate");
  await page.getByRole("row", { name: new RegExp(name) }).getByRole("link", { name: "Review" }).click();
  await page.waitForURL(/\/moderate\/u-[a-z0-9]+$/);
  const id = new URL(page.url()).pathname.split("/").pop()!;
  await expect(page.getByTestId("side-by-side").getByTestId("signed-media")).toHaveCount(2);
  await expect(page.getByTestId("approve")).toBeDisabled();
  await tickChecklist(page);
  await page.getByTestId("approve").click();
  await expect(page.getByTestId("notice")).toContainText("Approved");
  return id;
}

export const uniqueName = (prefix: string) => `${prefix} ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
