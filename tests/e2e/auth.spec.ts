import { test, expect } from "@playwright/test";
import { uid, registerAndLogin } from "./helpers";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/board");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects authenticated users away from login to board", async ({ page }) => {
    const u = `user-${uid()}`;
    await registerAndLogin(page, u, "password123");
    await page.goto("/login");
    await expect(page).toHaveURL(/\/board|\/projects\/new/);
  });

  test("can register a new account", async ({ page }) => {
    const u = `user-${uid()}`;
    await page.goto("/register");
    await page.getByLabel("Username").fill(u);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Username").fill(`user-${uid()}`);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("different456");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  test("shows error when username is already taken", async ({ page }) => {
    const u = `user-${uid()}`;
    await registerAndLogin(page, u, "password123");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/register");
    await page.getByLabel("Username").fill(u);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Username is already taken")).toBeVisible();
  });

  test("shows error with wrong password", async ({ page }) => {
    const u = `user-${uid()}`;
    await registerAndLogin(page, u, "password123");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/);

    await page.getByLabel("Username").fill(u);
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid username or password")).toBeVisible();
  });

  test("can sign out", async ({ page }) => {
    const u = `user-${uid()}`;
    await registerAndLogin(page, u, "password123");
    await page.goto("/projects/new");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/board");
    await expect(page).toHaveURL(/\/login/);
  });
});
