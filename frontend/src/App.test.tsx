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

  it("redirects an unauthenticated visitor away from /devices/:id to /login", () => {
    // Act
    renderWithProviders(<App />, { route: "/devices/1" });

    // Assert
    expect(screen.getByRole("heading", { name: /employee login/i })).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor away from /admin/dashboard to /admin/login", () => {
    // Act
    renderWithProviders(<App />, { route: "/admin/dashboard" });

    // Assert
    expect(screen.getByRole("heading", { name: /admin login/i })).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor away from /admin/devices to /admin/login", () => {
    // Act
    renderWithProviders(<App />, { route: "/admin/devices" });

    // Assert
    expect(screen.getByRole("heading", { name: /admin login/i })).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor away from /admin/devices/new to /admin/login", () => {
    // Act
    renderWithProviders(<App />, { route: "/admin/devices/new" });

    // Assert
    expect(screen.getByRole("heading", { name: /admin login/i })).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor away from /admin/devices/:id/edit to /admin/login", () => {
    // Act
    renderWithProviders(<App />, { route: "/admin/devices/1/edit" });

    // Assert
    expect(screen.getByRole("heading", { name: /admin login/i })).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor away from /admin/employees to /admin/login", () => {
    // Act
    renderWithProviders(<App />, { route: "/admin/employees" });

    // Assert
    expect(screen.getByRole("heading", { name: /admin login/i })).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor away from /admin/employees/new to /admin/login", () => {
    // Act
    renderWithProviders(<App />, { route: "/admin/employees/new" });

    // Assert
    expect(screen.getByRole("heading", { name: /admin login/i })).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor away from /admin/employees/:id/edit to /admin/login", () => {
    // Act
    renderWithProviders(<App />, { route: "/admin/employees/1/edit" });

    // Assert
    expect(screen.getByRole("heading", { name: /admin login/i })).toBeInTheDocument();
  });
});
