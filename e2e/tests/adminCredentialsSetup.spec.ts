import { expect, test } from "@playwright/test";

import { requireEnv } from "../env";
import { scanForA11yViolations } from "./axeHelper";
import { loginAsAdmin } from "./helpers";

const ADMIN_USERNAME = requireEnv("SEED_ADMIN_USERNAME");
const ADMIN_PASSWORD = requireEnv("SEED_ADMIN_PASSWORD");

// Exercises the one-time admin credential handover's real UI end to end —
// auto-open, validation, and the confirmation step — but deliberately
// NEVER clicks the final "Yes, Change Credentials" against the real
// backend. Doing so would actually complete the (permanent, one-time)
// handover for the shared seed admin this whole suite's run authenticates
// with (see global-setup.ts / helpers.ts's loginAsAdmin), breaking every
// other spec's login for the rest of the run. The backend's own
// adminAccount.integration.test.ts already proves the real
// submit-through-invalidation-through-re-login path against a disposable,
// mocked admin id; this spec proves the browser-facing half instead.
test.describe("admin credential setup modal", () => {
  test("auto-opens on first login, and can be dismissed and reopened from the dashboard reminder", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Username").fill(ADMIN_USERNAME);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL("**/admin/dashboard");

    // Auto-opened, not something the admin had to go looking for.
    const dialog = page.getByRole("dialog", { name: /complete admin account setup/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/can only be completed once/i)).toBeVisible();
    await expect(dialog.getByText(ADMIN_USERNAME)).toBeVisible();

    // Dismissible without completing it — the reminder stays behind.
    await dialog.getByRole("button", { name: /^cancel$/i }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("heading", { name: /^admin account setup$/i })).toBeVisible();

    // Reopenable from that same reminder card.
    await page.getByRole("button", { name: /change admin credentials/i }).click();
    await expect(dialog).toBeVisible();
  });

  test("validates the form and shows a confirmation step before allowing submission", async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.getByRole("button", { name: /change admin credentials/i }).click();
    const dialog = page.getByRole("dialog", { name: /complete admin account setup/i });

    // Empty username is rejected.
    await page.getByLabel(/new password/i).fill("CompanyPass123");
    await page.getByLabel(/confirm new password/i).fill("CompanyPass123");
    await dialog.getByRole("button", { name: /change credentials/i }).click();
    await expect(dialog.getByText(/username is required/i)).toBeVisible();

    // A weak password is rejected.
    await page.getByLabel(/new username/i).fill("company_admin");
    await page.getByLabel(/^new password$/i).fill("weak");
    await page.getByLabel(/confirm new password/i).fill("weak");
    await dialog.getByRole("button", { name: /change credentials/i }).click();
    await expect(dialog.getByText(/at least 12 characters/i).first()).toBeVisible();

    // Mismatched confirmation is rejected.
    await page.getByLabel(/^new password$/i).fill("CompanyPass123");
    await page.getByLabel(/confirm new password/i).fill("SomethingElse123");
    await dialog.getByRole("button", { name: /change credentials/i }).click();
    await expect(dialog.getByText(/do not match/i)).toBeVisible();

    // The show/hide toggle actually reveals the password.
    const passwordField = page.getByLabel(/^new password$/i);
    await expect(passwordField).toHaveAttribute("type", "password");
    await dialog.getByRole("button", { name: /show password/i }).first().click();
    await expect(passwordField).toHaveAttribute("type", "text");

    // A fully valid form reaches the confirmation step — a real in-page
    // control, never the browser's native confirm() dialog (no
    // page.on("dialog", ...) listener is registered in this spec at all;
    // a stray window.confirm() here would hang the test).
    await page.getByLabel(/confirm new password/i).fill("CompanyPass123");
    await dialog.getByRole("button", { name: /change credentials/i }).click();
    await expect(dialog.getByText(/are you sure you want to change the administrator credentials/i))
      .toBeVisible();

    // Back returns to the editable form without having submitted anything.
    await dialog.getByRole("button", { name: /back/i }).click();
    await expect(page.getByLabel(/new username/i)).toHaveValue("company_admin");
  });

  test("has no automated accessibility violations, in English or Arabic (RTL)", async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const dialog = page.getByRole("dialog", { name: /complete admin account setup/i });

    await page.getByRole("button", { name: /change admin credentials/i }).click();
    await expect(dialog).toBeVisible();
    expect(await scanForA11yViolations(page)).toEqual([]);

    // The modal's overlay (fixed, above the persistent Help & account
    // button) blocks reaching the language switcher while it's open, by
    // design — close it first.
    await dialog.getByRole("button", { name: /^cancel$/i }).click();
    await expect(dialog).not.toBeVisible();

    await page.getByRole("button", { name: /help & account/i }).click();
    await page.getByRole("button", { name: "العربية" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // A full reload re-mounts the dashboard (now in Arabic), which
    // re-triggers the same auto-open behavior verified in English above —
    // the language preference persists across the reload via
    // utils/i18n.ts's LanguageDetector.
    await page.reload();
    await expect(dialog).toBeVisible();
    expect(await scanForA11yViolations(page)).toEqual([]);
  });
});
