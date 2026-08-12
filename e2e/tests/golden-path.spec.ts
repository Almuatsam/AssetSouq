import { expect, test } from "@playwright/test";

import { requireEnv } from "../env";
import { loginAsAdmin, loginAsEmployee, logoutAdmin, logoutEmployee, uniqueSuffix } from "./helpers";

const ADMIN_USERNAME = requireEnv("SEED_ADMIN_USERNAME");
const ADMIN_PASSWORD = requireEnv("SEED_ADMIN_PASSWORD");

// One continuous journey through the full raffle lifecycle — device
// creation, employee creation, registration, the draw, payment, and
// handover — rather than isolated specs per page, since each stage's
// starting state is the previous stage's real output (the same way an
// actual admin/employee pair would use the app). This is the system's one
// true "does everything actually fit together" test; the unit/integration
// suites in backend/ and frontend/ already cover each piece in isolation.
//
// Auto-accepts every window.confirm()/window.prompt() this flow triggers
// (Run Draw, Mark Paid's confirm + its payment-method prompt, Record
// Handover) — see AdminDevicesPage.tsx / AdminWinnersPage.tsx for why
// those are plain browser dialogs rather than a custom modal component.
test("device lifecycle: create, register, draw, pay, hand over", async ({ page }) => {
  test.slow();
  const suffix = uniqueSuffix();
  const assetTag = `E2E-${suffix}`;
  const deviceModel = `E2E Test Laptop ${suffix}`;
  const staffNumber = `E2E-${suffix}`;
  const employeeName = `E2E Test Employee ${suffix}`;
  // A distinct prefix (not sharing staffNumber's "E2E-<suffix>" text) —
  // getByText() does case-insensitive substring matching by default, and
  // reusing the same suffix made the staff number a substring of the
  // email address, breaking the row lookups below.
  const employeeEmail = `e2e-employee-${suffix}@example.com`;

  // This flow only ever triggers one distinct prompt() (Mark Paid's
  // optional payment-method text) alongside several confirm()s — if a
  // second, semantically different prompt() is ever added to the flow,
  // it would also silently get answered "Cash" here; revisit with a
  // dialog.message()-based branch if that happens.
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") {
      await dialog.accept("Cash");
    } else {
      await dialog.accept();
    }
  });

  // --- Admin creates the device ---
  await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
  await page.goto("/admin/devices");
  await page.getByRole("link", { name: /add device/i }).click();
  await page.getByLabel("Asset Tag").fill(assetTag);
  await page.getByLabel("Device Type").fill("Laptop");
  await page.getByLabel("Brand").fill("E2E Brand");
  await page.getByLabel("Model").fill(deviceModel);
  await page.getByLabel("Price").fill("100");
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page).toHaveURL(/\/admin\/devices$/);
  await expect(page.getByText(assetTag, { exact: true })).toBeVisible();

  // --- Admin creates the employee ---
  await page.goto("/admin/employees");
  await page.getByRole("link", { name: /add employee/i }).click();
  await page.getByLabel("Staff Number").fill(staffNumber);
  await page.getByLabel("Name").fill(employeeName);
  await page.getByLabel("Department").fill("Engineering");
  await page.getByLabel("Email").fill(employeeEmail);
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page).toHaveURL(/\/admin\/employees$/);
  await expect(page.getByText(staffNumber, { exact: true })).toBeVisible();

  await logoutAdmin(page);

  // --- Employee registers interest ---
  await loginAsEmployee(page, staffNumber);
  // getByRole's `name` already does case-insensitive substring matching
  // on a plain string — no need for new RegExp().
  await expect(page.getByRole("heading", { name: employeeName })).toBeVisible();
  // Scoped via DeviceCard's data-testid rather than a parent-traversal
  // locator (`.locator("..")`) — that worked only because the heading and
  // the "View details" link happen to be direct siblings today; a testid
  // stays correct even if DeviceCard's internal markup nesting changes.
  await page
    .getByTestId("device-card")
    .filter({ hasText: deviceModel })
    .getByRole("link", { name: /view details/i })
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /register interest/i }).click();
  await expect(page).toHaveURL(/\/devices$/);
  await expect(page.getByText(/eligible — awaiting draw/i)).toBeVisible();

  await logoutEmployee(page);

  // --- Admin runs the draw ---
  await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
  await page.goto("/admin/devices");
  const deviceRow = page.getByRole("row").filter({ hasText: assetTag });
  await deviceRow.getByRole("button", { name: /run draw/i }).click();
  await expect(page.getByRole("status")).toContainText(employeeName);

  // --- Admin records payment and handover ---
  await page.getByRole("link", { name: /view winners/i }).click();
  await expect(page).toHaveURL(/\/admin\/winners$/);
  const winnerRow = page.getByRole("row").filter({ hasText: employeeName });
  await expect(winnerRow.getByText(/^pending$/i)).toBeVisible();

  await winnerRow.getByRole("button", { name: /mark paid/i }).click();
  await expect(winnerRow.getByText(/^paid$/i)).toBeVisible();

  await winnerRow.getByRole("button", { name: /record handover/i }).click();
  await expect(winnerRow.getByText(/handed over on/i)).toBeVisible();

  // Fully settled — no more actions left on this row.
  await expect(winnerRow.getByRole("button")).toHaveCount(0);
});
