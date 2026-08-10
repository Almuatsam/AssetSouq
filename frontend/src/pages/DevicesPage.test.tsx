import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DevicesPage from "@/pages/DevicesPage";
import { deviceService } from "@/services/deviceService";
import { registrationService } from "@/services/registrationService";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { Device, Registration } from "@/types/device";
import { getStoredSession, setStoredSession } from "@/utils/authStorage";

vi.mock("@/services/deviceService");
vi.mock("@/services/registrationService");

const mockedDeviceService = deviceService as unknown as { listAvailable: ReturnType<typeof vi.fn> };
const mockedRegistrationService = registrationService as unknown as { getMine: ReturnType<typeof vi.fn> };

const employeeSession = {
  token: "tok",
  user: {
    role: "EMPLOYEE" as const,
    employee: { id: 1, staffNumber: "S1", name: "Jane", department: "IT", email: "j@x.com", active: true },
  },
};

const baseDevice: Device = {
  id: 1,
  assetTag: "AST-001",
  deviceType: "Laptop",
  brand: "Dell",
  model: "Latitude 5420",
  cpu: "i5",
  ram: "16GB",
  storage: "256GB SSD",
  purchaseYear: 2021,
  yearsUsed: 4,
  price: "150.00",
  status: "AVAILABLE",
  quantity: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("DevicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setStoredSession(employeeSession);
    mockedRegistrationService.getMine.mockResolvedValue(null);
    mockedDeviceService.listAvailable.mockResolvedValue([]);
  });

  it("greets the logged-in employee by name", async () => {
    // Act
    renderWithProviders(<DevicesPage />);

    // Assert
    expect(await screen.findByRole("heading", { name: /jane/i })).toBeInTheDocument();
  });

  it("logs out and clears the stored session when the logout button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithProviders(<DevicesPage />);

    // Act
    await user.click(screen.getByRole("button", { name: /log out/i }));

    // Assert
    expect(getStoredSession()).toBeNull();
  });

  it("lists available devices when the employee has no active registration", async () => {
    // Arrange
    mockedDeviceService.listAvailable.mockResolvedValue([baseDevice]);

    // Act
    renderWithProviders(<DevicesPage />);

    // Assert
    expect(await screen.findByText("Dell Latitude 5420")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view details/i })).toHaveAttribute("href", "/devices/1");
  });

  it("shows an empty-state message when no devices are available", async () => {
    // Act
    renderWithProviders(<DevicesPage />);

    // Assert
    expect(await screen.findByText(/no devices are available/i)).toBeInTheDocument();
  });

  it("shows an error message when the device list fails to load", async () => {
    // Arrange
    mockedDeviceService.listAvailable.mockRejectedValue(new Error("network down"));

    // Act
    renderWithProviders(<DevicesPage />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load the device list/i);
  });

  it("shows the registration status card instead of the device list when already registered", async () => {
    // Arrange
    const registration: Registration = {
      id: 1,
      employeeId: 1,
      deviceId: 1,
      agreed: true,
      submittedAt: "2026-01-01T00:00:00.000Z",
      status: "ELIGIBLE",
      device: {
        id: 1,
        assetTag: "AST-001",
        deviceType: "Laptop",
        brand: "Dell",
        model: "Latitude 5420",
        price: "150.00",
        status: "AVAILABLE",
      },
    };
    mockedRegistrationService.getMine.mockResolvedValue(registration);
    mockedDeviceService.listAvailable.mockResolvedValue([baseDevice]);

    // Act
    renderWithProviders(<DevicesPage />);

    // Assert
    expect(await screen.findByRole("heading", { name: /your registration/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view details/i })).not.toBeInTheDocument();
  });
});
