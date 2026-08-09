import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { renderWithProviders } from "@/test/renderWithProviders";
import i18n from "@/utils/i18n";

describe("LanguageSwitcher", () => {
  // Must be awaited: changeLanguage() resolves asynchronously, and an
  // un-awaited reset here lets its state update land during whichever
  // test runs next, producing a misattributed act() warning there.
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  // Known, investigated, non-blocking: these two tests still log a React
  // "not wrapped in act()" warning even after (a) this async afterEach,
  // (b) i18next's initImmediate: false, and (c) awaiting i18nReady in a
  // beforeAll (src/test/setup.ts) before any test renders. The remaining
  // gap is internal to react-i18next/i18next-browser-languagedetector's
  // own readiness-subscription timing, not app code — assertions here are
  // correct and the suite is green; this is cosmetic, not a real bug.

  it("marks the active language as pressed", () => {
    // Act
    renderWithProviders(<LanguageSwitcher />);

    // Assert
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "العربية" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the active language on click", async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);

    // Act
    await user.click(screen.getByRole("button", { name: "العربية" }));

    // Assert — i18n.changeLanguage() resolves asynchronously, so the
    // re-render it triggers must be awaited too, or React logs an
    // act() warning for the state update landing after this test moves on.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "العربية" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(i18n.language).toBe("ar");
  });
});
