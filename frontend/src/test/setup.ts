import "@testing-library/jest-dom/vitest";
import { beforeAll } from "vitest";

import { i18nReady } from "@/utils/i18n";

// Ensure i18next is fully initialized before any test in this file renders
// a component — otherwise a component mounting before that promise settles
// can trigger a post-render state update outside any test's act() scope.
// See the comment on i18nReady in utils/i18n.ts for why this is necessary
// even with resources bundled statically (no async backend fetch).
beforeAll(async () => {
  await i18nReady;
});

// jsdom doesn't implement window.matchMedia — hooks/useReducedMotion.ts
// and hooks/useIsMobileViewport.ts (used by the guided tour) are the
// first code in this app to need it. Defaults to "no match" (matches:
// false) for every query; individual tests override via
// window.matchMedia = vi.fn(...) when they need a specific query to match.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
