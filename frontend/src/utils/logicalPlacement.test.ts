import { describe, expect, it } from "vitest";

import { resolveLogicalPlacement } from "@/utils/logicalPlacement";

describe("resolveLogicalPlacement", () => {
  it("resolves top/bottom the same regardless of direction", () => {
    expect(resolveLogicalPlacement("top", "ltr")).toBe("top");
    expect(resolveLogicalPlacement("top", "rtl")).toBe("top");
    expect(resolveLogicalPlacement("bottom", "ltr")).toBe("bottom");
    expect(resolveLogicalPlacement("bottom", "rtl")).toBe("bottom");
  });

  it("resolves inline-start to left in LTR and right in RTL", () => {
    expect(resolveLogicalPlacement("inline-start", "ltr")).toBe("left");
    expect(resolveLogicalPlacement("inline-start", "rtl")).toBe("right");
  });

  it("resolves inline-end to right in LTR and left in RTL", () => {
    expect(resolveLogicalPlacement("inline-end", "ltr")).toBe("right");
    expect(resolveLogicalPlacement("inline-end", "rtl")).toBe("left");
  });
});
