import { test, expect } from "@playwright/test";
import { uid, registerAndLogin, createProject, addMemberToProject } from "./helpers";

test.describe("Issue detail", () => {
  test.beforeEach(async ({ page }) => {
    const slug = `proj-${uid()}`;
    await registerAndLogin(page, `user-${uid()}`, "password123");
    await createProject(page, "Test Project", slug);

    // Create an issue
    await page.getByTestId("column-backlog").getByTitle("Add issue to Backlog").click();
    await page.getByLabel("Title").fill("Detail test issue");
    await page.getByLabel("Description").fill("A description for testing.");
    await page.getByRole("button", { name: "Create issue" }).click();
    await expect(page).toHaveURL(/\/issues\/.+/);
  });

  test("shows issue title, description and identifier", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Detail test issue" })).toBeVisible();
    await expect(page.getByText("A description for testing.")).toBeVisible();
    await expect(page.getByText(/[A-Z][A-Z0-9-]+-\d+/)).toBeVisible();
  });

  test("can change issue status from the sidebar", async ({ page }) => {
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "In Progress" }).click();
    await expect(page.getByRole("combobox").first()).toContainText("In Progress");

    // Verify it persisted
    await page.reload();
    await expect(page.getByRole("combobox").first()).toContainText("In Progress");
  });

  test("can add a comment and see it in the logbook", async ({ page }) => {
    await page.getByPlaceholder("Add a comment…").fill("This is a test comment.");
    await page.getByRole("button", { name: "Save" }).click();
    // Wait for POST + router.refresh to complete before asserting
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("This is a test comment.")).toBeVisible();

    // Verify it persisted
    await page.reload();
    await expect(page.getByText("This is a test comment.")).toBeVisible();
  });

  test("shows error when submitting empty comment", async ({ page }) => {
    await page.getByPlaceholder("Add a comment…").fill("  ");
    // Button should be disabled with whitespace-only input
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("back link returns to board", async ({ page }) => {
    await page.getByRole("link", { name: "Board" }).click();
    await expect(page).toHaveURL(/\/board/);
  });
});

test.describe("Role-gated editing", () => {
  let issueUrl: string;
  let adminUser: string;
  let viewerUser: string;
  let slug: string;
  const password = "password123";

  test.beforeEach(async ({ page, browser }) => {
    // Create admin user and project + issue
    adminUser = `admin-${uid()}`;
    viewerUser = `viewer-${uid()}`;
    slug = `proj-${uid()}`;

    await registerAndLogin(page, adminUser, password);
    await createProject(page, "RBAC Test Project", slug);

    await page.getByTestId("column-backlog").getByTitle("Add issue to Backlog").click();
    await page.getByLabel("Title").fill("RBAC test issue");
    await page.getByRole("button", { name: "Create issue" }).click();
    // Wait for navigation to the issue detail page (not the new-issue form)
    await page.waitForURL(/\/issues\/(?!new\b)[^/?]+/);
    await page.waitForLoadState("networkidle");
    issueUrl = page.url();

    // Register viewer user (separate browser context so it doesn't conflict with admin session)
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto("/register");
    await viewerPage.getByLabel("Username").fill(viewerUser);
    await viewerPage.getByLabel("Password", { exact: true }).fill(password);
    await viewerPage.getByLabel("Confirm password").fill(password);
    await viewerPage.getByRole("button", { name: "Create account" }).click();
    await viewerPage.waitForURL("**/login**");
    await viewerContext.close();

    // Admin adds viewer to project
    await addMemberToProject(page, slug, viewerUser, "VIEWER");
  });

  test("admin can inline-edit title", async ({ page }) => {
    await page.goto(issueUrl);
    await page.waitForLoadState("networkidle");

    // Click title to edit
    await page.getByRole("heading", { name: "RBAC test issue" }).click();
    const input = page.getByRole("textbox").first();
    await expect(input).toBeVisible();

    await input.fill("Updated title by admin");
    await input.blur();
    await page.waitForLoadState("networkidle");

    // Verify persisted on reload
    await page.reload();
    await expect(page.getByRole("heading", { name: "Updated title by admin" })).toBeVisible();
  });

  test("admin can inline-edit description", async ({ page }) => {
    await page.goto(issueUrl);
    await page.waitForLoadState("networkidle");

    // Click description area (shows placeholder when empty)
    await page.getByText("Click to add a description…").click();
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();

    await textarea.fill("A new description");
    await textarea.blur();
    await page.waitForLoadState("networkidle");

    await page.reload();
    await expect(page.getByText("A new description")).toBeVisible();
  });

  test("viewer sees no editable inputs for title and no comboboxes for status/assignee", async ({ browser }) => {
    // Login as viewer
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto("/login");
    await viewerPage.getByLabel("Username").fill(viewerUser);
    await viewerPage.getByLabel("Password").fill(password);
    await viewerPage.getByRole("button", { name: "Sign in" }).click();
    await viewerPage.waitForURL(/\/projects\/new|\/board/);

    await viewerPage.goto(issueUrl);
    await viewerPage.waitForLoadState("networkidle");

    // Title should be a plain heading, not clickable into an input
    await viewerPage.getByRole("heading").first().click();
    await expect(viewerPage.getByRole("textbox")).toHaveCount(1); // only comment textarea

    // No comboboxes for status or assignee
    await expect(viewerPage.getByRole("combobox")).toHaveCount(0);

    await viewerContext.close();
  });

  test("viewer PATCH returns 403", async ({ browser }) => {
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto("/login");
    await viewerPage.getByLabel("Username").fill(viewerUser);
    await viewerPage.getByLabel("Password").fill(password);
    await viewerPage.getByRole("button", { name: "Sign in" }).click();
    await viewerPage.waitForURL(/\/projects\/new|\/board/);

    // Extract issue ID from URL
    const issueId = issueUrl.split("/issues/")[1];
    const res = await viewerPage.request.patch(`/api/v1/issues/${issueId}`, {
      data: { title: "Should be denied" },
    });
    expect(res.status()).toBe(403);

    await viewerContext.close();
  });
});
