import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("PaymentStatusBadge", () => {
  it.each([
    ["PENDING", "bg-warning/10", /pending/i],
    ["PAID", "bg-success/10", /^paid$/i],
    ["NON_PAYMENT", "bg-danger/10", /non.?payment/i],
  ] as const)("renders the %s status with the expected variant", (_status, expectedClass, labelPattern) => {
    // Act
    renderWithProviders(<PaymentStatusBadge status={_status} />);

    // Assert
    expect(screen.getByText(labelPattern)).toHaveClass(expectedClass);
  });
});
