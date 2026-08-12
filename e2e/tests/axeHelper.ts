import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

// WCAG 2 Level A + AA — the bar docs/01-PRD.md's "WCAG Accessibility"
// non-functional requirement implies, and the most widely-adopted
// conformance target. Not scanning "best-practice" rules, which are
// axe-core's own opinions rather than a WCAG success criterion.
export async function scanForA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return results.violations;
}
