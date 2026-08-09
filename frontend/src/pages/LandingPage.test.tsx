import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LandingPage from "@/pages/LandingPage";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("LandingPage", () => {
  it("links to both the employee and admin login routes", () => {
    // Act
    renderWithProviders(<LandingPage />);

    // Assert
    expect(screen.getByRole("link", { name: /employee login/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /admin login/i })).toHaveAttribute(
      "href",
      "/admin/login",
    );
  });
});
