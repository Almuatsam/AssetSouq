import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { requireEnv } from "../env";
import { scanForA11yViolations } from "./axeHelper";
import { loginAsAdmin, loginAsEmployee, uniqueSuffix } from "./helpers";

const ADMIN_USERNAME = requireEnv("SEED_ADMIN_USERNAME");
const ADMIN_PASSWORD = requireEnv("SEED_ADMIN_PASSWORD");

// axe-core violations are deeply nested (nodes, target selectors, help
// URLs) — readable enough in a failure diff, but a one-line-per-violation
// summary as the assertion message means a scan failure is legible
// without having to expand the whole object first.
function summarize(violations: Awaited<ReturnType<typeof scanForA11yViolations>>): string {
  if (violations.length === 0) return "no violations";
  return violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) — ${v.helpUrl}`)
    .join("\n");
}

async function expectNoViolations(page: Page): Promise<void> {
  const violations = await scanForA11yViolations(page);
  expect(violations, summarize(violations)).toEqual([]);
}

test.describe("accessibility — public pages", () => {
  test("landing page", async ({ page }) => {
    await page.goto("/");
    await expectNoViolations(page);
  });

  test("employee login page", async ({ page }) => {
    await page.goto("/login");
    await expectNoViolations(page);
  });

  test("admin login page", async ({ page }) => {
    await page.goto("/admin/login");
    await expectNoViolations(page);
  });

  test("landing page in Arabic (RTL)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "العربية" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expectNoViolations(page);
  });
});

test.describe("accessibility — admin pages", () => {
  // One shared login walking every admin page, not a fresh login per
  // page (via beforeEach) — the login endpoints are deliberately rate
  // limited (middlewares/rateLimit.ts: 10 attempts/15min/IP, to blunt
  // brute-forcing), and this suite's own backend process persists across
  // repeated local `npm run test:e2e` runs (see playwright.config.ts's
  // reuseExistingServer comment). Nine separate logins here, stacked on
  // top of auth.spec.ts's and golden-path.spec.ts's own logins, was
  // enough to trip that limiter within a single run — not just across
  // repeated invocations. test.step() keeps each page's result
  // individually legible in the report despite sharing one test/session.
  test("every admin page", async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    const pages: Array<{ name: string; path?: string }> = [
      { name: "dashboard" }, // already there post-login, no navigation needed
      { name: "devices list", path: "/admin/devices" },
      { name: "add device form", path: "/admin/devices/new" },
      { name: "employees list", path: "/admin/employees" },
      { name: "add employee form", path: "/admin/employees/new" },
      { name: "registrations list", path: "/admin/registrations" },
      { name: "winners list", path: "/admin/winners" },
      { name: "reports", path: "/admin/reports" },
      { name: "audit log", path: "/admin/audit-log" },
    ];

    for (const { name, path } of pages) {
      await test.step(name, async () => {
        if (path) await page.goto(path);
        await expectNoViolations(page);
      });
    }
  });
});

test.describe("accessibility — employee pages", () => {
  // A throwaway employee with no registration, so /devices renders the
  // plain browsable list rather than RegistrationStatusCard — created
  // once via the admin UI (not a direct API call, to stay consistent
  // with this suite's UI-driven style) and shared read-only across the
  // tests below.
  let staffNumber: string;

  test.beforeAll(async ({ browser }) => {
    const suffix = uniqueSuffix();
    staffNumber = `A11Y-${suffix}`;
    const setupPage = await browser.newPage();
    await loginAsAdmin(setupPage, ADMIN_USERNAME, ADMIN_PASSWORD);
    await setupPage.goto("/admin/employees/new");
    await setupPage.getByLabel("Staff Number").fill(staffNumber);
    await setupPage.getByLabel("Name").fill(`A11y Test Employee ${suffix}`);
    await setupPage.getByLabel("Department").fill("QA");
    await setupPage.getByLabel("Email").fill(`a11y-employee-${suffix}@example.com`);
    await setupPage.getByRole("button", { name: /^save$/i }).click();
    await setupPage.waitForURL("**/admin/employees");
    await setupPage.close();
  });

  test("available devices list", async ({ page }) => {
    await loginAsEmployee(page, staffNumber);
    await expectNoViolations(page);
  });
});
