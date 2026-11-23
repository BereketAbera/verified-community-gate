import { expect, type Page } from "@playwright/test";

const LABELS = {
  visitor: "Visitor",
  newcomer: "New member (pending)",
  member: "Approved member",
  moderator: "Moderator",
  admin: "Admin",
} as const;

export type IdentityName = keyof typeof LABELS;

/** Switches identity through the header menu, the way a reviewer would. */
export async function switchTo(page: Page, as: IdentityName) {
  await page.getByTestId("identity-trigger").click();
  await page.getByTestId(`identity-${as}`).click();
  await expect(page.getByTestId("identity-trigger")).toContainText(LABELS[as]);
}

/** Signs up as a new member and submits sample media. Ends on the under-review screen. */
export async function signUpAndSubmit(page: Page, name: string) {
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
  await page.getByTestId("pick-sample-b").click();
  await page.getByTestId("pick-clip-3").click();
  await page.getByTestId("verify-submit").click();
  await page.waitForURL("**/members");
  await expect(page.getByTestId("under-review")).toBeVisible();
}

/** As the moderator, approves the signup with this display name. Returns its member id. */
export async function approveAsModerator(page: Page, name: string): Promise<string> {
  await switchTo(page, "moderator");
  await page.waitForURL("**/moderate");
  await page.getByRole("row", { name: new RegExp(name) }).getByRole("link", { name: "Review" }).click();
  await page.waitForURL(/\/moderate\/u-[a-z0-9]+$/);
  const id = new URL(page.url()).pathname.split("/").pop()!;
  await expect(page.getByTestId("side-by-side").getByTestId("signed-media")).toHaveCount(2);
  await page.getByTestId("approve").click();
  await expect(page.getByTestId("notice")).toContainText("Approved");
  return id;
}

export const uniqueName = (prefix: string) => `${prefix} ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
