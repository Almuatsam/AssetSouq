import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("LoadingIndicator", () => {
  it("renders as an assistive-tech-announced status region", () => {
    // Act
    renderWithProviders(<LoadingIndicator />);

    // Assert
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/loading/i);
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
