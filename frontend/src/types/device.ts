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
