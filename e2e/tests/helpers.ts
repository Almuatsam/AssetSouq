import type { Page } from "@playwright/test";

// Timestamp + a short random suffix — unique enough across repeated local
// runs against the same never-reset-between-tests database within a run,
// without needing a real UUID library in this small standalone package.
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function loginAsAdmin(page: Page, username: string, password: string): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL("**/admin/dashboard");
}

export async function loginAsEmployee(page: Page, staffNumber: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Staff ID").fill(staffNumber);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL("**/devices");
}

export async function logoutAdmin(page: Page): Promise<void> {
  await page.getByRole("button", { name: /log out/i }).click();
  await page.waitForURL("**/admin/login");
}

export async function logoutEmployee(page: Page): Promise<void> {
  await page.getByRole("button", { name: /log out/i }).click();
  await page.waitForURL("**/login");
}
