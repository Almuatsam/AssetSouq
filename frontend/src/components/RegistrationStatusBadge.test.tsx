import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RegistrationStatusBadge } from "@/components/RegistrationStatusBadge";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("RegistrationStatusBadge", () => {
  it.each([
    ["PENDING", "bg-gray/10"],
    ["ELIGIBLE", "bg-success/10"],
    ["INELIGIBLE", "bg-danger/10"],
    ["WITHDRAWN", "bg-gray/10"],
  ] as const)("renders the %s status with the expected variant", (status, expectedClass) => {
    // Act
    renderWithProviders(<RegistrationStatusBadge status={status} />);

    // Assert
    const badge = screen.getByText(new RegExp(status, "i"));
    expect(badge).toHaveClass(expectedClass);
  });
});
