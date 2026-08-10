import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminDeviceFormPage from "@/pages/AdminDeviceFormPage";
import { adminDeviceService } from "@/services/adminDeviceService";
import { deviceService } from "@/services/deviceService";
import { AuthProvider } from "@/store/AuthContext";
import type { Device } from "@/types/device";
import i18n from "@/utils/i18n";

vi.mock("@/services/adminDeviceService");
vi.mock("@/services/deviceService");

const mockedAdminDeviceService = adminDeviceService as unknown as {
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};
const mockedDeviceService = deviceService as unknown as { getById: ReturnType<typeof vi.fn> };

const existingDevice: Device = {
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

function renderPage(route: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/admin/devices/new" element={<AdminDeviceFormPage />} />
              <Route path="/admin/devices/:id/edit" element={<AdminDeviceFormPage />} />
              <Route path="/admin/devices" element={<div>ADMIN_DEVICES_PAGE</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("AdminDeviceFormPage — create mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders an empty form with an editable asset tag field", () => {
    // Act
    renderPage("/admin/devices/new");

    // Assert
    expect(screen.getByRole("heading", { name: /add device/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/asset tag/i)).not.toBeDisabled();
    expect(mockedDeviceService.getById).not.toHaveBeenCalled();
  });

  it("shows a validation error and does not submit when required fields are empty", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage("/admin/devices/new");

    // Act
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Assert
    expect(await screen.findByText(/asset tag is required/i)).toBeInTheDocument();
    expect(mockedAdminDeviceService.create).not.toHaveBeenCalled();
  });

  it("creates the device and navigates to the device list on success", async () => {
    // Arrange
    mockedAdminDeviceService.create.mockResolvedValue({ ...existingDevice, assetTag: "AST-002" });
    const user = userEvent.setup();
    renderPage("/admin/devices/new");

    // Act
    await user.type(screen.getByLabelText(/asset tag/i), "AST-002");
    await user.type(screen.getByLabelText(/device type/i), "Laptop");
    await user.type(screen.getByLabelText(/^brand/i), "HP");
    await user.type(screen.getByLabelText(/^model/i), "EliteBook 840");
    await user.type(screen.getByLabelText(/^price/i), "200");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Assert
    expect(await screen.findByText("ADMIN_DEVICES_PAGE")).toBeInTheDocument();
    expect(mockedAdminDeviceService.create).toHaveBeenCalledWith(
      expect.objectContaining({ assetTag: "AST-002", deviceType: "Laptop", brand: "HP", price: 200 }),
    );
  });

  it("shows the backend's error (e.g. duplicate asset tag) and stays on the page", async () => {
    // Arrange
    mockedAdminDeviceService.create.mockRejectedValue(
      new Error("A device with this assetTag already exists"),
    );
    const user = userEvent.setup();
    renderPage("/admin/devices/new");

    // Act
    await user.type(screen.getByLabelText(/asset tag/i), "AST-002");
    await user.type(screen.getByLabelText(/device type/i), "Laptop");
    await user.type(screen.getByLabelText(/^brand/i), "HP");
    await user.type(screen.getByLabelText(/^model/i), "EliteBook 840");
    await user.type(screen.getByLabelText(/^price/i), "200");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
    expect(screen.queryByText("ADMIN_DEVICES_PAGE")).not.toBeInTheDocument();
  });

  it("shows a validation error and does not submit when quantity is not a positive integer", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage("/admin/devices/new");

    // Act
    await user.type(screen.getByLabelText(/asset tag/i), "AST-002");
    await user.type(screen.getByLabelText(/device type/i), "Laptop");
    await user.type(screen.getByLabelText(/^brand/i), "HP");
    await user.type(screen.getByLabelText(/^model/i), "EliteBook 840");
    await user.type(screen.getByLabelText(/^price/i), "200");
    await user.type(screen.getByLabelText(/quantity/i), "0");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Assert — the field must surface the error, not just block submission silently
    expect(await screen.findByLabelText(/quantity/i)).toHaveAccessibleDescription(/./);
    expect(mockedAdminDeviceService.create).not.toHaveBeenCalled();
  });
});

describe("AdminDeviceFormPage — edit mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDeviceService.getById.mockResolvedValue(existingDevice);
  });

  it("pre-fills the form from the existing device and disables the asset tag field", async () => {
    // Act
    renderPage("/admin/devices/1/edit");

    // Assert
    expect(await screen.findByDisplayValue("Latitude 5420")).toBeInTheDocument();
    expect(screen.getByLabelText(/asset tag/i)).toHaveValue("AST-001");
    expect(screen.getByLabelText(/asset tag/i)).toBeDisabled();
    expect(mockedDeviceService.getById).toHaveBeenCalledWith(1);
  });

  it("shows an error message when the device fails to load", async () => {
    // Arrange
    mockedDeviceService.getById.mockRejectedValue(new Error("not found"));

    // Act
    renderPage("/admin/devices/1/edit");

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load this device/i);
  });

  it("shows an error message instead of a blank form for a non-numeric :id in the URL", () => {
    // Act
    renderPage("/admin/devices/not-a-number/edit");

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load this device/i);
    expect(mockedDeviceService.getById).not.toHaveBeenCalled();
  });

  it("updates the device (without assetTag) and navigates to the device list on success", async () => {
    // Arrange
    mockedAdminDeviceService.update.mockResolvedValue({ ...existingDevice, price: "175.00" });
    const user = userEvent.setup();
    renderPage("/admin/devices/1/edit");
    await screen.findByDisplayValue("Latitude 5420");

    // Act
    const priceField = screen.getByLabelText(/^price/i);
    await user.clear(priceField);
    await user.type(priceField, "175");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Assert
    expect(await screen.findByText("ADMIN_DEVICES_PAGE")).toBeInTheDocument();
    expect(mockedAdminDeviceService.update).toHaveBeenCalledWith(
      1,
      expect.not.objectContaining({ assetTag: expect.anything() }),
    );
    expect(mockedAdminDeviceService.update).toHaveBeenCalledWith(1, expect.objectContaining({ price: 175 }));
  });
});
