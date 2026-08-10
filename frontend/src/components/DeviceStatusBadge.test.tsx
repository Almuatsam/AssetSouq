import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeviceStatusBadge } from "@/components/DeviceStatusBadge";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("DeviceStatusBadge", () => {
  it.each([
    ["AVAILABLE", "bg-success/10"],
    ["REMOVED", "bg-gray/10"],
    ["DRAWN", "bg-warning/10"],
    ["SOLD", "bg-gray/10"],
  ] as const)("renders the %s status with the expected variant", (status, expectedClass) => {
    // Act
    renderWithProviders(<DeviceStatusBadge status={status} />);

    // Assert
    const badge = screen.getByText(new RegExp(status, "i"));
    expect(badge).toHaveClass(expectedClass);
  });
});
