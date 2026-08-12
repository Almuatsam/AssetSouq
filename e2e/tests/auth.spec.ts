import { expect, test } from "@playwright/test";

import { requireEnv } from "../env";

const ADMIN_USERNAME = requireEnv("SEED_ADMIN_USERNAME");
const ADMIN_PASSWORD = requireEnv("SEED_ADMIN_PASSWORD");

test.describe("authentication", () => {
  test("landing page links to both login portals", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /employee login/i })).toHaveAttribute("href", "/login");
    await expect(page.getByRole("link", { name: /admin login/i })).toHaveAttribute(
      "href",
      "/admin/login",
    );
  });

  test("employee login fails with an unknown staff ID", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Staff ID").fill("NOT-A-REAL-STAFF-ID");
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page.getByRole("alert")).toHaveText(/invalid staff id/i);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("admin login fails with the wrong password", async ({ page }) => {
    await page.goto("/admin/login");

    await page.getByLabel("Username").fill(ADMIN_USERNAME);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page.getByRole("alert")).toHaveText(/invalid username or password/i);
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("an unauthenticated visitor is redirected away from a protected admin route", async ({ page }) => {
    await page.goto("/admin/dashboard");

    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("an unauthenticated visitor is redirected away from a protected employee route", async ({
    page,
  }) => {
    await page.goto("/devices");

    await expect(page).toHaveURL(/\/login$/);
  });

  test("the seeded bootstrap admin can log in and out", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Username").fill(ADMIN_USERNAME);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    // getByRole's `name` already does case-insensitive substring matching
    // on a plain string — no need for new RegExp(), which would also
    // mis-behave if ADMIN_USERNAME ever contained a regex metacharacter.
    await expect(page.getByRole("heading", { name: ADMIN_USERNAME })).toBeVisible();

    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
