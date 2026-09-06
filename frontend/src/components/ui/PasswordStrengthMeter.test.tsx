import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PasswordStrengthMeter } from "@/components/ui/PasswordStrengthMeter";

describe("PasswordStrengthMeter", () => {
  it("shows the empty-password hint when there is no password yet", () => {
    // Act
    render(<PasswordStrengthMeter password="" />);

    // Assert
    expect(screen.getByText(/enter a password/i)).toBeInTheDocument();
  });

  it("shows a weak-password label for a weak password", () => {
    // Act
    render(<PasswordStrengthMeter password="abc" />);

    // Assert
    expect(screen.getByText(/weak password/i)).toBeInTheDocument();
  });

  it("shows a strong-password label for a strong password", () => {
    // Act
    render(<PasswordStrengthMeter password="CompanyPassword1!2345" />);

    // Assert
    expect(screen.getByText(/strong password/i)).toBeInTheDocument();
  });
});
