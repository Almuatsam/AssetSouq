import { afterEach, describe, expect, it } from "vitest";

import i18n from "@/utils/i18n";

describe("i18n RTL/LTR sync", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("sets dir=rtl and lang=ar when switching to Arabic", async () => {
    // Act
    await i18n.changeLanguage("ar");

    // Assert
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
  });

  it("sets dir=ltr and lang=en when switching back to English", async () => {
    // Arrange
    await i18n.changeLanguage("ar");

    // Act
    await i18n.changeLanguage("en");

    // Assert
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
  });
});
