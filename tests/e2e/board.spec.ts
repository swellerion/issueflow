import { test, expect } from "@playwright/test";
import { uid, registerAndLogin, createProject, dragTo } from "./helpers";

test.describe("Board", () => {
  test("redirects to project creation when no project exists", async ({ page }) => {
    await registerAndLogin(page, `user-${uid()}`, "password123");
    await expect(page).toHaveURL(/\/projects\/new/);
  });

  test("can create a project and see the board with default columns", async ({ page }) => {
    const slug = `proj-${uid()}`;
    await registerAndLogin(page, `user-${uid()}`, "password123");
    await createProject(page, "Test Project", slug);

    await expect(page).toHaveURL(/\/board/);
    await expect(page.getByTestId("column-backlog")).toBeVisible();
    await expect(page.getByTestId("column-in-progress")).toBeVisible();
    await expect(page.getByTestId("column-in-review")).toBeVisible();
    await expect(page.getByTestId("column-done")).toBeVisible();
  });

  test("can create an issue and see it on the board", async ({ page }) => {
    const slug = `proj-${uid()}`;
    await registerAndLogin(page, `user-${uid()}`, "password123");
    await createProject(page, "Test Project", slug);

    // Click + on Backlog column
    await page.getByTestId("column-backlog").getByTitle("Add issue to Backlog").click();
    await expect(page).toHaveURL(/\/issues\/new/);

    await page.getByLabel("Title").fill("My first issue");
    await page.getByRole("button", { name: "Create issue" }).click();
    await expect(page).toHaveURL(/\/issues\/.+/);

    // Back to board — issue should appear in Backlog
    await page.getByRole("link", { name: "Board" }).click();
    await expect(page.getByTestId("column-backlog").getByText("My first issue")).toBeVisible();
  });

  test("can drag an issue to another column and it persists after refresh", async ({ page }) => {
    const slug = `proj-${uid()}`;
    await registerAndLogin(page, `user-${uid()}`, "password123");
    await createProject(page, "Test Project", slug);

    // Create issue in Backlog
    await page.getByTestId("column-backlog").getByTitle("Add issue to Backlog").click();
    await page.getByLabel("Title").fill("Drag me");
    await page.getByRole("button", { name: "Create issue" }).click();
    await page.waitForURL(/\/issues\/.+/);
    // Wait for router.refresh() to settle before navigating away
    await page.waitForLoadState("networkidle");
    await page.getByRole("navigation").getByRole("link", { name: "Board" }).click();
    await page.waitForURL(/\/board/);

    // Wait for card to appear
    await expect(page.getByTestId("column-backlog").getByText("Drag me")).toBeVisible();

    // Set up PATCH interceptor before drag so we don't miss it
    const patchDone = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/issues/") && resp.request().method() === "PATCH",
      { timeout: 10000 }
    );

    // Drag grip handle to "In Progress" column
    await dragTo(
      page,
      '[aria-label="Drag to move issue"]',
      '[data-testid="column-drop-in-progress"]'
    );

    // Optimistic update — card should now be in In Progress
    await expect(page.getByTestId("column-in-progress").getByText("Drag me")).toBeVisible();

    // Wait for PATCH to complete before reloading
    await patchDone;

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByTestId("column-in-progress").getByText("Drag me")).toBeVisible();
    await expect(page.getByTestId("column-backlog").getByText("Drag me")).not.toBeVisible();
  });
});
