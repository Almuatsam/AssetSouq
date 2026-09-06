import { describe, expect, it } from "vitest";

import { getPasswordStrength } from "@/utils/passwordStrength";

describe("getPasswordStrength", () => {
  it("returns empty for an empty password", () => {
    expect(getPasswordStrength("")).toBe("empty");
  });

  it("returns weak for a short, low-variety password", () => {
    expect(getPasswordStrength("abc")).toBe("weak");
  });

  it("returns fair for a password meeting the length + case + number floor", () => {
    expect(getPasswordStrength("CompanyPass1")).toBe("fair");
  });

  it("returns strong for a long password with symbols too", () => {
    expect(getPasswordStrength("CompanyPassword1!2345")).toBe("strong");
  });
});
