import type { Page } from "@playwright/test";

/** Unique suffix per test run to avoid DB conflicts across runs. */
export function uid(): string {
  return Date.now().toString(36).slice(-5);
}

export async function registerAndLogin(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/login**");

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/projects\/new/);
}

export async function createProject(
  page: Page,
  name: string,
  slug: string
): Promise<void> {
  await page.waitForURL("**/projects/new**");
  await page.getByLabel("Project name").fill(name);
  // Clear auto-filled slug and set manually
  await page.getByLabel("Slug").clear();
  await page.getByLabel("Slug", { exact: false }).first().fill(slug);
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL("**/board**");
}

export async function addMemberToProject(
  page: Page,
  username: string,
  role: "ADMIN" | "MEMBER" | "VIEWER"
): Promise<void> {
  await page.goto("/settings/members");
  await page.getByTestId("add-member-username").fill(username);
  // Select role
  await page.getByTestId("add-member-role").click();
  await page.getByRole("option", { name: role === "ADMIN" ? "Admin" : role === "MEMBER" ? "Member" : "Viewer" }).click();
  await page.getByTestId("add-member-submit").click();
  // Wait for the new member row to appear
  await page.waitForSelector(`[data-testid="member-row-${username}"]`);
}

/**
 * Simulate a pointer-based drag from one element to another.
 * Required for dnd-kit which uses pointer events, not HTML5 drag events.
 */
export async function dragTo(
  page: Page,
  dragSelector: string,
  dropSelector: string
): Promise<void> {
  const dragEl = page.locator(dragSelector).first();
  const dropEl = page.locator(dropSelector).first();

  const dragBox = await dragEl.boundingBox();
  const dropBox = await dropEl.boundingBox();

  if (!dragBox || !dropBox) throw new Error("Could not get bounding boxes for drag.");

  const startX = dragBox.x + dragBox.width / 2;
  const startY = dragBox.y + dragBox.height / 2;
  const endX = dropBox.x + dropBox.width / 2;
  const endY = dropBox.y + dropBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Move in steps to trigger pointermove events and exceed the 8px threshold
  await page.mouse.move(startX + 10, startY, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.mouse.up();
}
