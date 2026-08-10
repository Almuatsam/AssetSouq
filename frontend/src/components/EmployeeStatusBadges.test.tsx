import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmployeeStatusBadges } from "@/components/EmployeeStatusBadges";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("EmployeeStatusBadges", () => {
  it("shows Active and Eligible for an active, eligible, non-laptop-holder employee", () => {
    // Act
    renderWithProviders(
      <EmployeeStatusBadges employee={{ active: true, eligible: true, laptopHolder: false }} />,
    );

    // Assert
    expect(screen.getByText(/^active$/i)).toBeInTheDocument();
    expect(screen.getByText(/^eligible$/i)).toBeInTheDocument();
    expect(screen.queryByText(/laptop holder/i)).not.toBeInTheDocument();
  });

  it("shows Inactive and Ineligible for a deactivated, ineligible employee", () => {
    // Act
    renderWithProviders(
      <EmployeeStatusBadges employee={{ active: false, eligible: false, laptopHolder: false }} />,
    );

    // Assert
    expect(screen.getByText(/^inactive$/i)).toBeInTheDocument();
    expect(screen.getByText(/^ineligible$/i)).toBeInTheDocument();
  });

  it("shows a Laptop Holder badge only when the employee holds a laptop", () => {
    // Act
    renderWithProviders(
      <EmployeeStatusBadges employee={{ active: true, eligible: true, laptopHolder: true }} />,
    );

    // Assert
    expect(screen.getByText(/laptop holder/i)).toBeInTheDocument();
  });
});
