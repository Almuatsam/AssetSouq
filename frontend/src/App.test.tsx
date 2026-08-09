import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("App routing", () => {
  it("renders the landing page at /", () => {
    // Act
    renderWithProviders(<App />, { route: "/" });

    // Assert
    expect(screen.getByRole("heading", { name: /assetsouq/i })).toBeInTheDocument();
  });

  it("redirects an unknown path back to the landing page", () => {
    // Act
    renderWithProviders(<App />, { route: "/does-not-exist" });

    // Assert
    expect(screen.getByRole("heading", { name: /assetsouq/i })).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor away from /devices to /login", () => {
    // Act
    renderWithProviders(<App />, { route: "/devices" });

    // Assert
    expect(screen.getByRole("heading", { name: /employee login/i })).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor away from /admin/dashboard to /admin/login", () => {
    // Act
    renderWithProviders(<App />, { route: "/admin/dashboard" });

    // Assert
    expect(screen.getByRole("heading", { name: /admin login/i })).toBeInTheDocument();
  });
});
