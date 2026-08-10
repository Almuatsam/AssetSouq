export type DeviceStatus = "AVAILABLE" | "REMOVED" | "DRAWN" | "SOLD";

export interface Device {
  id: number;
  assetTag: string;
  deviceType: string;
  brand: string;
  model: string;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
  purchaseYear: number | null;
  yearsUsed: number | null;
  // Prisma Decimal fields serialize to string over JSON — never treat as
  // a number without an explicit, deliberate parse (money precision).
  price: string;
  status: DeviceStatus;
  quantity: number;
  createdAt: string;
}

// Mirrors backend/src/validators/adminDeviceValidators.ts's createDeviceSchema.
export interface CreateDeviceInput {
  assetTag: string;
  deviceType: string;
  brand: string;
  model: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  purchaseYear?: number;
  yearsUsed?: number;
  price: number;
  quantity?: number;
}

// assetTag is intentionally excluded — it's a fixed physical-asset
// identifier (see backend/src/validators/adminDeviceValidators.ts).
// `status` IS included (unlike CreateDeviceInput, which never has one on
// creation) — the backend's updateDeviceSchema accepts it, and it's how
// the remove/restore actions on AdminDevicesPage work under the hood,
// even though the create/edit form itself never sets it directly.
export type UpdateDeviceInput = Partial<Omit<CreateDeviceInput, "assetTag">> & {
  status?: DeviceStatus;
};

export type RegistrationStatus = "PENDING" | "ELIGIBLE" | "INELIGIBLE" | "WITHDRAWN";

export interface RegistrationDeviceSummary {
  id: number;
  assetTag: string;
  deviceType: string;
  brand: string;
  model: string;
  price: string;
  status: DeviceStatus;
}

export interface Registration {
  id: number;
  employeeId: number;
  deviceId: number;
  agreed: boolean;
  submittedAt: string;
  status: RegistrationStatus;
  device: RegistrationDeviceSummary;
}
