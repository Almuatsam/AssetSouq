import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DeviceDetailPage from "@/pages/DeviceDetailPage";
import { deviceService } from "@/services/deviceService";
import { registrationService } from "@/services/registrationService";
import { AuthProvider } from "@/store/AuthContext";
import type { Device } from "@/types/device";
import i18n from "@/utils/i18n";

vi.mock("@/services/deviceService");
vi.mock("@/services/registrationService");

const mockedDeviceService = deviceService as unknown as { getById: ReturnType<typeof vi.fn> };
const mockedRegistrationService = registrationService as unknown as {
  registerInterest: ReturnType<typeof vi.fn>;
};

const baseDevice: Device = {
  id: 1,
  assetTag: "AST-001",
  deviceType: "Laptop",
  brand: "Dell",
  model: "Latitude 5420",
  cpu: "i5-1135G7",
  ram: "16GB",
  storage: "256GB SSD",
  purchaseYear: 2021,
  yearsUsed: 4,
  price: "150.00",
  status: "AVAILABLE",
  quantity: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderPage(route = "/devices/1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/devices/:id" element={<DeviceDetailPage />} />
              <Route path="/devices" element={<div>DEVICES_PAGE</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("DeviceDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDeviceService.getById.mockResolvedValue(baseDevice);
  });

  it("renders the device's specifications", async () => {
    // Act
    renderPage();

    // Assert
    expect(await screen.findByRole("heading", { name: "Dell Latitude 5420" })).toBeInTheDocument();
    expect(screen.getByText("i5-1135G7")).toBeInTheDocument();
    expect(screen.getByText("16GB")).toBeInTheDocument();
    expect(screen.getByText(/150\.00/)).toBeInTheDocument();
  });

  it("shows an error message when the device fails to load", async () => {
    // Arrange
    mockedDeviceService.getById.mockRejectedValue(new Error("not found"));

    // Act
    renderPage();

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load this device/i);
  });

  it("redirects to /devices when the route id isn't a valid number", async () => {
    // Act
    renderPage("/devices/not-a-number");

    // Assert
    expect(await screen.findByText("DEVICES_PAGE")).toBeInTheDocument();
    expect(mockedDeviceService.getById).not.toHaveBeenCalled();
  });

  it("shows a not-available message instead of the registration form when the device isn't AVAILABLE", async () => {
    // Arrange
    mockedDeviceService.getById.mockResolvedValue({ ...baseDevice, status: "REMOVED" });

    // Act
    renderPage();

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't available for registration/i);
    expect(screen.queryByRole("button", { name: /register interest/i })).not.toBeInTheDocument();
  });

  it("requires the Terms & Conditions checkbox before submitting", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Dell Latitude 5420" });

    // Act
    await user.click(screen.getByRole("button", { name: /register interest/i }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/must agree to the terms/i);
    expect(mockedRegistrationService.registerInterest).not.toHaveBeenCalled();
  });

  it("registers interest and navigates to /devices on success", async () => {
    // Arrange
    mockedRegistrationService.registerInterest.mockResolvedValue({
      id: 1,
      employeeId: 1,
      deviceId: 1,
      agreed: true,
      submittedAt: "2026-01-01T00:00:00.000Z",
      status: "ELIGIBLE",
      device: { id: 1, assetTag: "AST-001", deviceType: "Laptop", brand: "Dell", model: "Latitude 5420", price: "150.00", status: "AVAILABLE" },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Dell Latitude 5420" });

    // Act
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /register interest/i }));

    // Assert
    expect(await screen.findByText("DEVICES_PAGE")).toBeInTheDocument();
    expect(mockedRegistrationService.registerInterest).toHaveBeenCalledWith(1, true);
  });

  it("shows the backend's ineligibility reason and stays on the page when registration is rejected", async () => {
    // Arrange
    mockedRegistrationService.registerInterest.mockRejectedValue(
      new Error("Laptop holders cannot participate"),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Dell Latitude 5420" });

    // Act
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /register interest/i }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Laptop holders cannot participate");
    await waitFor(() => expect(screen.queryByText("DEVICES_PAGE")).not.toBeInTheDocument());
  });
});
