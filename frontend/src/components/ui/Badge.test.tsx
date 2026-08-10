import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders its children with the default variant", () => {
    // Act
    render(<Badge>Pending</Badge>);

    // Assert
    expect(screen.getByText("Pending")).toHaveClass("bg-gray/10");
  });

  it.each([
    ["success", "bg-success/10"],
    ["warning", "bg-warning/10"],
    ["danger", "bg-danger/10"],
  ] as const)("applies the %s variant's classes", (variant, expectedClass) => {
    // Act
    render(<Badge variant={variant}>Status</Badge>);

    // Assert
    expect(screen.getByText("Status")).toHaveClass(expectedClass);
  });
});
