import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminDevicesPage from "@/pages/AdminDevicesPage";
import { adminDeviceService } from "@/services/adminDeviceService";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { Device } from "@/types/device";
import { setStoredSession } from "@/utils/authStorage";

vi.mock("@/services/adminDeviceService");

const mockedAdminDeviceService = adminDeviceService as unknown as {
  listAll: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const adminSession = {
  token: "tok",
  user: { role: "ADMIN" as const, admin: { id: 1, username: "admin1", lastLogin: null } },
};

const availableDevice: Device = {
  id: 1,
  assetTag: "AST-001",
  deviceType: "Laptop",
  brand: "Dell",
  model: "Latitude 5420",
  cpu: null,
  ram: null,
  storage: null,
  purchaseYear: null,
  yearsUsed: null,
  price: "150.00",
  status: "AVAILABLE",
  quantity: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const removedDevice: Device = { ...availableDevice, id: 2, assetTag: "AST-002", status: "REMOVED" };

describe("AdminDevicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setStoredSession(adminSession);
    mockedAdminDeviceService.listAll.mockResolvedValue([]);
  });

  it("lists devices with their status and price", async () => {
    // Arrange
    mockedAdminDeviceService.listAll.mockResolvedValue([availableDevice]);

    // Act
    renderWithProviders(<AdminDevicesPage />);

    // Assert
    expect(await screen.findByText("AST-001")).toBeInTheDocument();
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("150.00")).toBeInTheDocument();
    expect(within(row).getByText(/available/i)).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no devices", async () => {
    // Act
    renderWithProviders(<AdminDevicesPage />);

    // Assert
    expect(await screen.findByText(/no devices found/i)).toBeInTheDocument();
  });

  it("shows an error message when the list fails to load", async () => {
    // Arrange
    mockedAdminDeviceService.listAll.mockRejectedValue(new Error("network down"));

    // Act
    renderWithProviders(<AdminDevicesPage />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load devices/i);
  });

  it("re-queries with a status filter when one is selected", async () => {
    // Arrange
    mockedAdminDeviceService.listAll.mockResolvedValue([availableDevice]);
    const user = userEvent.setup();
    renderWithProviders(<AdminDevicesPage />);
    await screen.findByText("AST-001");

    // Act
    await user.selectOptions(screen.getByLabelText(/status/i), "REMOVED");

    // Assert
    await waitFor(() => expect(mockedAdminDeviceService.listAll).toHaveBeenCalledWith("REMOVED"));
  });

  it("links to the add-device and edit pages", async () => {
    // Arrange
    mockedAdminDeviceService.listAll.mockResolvedValue([availableDevice]);

    // Act
    renderWithProviders(<AdminDevicesPage />);
    await screen.findByText("AST-001");

    // Assert
    expect(screen.getByRole("link", { name: /add device/i })).toHaveAttribute("href", "/admin/devices/new");
    expect(screen.getByRole("link", { name: /edit/i })).toHaveAttribute("href", "/admin/devices/1/edit");
  });

  it("offers Remove for an AVAILABLE device and Restore for a REMOVED one", async () => {
    // Arrange
    mockedAdminDeviceService.listAll.mockResolvedValue([availableDevice, removedDevice]);

    // Act
    renderWithProviders(<AdminDevicesPage />);
    await screen.findByText("AST-001");
    const rows = screen.getAllByRole("row").slice(1); // skip header row

    // Assert
    expect(within(rows[0]).getByRole("button", { name: /remove/i })).toBeInTheDocument();
    expect(within(rows[1]).getByRole("button", { name: /restore/i })).toBeInTheDocument();
  });

  describe("remove/restore actions", () => {
    const confirmSpy = vi.spyOn(window, "confirm");

    afterEach(() => confirmSpy.mockReset());

    it("removes a device after the confirmation is accepted", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminDeviceService.listAll.mockResolvedValue([availableDevice]);
      mockedAdminDeviceService.update.mockResolvedValue({ ...availableDevice, status: "REMOVED" });
      const user = userEvent.setup();
      renderWithProviders(<AdminDevicesPage />);
      await screen.findByText("AST-001");

      // Act
      await user.click(screen.getByRole("button", { name: /remove/i }));

      // Assert
      expect(mockedAdminDeviceService.update).toHaveBeenCalledWith(1, { status: "REMOVED" });
    });

    it("does nothing when the confirmation is declined", async () => {
      // Arrange
      confirmSpy.mockReturnValue(false);
      mockedAdminDeviceService.listAll.mockResolvedValue([availableDevice]);
      const user = userEvent.setup();
      renderWithProviders(<AdminDevicesPage />);
      await screen.findByText("AST-001");

      // Act
      await user.click(screen.getByRole("button", { name: /remove/i }));

      // Assert
      expect(mockedAdminDeviceService.update).not.toHaveBeenCalled();
    });

    it("disables the action button while the remove/restore mutation is in flight", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminDeviceService.listAll.mockResolvedValue([availableDevice]);
      let resolveUpdate!: (value: Device) => void;
      mockedAdminDeviceService.update.mockReturnValue(
        new Promise<Device>((resolve) => {
          resolveUpdate = resolve;
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdminDevicesPage />);
      await screen.findByText("AST-001");
      const removeButton = screen.getByRole("button", { name: /remove/i });

      // Act
      await user.click(removeButton);

      // Assert — still mid-flight, button must not accept a second click
      expect(removeButton).toBeDisabled();

      // Cleanup — resolve so the mutation doesn't leak into the next test
      resolveUpdate({ ...availableDevice, status: "REMOVED" });
    });

    it("shows an error message when the action fails", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminDeviceService.listAll.mockResolvedValue([availableDevice]);
      mockedAdminDeviceService.update.mockRejectedValue(new Error("Only an available device can be removed"));
      const user = userEvent.setup();
      renderWithProviders(<AdminDevicesPage />);
      await screen.findByText("AST-001");

      // Act
      await user.click(screen.getByRole("button", { name: /remove/i }));

      // Assert
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Only an available device can be removed",
      );
    });
  });
});
